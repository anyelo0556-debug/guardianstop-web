import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import DerivAPI, { type ProtectionState, type ProtectionLog } from "./services/DerivAPI";
import { getDb } from "./queries/connection";
import { accounts } from "@db/schema";

// Existing demo connection is intentionally preserved for the current pilot.
const DEMO_CONFIG = {
  appId: "019e0769-496a-7c63-9b8d-cbe709b744e4",
  apiToken: "pat_85e81e5b3e0efc239ef10b2df8b1db9b4d31ab4d86a28ba682e22abd2c733845",
  accountId: "VRTC41298507",
};

const activeConnections: Map<number, DerivAPI> = new Map();

function getOrCreateConnection(userId: number): DerivAPI {
  if (!activeConnections.has(userId)) {
    activeConnections.set(userId, new DerivAPI(DEMO_CONFIG));
  }
  return activeConnections.get(userId)!;
}

async function findUserDerivDemoAccount(userId: number) {
  const db = getDb();
  const rows = await db.select().from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.brokerName, "deriv"), eq(accounts.accountType, "demo")))
    .orderBy(desc(accounts.createdAt)).limit(1);
  return rows[0];
}

export const derivRouter = createRouter({
  connect: authedQuery.mutation(async ({ ctx }) => {
    const api = getOrCreateConnection(ctx.user.id);
    return { connected: await api.connect() };
  }),

  getAccountInfo: authedQuery.query(async ({ ctx }) => {
    const api = getOrCreateConnection(ctx.user.id);
    if (!api.isConnected()) await api.connect();
    const info = await api.getAccountInfo();
    return {
      balance: info.balance,
      currency: info.currency,
      loginid: info.loginid,
      isVirtual: info.is_virtual,
    };
  }),

  getPortfolio: authedQuery.query(async ({ ctx }) => {
    const api = getOrCreateConnection(ctx.user.id);
    if (!api.isConnected()) await api.connect();
    return api.getPortfolio();
  }),

  closeAllPositions: authedQuery.mutation(async ({ ctx }) => {
    const api = getOrCreateConnection(ctx.user.id);
    if (!api.isConnected()) await api.connect();
    const closed = await api.closeAllPositions();
    return { closed };
  }),

  getBalance: authedQuery.query(async ({ ctx }) => {
    const api = getOrCreateConnection(ctx.user.id);
    if (!api.isConnected()) await api.connect();
    const info = await api.getAccountInfo();
    return { balance: info.balance, currency: info.currency };
  }),

  getProtectionState: authedQuery.query(async ({ ctx }) => {
    const account = await findUserDerivDemoAccount(ctx.user.id);
    const state: ProtectionState = {
      dailyLimitPct: Number(account?.dailyLimitPct ?? 1),
      weeklyLimitPct: 10,
      monthlyLimitPct: 20,
      trailingEnabled: account?.trailingEnabled ?? true,
      trailingActivationPct: Number(account?.trailingActivationPct ?? 1),
      trailingProtectionPct: Number(account?.trailingProtectionPct ?? 30),
      isActive: account?.isActive ?? true,
    };
    return state;
  }),

  updateProtection: authedQuery
    .input(z.object({
      dailyLimitPct: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      weeklyLimitPct: z.literal(10),
      monthlyLimitPct: z.literal(20),
      trailingEnabled: z.boolean(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const account = await findUserDerivDemoAccount(ctx.user.id);
      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No se encontró una cuenta demo de Deriv vinculada a este usuario",
        });
      }
      const db = getDb();
      await db.update(accounts).set({
        dailyLimitPct: input.dailyLimitPct.toFixed(2),
        weeklyLimitPct: "10.00",
        monthlyLimitPct: "20.00",
        trailingEnabled: input.trailingEnabled,
        isActive: input.isActive,
      }).where(and(eq(accounts.id, account.id), eq(accounts.userId, ctx.user.id)));
      return { success: true, settings: input };
    }),

  getProtectionLogs: authedQuery.query(async () => {
    const logs: ProtectionLog[] = [{
      timestamp: new Date(),
      action: "RESET",
      message: "Sistema de protección iniciado",
      balanceBefore: 10000,
      balanceAfter: 10000,
      details: "Prueba piloto con Deriv Demo VRTC41298507",
    }];
    return logs;
  }),

  disconnect: authedQuery.mutation(async ({ ctx }) => {
    const api = activeConnections.get(ctx.user.id);
    if (api) {
      api.disconnect();
      activeConnections.delete(ctx.user.id);
    }
    return { disconnected: true };
  }),
});
