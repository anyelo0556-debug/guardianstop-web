/**
 * IG POLLING WORKER — Monitoreo 24/7 de cuentas IG
 * Corre en segundo plano, hace polling cada 3 segundos,
 * ejecuta protección, y guarda snapshots.
 */

import { getDb } from "../queries/connection";
import { accounts, accountCredentials, protectionLogs, notifications } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { decryptSecret } from "../lib/credential-vault";
import { isIGAccountPollingAllowed } from "./ig-worker-safety";
import {
  igAuthenticate,
  igGetFullData,
  igCloseAllPositions,
  igGetPositions,
  guardarSnapshot,
  type IGPosition,
  type IGSession,
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
const pendingCloseReason = new Map<number, string>(); // Reintento mientras el worker siga activo
const liveAccountBlockedNotice = new Set<number>();

// ============================================================
// 1. OBTENER CUENTAS ACTIVAS
// ============================================================

async function obtenerCuentasActivas(): Promise<WorkerAccount[]> {
  const db = getDb();

  const results = await db
    .select({
      accountId: accounts.id,
      userId: accounts.userId,
      accountNumber: accounts.accountNumber,
      accountType: accounts.accountType,
      dailyLimitPct: accounts.dailyLimitPct,
      weeklyLimitPct: accounts.weeklyLimitPct,
      monthlyLimitPct: accounts.monthlyLimitPct,
      trailingEnabled: accounts.trailingEnabled,
      trailingProtectionPct: accounts.trailingProtectionPct,
      igApiKey: accountCredentials.igApiKey,
      igIdentifier: accountCredentials.igIdentifier,
      igPassword: accountCredentials.igPassword,
    })
    .from(accounts)
    .leftJoin(accountCredentials, eq(accountCredentials.accountId, accounts.id))
    .where(
      and(
        eq(accounts.isActive, true),
        eq(accounts.brokerName, "ig")
      )
    );

  const pollableResults = results.filter((account) => {
    const isDemo = account.accountType === "demo";
    if (isIGAccountPollingAllowed(isDemo, process.env)) {
      liveAccountBlockedNotice.delete(account.accountId);
      return true;
    }

    if (!liveAccountBlockedNotice.has(account.accountId)) {
      console.error(
        `[WORKER] Account ${account.accountId}: live polling blocked. The IG adapter currently exposes open-position P&L only; enablement requires the normalized risk evaluator and persistent governance to be integrated and validated first.`,
      );
      liveAccountBlockedNotice.add(account.accountId);
    }
    return false;
  });

  const decryptForWorker = (
    value: string | null,
    accountId: number,
    field: string,
  ): string => {
    if (!value) return "";
    try {
      return decryptSecret(value);
    } catch {
      // Never log credential material. The account is skipped until the key or
      // stored ciphertext is corrected.
      console.error(`[WORKER] Account ${accountId}: unable to decrypt ${field}; skipping authentication.`);
      return "";
    }
  };

  return pollableResults.map(a => ({
    accountId: a.accountId,
    userId: a.userId,
    apiKey: decryptForWorker(a.igApiKey, a.accountId, "IG API key"),
    username: a.igIdentifier || "",
    password: decryptForWorker(a.igPassword, a.accountId, "IG password"),
    accountNumber: a.accountNumber || "",
    isDemo: a.accountType === "demo",
    dailyLimit: Number(a.dailyLimitPct || 1),
    weeklyLimit: Number(a.weeklyLimitPct || 10),
    monthlyLimit: Number(a.monthlyLimitPct || 20),
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
  if (!account.apiKey || !account.username || !account.password) {
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

// A close request is not a close confirmation. Re-read the broker's
// authoritative position list before telling the trader the account is flat.
const closeUnconfirmedAlertAt = new Map<number, number>();

async function cerrarYVerificar(
  account: WorkerAccount,
  igSession: IGSession,
  positions: IGPosition[],
  reason: string,
): Promise<boolean> {
  const commandResult = await igCloseAllPositions(igSession, positions);
  let remainingPositions: IGPosition[] | null = null;

  try {
    remainingPositions = await igGetPositions(igSession);
  } catch {
    // An unavailable verification endpoint is an unconfirmed close, never success.
    console.error(`[PROTECTION] Account ${account.accountId}: unable to verify IG close after ${reason}`);
  }

  const confirmed = remainingPositions !== null && remainingPositions.length === 0;
  const db = getDb();

  if (confirmed) {
    pendingCloseReason.delete(account.accountId);
    closeUnconfirmedAlertAt.delete(account.accountId);
    await db.insert(notifications).values({
      userId: account.userId,
      type: "limit_breach",
      title: "Cierre confirmado por IG",
      message: `IG ya no reporta posiciones abiertas después de la protección ${reason}. La confirmación se obtuvo consultando nuevamente la cuenta.`,
    });
    console.log(`[PROTECTION] Account ${account.accountId}: CLOSE_CONFIRMED after ${reason}`);
    return true;
  }

  pendingCloseReason.set(account.accountId, reason);
  const now = Date.now();
  const lastAlertAt = closeUnconfirmedAlertAt.get(account.accountId) ?? 0;
  if (now - lastAlertAt >= 60_000) {
    const remainingCount = remainingPositions?.length;
    const verification = remainingCount === undefined
      ? "No fue posible consultar nuevamente las posiciones."
      : `IG todavía reporta ${remainingCount} posiciones abiertas.`;
    await db.insert(notifications).values({
      userId: account.userId,
      type: "limit_breach",
      title: "Cierre no confirmado",
      message: `Guardian Stop solicitó el cierre por ${reason}, pero no puede confirmar que la cuenta esté plana. ${verification} Solicitudes aceptadas por IG: ${commandResult.closed}; solicitudes fallidas: ${commandResult.failed}. No abras nuevas operaciones. El worker continuará verificando mientras permanezca conectado.`,
    });
    closeUnconfirmedAlertAt.set(account.accountId, now);
  }

  console.error(
    `[PROTECTION] Account ${account.accountId}: CLOSE_UNCONFIRMED after ${reason}; accepted=${commandResult.closed}; failed=${commandResult.failed}; remaining=${remainingPositions?.length ?? "unknown"}`,
  );
  return false;
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

  // Keep retrying an unconfirmed close before evaluating any new risk condition.
  // This is an in-process safeguard; durable recovery after a worker restart still
  // requires the persistent governance/outbox integration.
  const pendingReason = pendingCloseReason.get(account.accountId);
  if (pendingReason) {
    if (data.posicionesAbiertas > 0) {
      const pendingPositions: IGPosition[] = data.trades.map((trade: any) => ({
        dealId: trade.brokerTradeId,
        symbol: trade.symbol,
        direction: trade.direction.toUpperCase() as "BUY" | "SELL",
        size: trade.lotSize,
        openPrice: trade.entryPrice,
        currentPrice: trade.exitPrice || trade.entryPrice,
        profit: trade.profitLoss,
        profitPct: 0,
      }));
      await cerrarYVerificar(account, igSession, pendingPositions, pendingReason);
      return;
    }

    pendingCloseReason.delete(account.accountId);
    closeUnconfirmedAlertAt.delete(account.accountId);
    await db.insert(notifications).values({
      userId: account.userId,
      type: "limit_breach",
      title: "Cierre confirmado por IG",
      message: `La consulta de posiciones de IG confirmó que no quedan operaciones abiertas después de ${pendingReason}.`,
    });
    console.log(`[PROTECTION] Account ${account.accountId}: pending close confirmed by fresh polling snapshot`);
    return;
  }

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

    await cerrarYVerificar(account, igSession, positions, "límite diario");

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

        const closeConfirmed = await cerrarYVerificar(account, igSession, positions, "trailing stop");

        // Reset the peak only after the broker confirms there are no open positions.
        if (closeConfirmed) peakPnL.set(account.accountId, 0);
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
