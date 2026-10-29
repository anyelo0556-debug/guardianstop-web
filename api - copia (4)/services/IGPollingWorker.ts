/**
 * IG POLLING WORKER — Monitoreo 24/7 de cuentas IG
 * Corre en segundo plano, hace polling cada 3 segundos,
 * ejecuta protección, y guarda snapshots.
 */

import { getDb } from "../queries/connection";
import { accounts, protectionLogs, notifications } from "@db/schema";
import { eq, and } from "drizzle-orm";
import {
  igAuthenticate,
  igGetFullData,
  igCloseAllPositions,
  guardarSnapshot,
} from "./IGBrokerService";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const POLL_INTERVAL_MS = 3000; // 3 segundos
const SESSION_TTL_MS = 1000 * 60 * 10; // 10 minutos (re-auth cada 10 min)

interface WorkerAccount {
  accountId: number;
  userId: number;
  apiKey: string;
  username: string;
  password: string;
  accountNumber: string;
  isDemo: boolean;
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  trailingEnabled: boolean;
  trailingProtectPct: number;
}

interface IGSessionData {
  cst: string;
  xSecurityToken: string;
  accountId: string;
  expiresAt: number;
}

// ============================================================
// ESTADO DEL WORKER
// ============================================================

const activeSessions = new Map<number, IGSessionData>();
const isRunning = new Map<number, boolean>(); // Evita ejecuciones paralelas
const peakPnL = new Map<number, number>(); // Pico de P&L por cuenta
const initialBalance = new Map<number, number>(); // Balance inicial por sesión

// ============================================================
// 1. OBTENER CUENTAS ACTIVAS
// ============================================================

async function obtenerCuentasActivas(): Promise<WorkerAccount[]> {
  const db = getDb();

  const results = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.isActive, true),
        eq(accounts.brokerName, "ig")
      )
    );

  return results.map(a => ({
    accountId: a.id,
    userId: a.userId,
    apiKey: process.env.IG_API_KEY || "",
    username: a.accountNumber || "", // Store IG username here or add a field
    password: "", // You'll need to store this securely or prompt user
    accountNumber: a.accountNumber || "",
    isDemo: a.accountType === "demo",
    dailyLimit: Number(a.dailyLimitPct || 1),
    weeklyLimit: Number(a.weeklyLimitPct || 10),
    monthlyLimit: Number(a.monthlyLimitPct || 30),
    trailingEnabled: a.trailingEnabled ?? true,
    trailingProtectPct: Number(a.trailingProtectionPct || 30),
  }));
}

// ============================================================
// 2. AUTENTICAR O REFRESCAR SESIÓN
// ============================================================

async function asegurarSesion(account: WorkerAccount): Promise<IGSessionData | null> {
  const existing = activeSessions.get(account.accountId);

  // Si la sesión existe y no expiró, reutilizar
  if (existing && existing.expiresAt > Date.now()) {
    return existing;
  }

  // Si no tenemos password, no podemos autenticar
  // En producción, esto vendría de la DB o de un token OAuth
  if (!account.username || !account.password) {
    console.log(`[WORKER] Account ${account.accountId}: No credentials stored. Skipping.`);
    return null;
  }

  // Autenticar
  const session = await igAuthenticate(
    account.apiKey,
    account.username,
    account.password,
    account.isDemo
  );

  if (!session) {
    console.error(`[WORKER] Account ${account.accountId}: Auth failed`);
    return null;
  }

  const sessionData: IGSessionData = {
    cst: session.cst,
    xSecurityToken: session.xSecurityToken,
    accountId: session.accountId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };

  activeSessions.set(account.accountId, sessionData);
  console.log(`[WORKER] Account ${account.accountId}: Session created/renewed`);

  return sessionData;
}

// ============================================================
// 3. POLLING DE UNA CUENTA
// ============================================================

async function pollCuenta(account: WorkerAccount): Promise<void> {
  if (isRunning.get(account.accountId)) {
    console.log(`[WORKER] Account ${account.accountId}: Already running, skipping`);
    return;
  }

  isRunning.set(account.accountId, true);

  try {
    // 1. Asegurar sesión
    const sessionData = await asegurarSesion(account);
    if (!sessionData) {
      isRunning.set(account.accountId, false);
      return;
    }

    // 2. Crear sesión IG completa
    const igSession = {
      cst: sessionData.cst,
      xSecurityToken: sessionData.xSecurityToken,
      accountId: sessionData.accountId,
      clientId: "",
      apiKey: account.apiKey,
      isDemo: account.isDemo,
    };

    // 3. Obtener datos de IG
    const data = await igGetFullData(igSession);

    // 4. Guardar snapshot en DB
    await guardarSnapshot(
      account.accountId,
      account.userId,
      data.balance,
      data.equity,
      data.trades.reduce((s, t) => s + (t.profitLoss || 0), 0),
      data.posicionesAbiertas
    );

    // 5. Trackear balance inicial si no existe
    if (!initialBalance.has(account.accountId)) {
      initialBalance.set(account.accountId, data.balance);
      console.log(`[WORKER] Account ${account.accountId}: Initial balance set to ${data.balance}`);
    }

    // 6. Trackear pico de P&L
    const currentPnL = data.trades.reduce((s, t) => s + (t.profitLoss || 0), 0);
    const prevPeak = peakPnL.get(account.accountId) || 0;
    if (currentPnL > prevPeak) {
      peakPnL.set(account.accountId, currentPnL);
    }

    // 7. Ejecutar Risk Engine
    await ejecutarProteccion(account, data, igSession);

  } catch (error) {
    console.error(`[WORKER] Account ${account.accountId}: Error polling`, error);
  } finally {
    isRunning.set(account.accountId, false);
  }
}

// ============================================================
// 4. EJECUTAR PROTECCIÓN (drawdown + trailing)
// ============================================================

async function ejecutarProteccion(
  account: WorkerAccount,
  data: any,
  igSession: any
): Promise<void> {
  const db = getDb();
  const currentPnL = data.trades.reduce((s: number, t: any) => s + (t.profitLoss || 0), 0);
  const balanceInicial = initialBalance.get(account.accountId) || data.balance;
  const effectiveBalance = data.balance + currentPnL;
  const sessionLoss = balanceInicial - effectiveBalance;
  const sessionLossPct = (sessionLoss / balanceInicial) * 100;

  console.log(`[PROTECTION] Account ${account.accountId} | ` +
    `Balance: ${data.balance} | P&L: ${currentPnL} | ` +
    `Loss: ${sessionLoss.toFixed(2)} (${sessionLossPct.toFixed(2)}%) | ` +
    `Positions: ${data.posicionesAbiertas}`
  );

  // --- 4.1 DAILY DRAWDOWN LIMIT ---
  const dailyLimitAmount = balanceInicial * (account.dailyLimit / 100);

  if (sessionLoss >= dailyLimitAmount && data.posicionesAbiertas > 0) {
    console.log(`[PROTECTION] DAILY LIMIT TRIGGERED! Loss: ${sessionLoss.toFixed(2)} >= Limit: ${dailyLimitAmount.toFixed(2)}`);

    // Log
    await db.insert(protectionLogs).values({
      userId: account.userId,
      accountId: account.accountId,
      triggerType: "daily_limit",
      profitLossAtTrigger: String(sessionLoss),
      profitLossPctAtTrigger: String(sessionLossPct.toFixed(2)),
      protectedAmount: String(effectiveBalance),
      notes: `Límite diario alcanzado: -${sessionLoss.toFixed(2)} USD (${sessionLossPct.toFixed(2)}%)`,
    });

    // Notify
    await db.insert(notifications).values({
      userId: account.userId,
      type: "limit_breach",
      title: "🚨 Límite Diario Alcanzado",
      message: `Tu cuenta ha perdido ${sessionLossPct.toFixed(1)}% del balance inicial. Cerrando todas las posiciones.`,
    });

    // Close positions
    const positions = data.trades.map((t: any) => ({
      dealId: t.brokerTradeId,
      symbol: t.symbol,
      direction: t.direction.toUpperCase(),
      size: t.lotSize,
      openPrice: t.entryPrice,
      currentPrice: t.exitPrice || t.entryPrice,
      profit: t.profitLoss,
      profitPct: 0,
    }));

    const result = await igCloseAllPositions(igSession, positions);
    console.log(`[PROTECTION] Closed ${result.closed} positions, ${result.failed} failed`);

    return;
  }

  // --- 4.2 TRAILING STOP ---
  if (account.trailingEnabled && data.posicionesAbiertas > 0) {
    const threshold = balanceInicial * 0.01; // 1% to activate
    const peak = peakPnL.get(account.accountId) || 0;

    if (currentPnL >= threshold && peak > 0) {
      const stopLevel = peak * (account.trailingProtectPct / 100);
      const retreatFromPeak = ((peak - currentPnL) / peak) * 100;
      const maxRetreat = 100 - account.trailingProtectPct;

      console.log(`[TRAILING] Peak: ${peak.toFixed(2)} | Current: ${currentPnL.toFixed(2)} | ` +
        `Stop: ${stopLevel.toFixed(2)} | Retreat: ${retreatFromPeak.toFixed(1)}% | Max: ${maxRetreat}%`
      );

      if (currentPnL <= stopLevel) {
        console.log(`[PROTECTION] TRAILING STOP TRIGGERED! Retreat: ${retreatFromPeak.toFixed(1)}% >= Max: ${maxRetreat}%`);

        // Log
        await db.insert(protectionLogs).values({
          userId: account.userId,
          accountId: account.accountId,
          triggerType: "trailing_profit",
          profitLossAtTrigger: String(currentPnL),
          profitLossPctAtTrigger: String(retreatFromPeak.toFixed(2)),
          protectedAmount: String(peak * (account.trailingProtectPct / 100)),
          notes: `Trailing Stop: ganancias cayeron de +${peak.toFixed(2)} a +${currentPnL.toFixed(2)} (retroceso ${retreatFromPeak.toFixed(1)}%)`,
        });

        // Notify
        await db.insert(notifications).values({
          userId: account.userId,
          type: "trailing_executed",
          title: "🛡️ Trailing Stop Activado",
          message: `Ganancias retrocedieron ${retreatFromPeak.toFixed(1)}% desde el pico. Cerrando posiciones.`,
        });

        // Close positions
        const positions = data.trades.map((t: any) => ({
          dealId: t.brokerTradeId,
          symbol: t.symbol,
          direction: t.direction.toUpperCase(),
          size: t.lotSize,
          openPrice: t.entryPrice,
          currentPrice: t.exitPrice || t.entryPrice,
          profit: t.profitLoss,
          profitPct: 0,
        }));

        const result = await igCloseAllPositions(igSession, positions);
        console.log(`[PROTECTION] Trailing closed ${result.closed} positions`);

        // Reset peak after close
        peakPnL.set(account.accountId, 0);
      }
    }
  }
}

// ============================================================
// 5. INICIAR WORKER GLOBAL
// ============================================================

let globalInterval: NodeJS.Timeout | null = null;

export async function iniciarWorkerGlobal(): Promise<void> {
  if (globalInterval) {
    console.log("[WORKER] Already running");
    return;
  }

  console.log("[WORKER] Starting IG Polling Worker...");

  // Poll immediately, then every 3 seconds
  async function tick() {
    const cuentas = await obtenerCuentasActivas();

    if (cuentas.length === 0) {
      console.log("[WORKER] No active IG accounts found");
      return;
    }

    // Poll all accounts in parallel
    await Promise.allSettled(cuentas.map(pollCuenta));
  }

  // First tick
  await tick();

  // Schedule ticks
  globalInterval = setInterval(tick, POLL_INTERVAL_MS);
  console.log(`[WORKER] Running every ${POLL_INTERVAL_MS}ms`);
}

export function detenerWorkerGlobal(): void {
  if (globalInterval) {
    clearInterval(globalInterval);
    globalInterval = null;
    console.log("[WORKER] Stopped");
  }
}

// ============================================================
// 6. ESTADO DEL WORKER (para API)
// ============================================================

export function getWorkerStatus(): {
  running: boolean;
  activeAccounts: number;
  pollInterval: number;
} {
  return {
    running: globalInterval !== null,
    activeAccounts: activeSessions.size,
    pollInterval: POLL_INTERVAL_MS,
  };
}
