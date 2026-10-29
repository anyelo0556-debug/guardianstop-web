/**
 * IG BROKER SERVICE — Conexión real a IG Group API
 * Maneja autenticación, polling de datos, y cierre de posiciones.
 */

import { getDb } from "../queries/connection";
import { accounts } from "@db/schema";
import { eq } from "drizzle-orm";

// ============================================================
// CONFIGURACIÓN IG
// ============================================================

const IG_DEMO_BASE = "https://demo-api.ig.com/gateway/deal";
const IG_LIVE_BASE = "https://api.ig.com/gateway/deal";

export interface IGSession {
  cst: string;
  xSecurityToken: string;
  accountId: string;
  clientId: string;
  apiKey: string;
  isDemo: boolean;
}

export interface IGPosition {
  dealId: string;
  symbol: string;
  direction: "BUY" | "SELL";
  size: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  profitPct: number;
}

// ============================================================
// 1. AUTENTICACIÓN
// ============================================================

export async function igAuthenticate(
  apiKey: string,
  username: string,
  password: string,
  isDemo: boolean = true
): Promise<IGSession | null> {
  const baseUrl = isDemo ? IG_DEMO_BASE : IG_LIVE_BASE;

  try {
    const res = await fetch(`${baseUrl}/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-IG-API-KEY": apiKey,
        "Version": "2",
      },
      body: JSON.stringify({
        identifier: username,
        password: password,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[IG AUTH] Error ${res.status}: ${errorText}`);
      return null;
    }

    const cst = res.headers.get("CST") || res.headers.get("cst") || "";
    const xst = res.headers.get("X-SECURITY-TOKEN") || res.headers.get("x-security-token") || "";
    const data = await res.json() as any;

    if (!cst || !xst) {
      console.error("[IG AUTH] Missing CST or X-SECURITY-TOKEN headers");
      return null;
    }

    return {
      cst,
      xSecurityToken: xst,
      accountId: data.accountId || "",
      clientId: String(data.clientId || ""),
      apiKey,
      isDemo,
    };
  } catch (error) {
    console.error("[IG AUTH] Exception:", error);
    return null;
  }
}

// ============================================================
// 2. REQUESTS AUTENTICADOS
// ============================================================

export async function igRequest(
  session: IGSession,
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: any
): Promise<any> {
  const baseUrl = session.isDemo ? IG_DEMO_BASE : IG_LIVE_BASE;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-IG-API-KEY": session.apiKey,
    "CST": session.cst,
    "X-SECURITY-TOKEN": session.xSecurityToken,
    "Version": "1",
  };

  const options: RequestInit = { method, headers };
  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${baseUrl}${endpoint}`, options);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`IG API ${res.status}: ${errorText}`);
  }

  // DELETE may return empty body
  if (res.status === 204) return {};

  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// ============================================================
// 3. OBTENER BALANCE
// ============================================================

export async function igGetBalance(session: IGSession): Promise<{
  balance: number;
  available: number;
  profitLoss: number;
  currency: string;
}> {
  const data = await igRequest(session, "/accounts");
  const activeAccount = data.accounts?.find((a: any) => a.preferred) || data.accounts?.[0];

  if (!activeAccount) {
    throw new Error("No active account found");
  }

  const bal = activeAccount.balance?.balance ?? activeAccount.balance?.available ?? 0;
  const available = activeAccount.balance?.available ?? 0;
  const pnl = activeAccount.balance?.profitLoss ?? 0;

  return {
    balance: Number(bal),
    available: Number(available),
    profitLoss: Number(pnl),
    currency: activeAccount.currency || "USD",
  };
}

// ============================================================
// 4. OBTENER POSICIONES
// ============================================================

export async function igGetPositions(session: IGSession): Promise<IGPosition[]> {
  const data = await igRequest(session, "/positions");
  const posList = data.positions || [];

  return posList.map((p: any) => {
    const market = p.market || {};
    const pos = p.position || {};
    const direction = (pos.direction || "BUY").toUpperCase();
    const size = Number(pos.dealSize || pos.size || pos.contractSize || 1);
    const openPrice = Number(pos.level ?? pos.openLevel ?? pos.openPrice ?? 0);
    const bid = Number(market.bid ?? 0);
    const offer = Number(market.offer ?? 0);
    const currentPrice = direction === "BUY" ? (bid || offer) : (offer || bid);
    const priceDiff = direction === "BUY" ? (currentPrice - openPrice) : (openPrice - currentPrice);
    const profit = priceDiff * size;

    return {
      dealId: pos.dealId || String(Math.random()),
      symbol: market.instrumentName || market.epic || "UNKNOWN",
      direction: direction as "BUY" | "SELL",
      size,
      openPrice,
      currentPrice,
      profit,
      profitPct: openPrice > 0 ? (priceDiff / openPrice) * 100 : 0,
    };
  });
}

// ============================================================
// 5. CERRAR POSICIÓN
// ============================================================

export async function igClosePosition(
  session: IGSession,
  position: IGPosition
): Promise<{ success: boolean; dealReference?: string; error?: string }> {
  try {
    const closeDirection = position.direction === "BUY" ? "SELL" : "BUY";
    const closeBody: any = {
      dealId: position.dealId,
      direction: closeDirection,
      size: position.size,
      orderType: "MARKET",
      timeInForce: "EXECUTE_AND_ELIMINATE",
    };

    // Add epic if available (some endpoints require it)
    if (position.symbol && !position.symbol.includes("UNKNOWN")) {
      closeBody.epic = position.symbol;
      closeBody.expiry = "-";
    }

    console.log(`[IG CLOSE] ${position.symbol} | ${closeDirection} ${position.size} | dealId: ${position.dealId}`);

    const result = await igRequest(session, "/positions/otc", "DELETE", closeBody);

    console.log(`[IG CLOSE OK] dealReference: ${result.dealReference || "N/A"}`);

    return {
      success: true,
      dealReference: result.dealReference,
    };
  } catch (error: any) {
    console.error(`[IG CLOSE ERROR] ${position.dealId}: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================
// 6. CERRAR TODAS LAS POSICIONES
// ============================================================

export async function igCloseAllPositions(
  session: IGSession,
  positions: IGPosition[]
): Promise<{ closed: number; failed: number; errors: string[] }> {
  let closed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const pos of positions) {
    let attempt = 0;
    let success = false;

    while (attempt < 3 && !success) {
      attempt++;
      const result = await igClosePosition(session, pos);

      if (result.success) {
        closed++;
        success = true;
      } else {
        if (attempt >= 3) {
          failed++;
          errors.push(`${pos.symbol}: ${result.error}`);
        } else {
          // Wait before retry
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  }

  return { closed, failed, errors };
}

// ============================================================
// 7. OBTENER DATOS COMPLETOS PARA RISK ENGINE
// ============================================================

export async function igGetFullData(session: IGSession): Promise<{
  balance: number;
  equity: number;
  profitDiario: number;
  profitSemanal: number;
  profitMensual: number;
  posicionesAbiertas: number;
  trades: any[];
  timestamp: Date;
}> {
  const [balanceData, positions] = await Promise.all([
    igGetBalance(session),
    igGetPositions(session),
  ]);

  const totalPnL = positions.reduce((sum, p) => sum + p.profit, 0);

  // Map IG positions to broker trades format
  const brokerTrades = positions.map(p => ({
    brokerTradeId: p.dealId,
    symbol: p.symbol,
    direction: p.direction.toLowerCase() as "buy" | "sell",
    leverage: 1,
    lotSize: p.size,
    entryPrice: p.openPrice,
    exitPrice: undefined,
    profitLoss: p.profit,
    status: "open" as const,
    openedAt: new Date(),
    closedAt: undefined,
  }));

  return {
    balance: balanceData.balance,
    equity: balanceData.balance + totalPnL,
    profitDiario: totalPnL, // Approximation - IG doesn't provide daily breakdown
    profitSemanal: totalPnL,
    profitMensual: totalPnL,
    posicionesAbiertas: positions.length,
    trades: brokerTrades,
    timestamp: new Date(),
  };
}

// ============================================================
// 8. GUARDAR SNAPSHOT EN DB
// ============================================================

export async function guardarSnapshot(
  accountId: number,
  _userId: number,
  balance: number,
  _equity: number,
  pnl: number,
  positionsCount: number
): Promise<void> {
  const db = getDb();

  // Update account balance
  await db
    .update(accounts)
    .set({
      currentBalance: String(balance),
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, accountId));

  console.log(`[SNAPSHOT] Account ${accountId} | Balance: ${balance} | P&L: ${pnl} | Positions: ${positionsCount}`);
}
