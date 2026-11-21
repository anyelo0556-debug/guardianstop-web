import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import DerivAPI, { type ProtectionState } from "./services/DerivAPI";
import { getDb } from "./queries/connection";
import { accounts } from "@db/schema";

// Demo credentials are supplied only through the deployment secret manager.
// Never commit broker tokens, account passwords, or API keys to source control.
function getDemoConfig() {
  const { DERIV_DEMO_APP_ID, DERIV_DEMO_API_TOKEN, DERIV_DEMO_ACCOUNT_ID } = process.env;
  if (!DERIV_DEMO_APP_ID || !DERIV_DEMO_API_TOKEN || !DERIV_DEMO_ACCOUNT_ID) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "La conexión demo de Deriv no está configurada en el servidor.",
    });
  }
  return {
    appId: DERIV_DEMO_APP_ID,
    apiToken: DERIV_DEMO_API_TOKEN,
    accountId: DERIV_DEMO_ACCOUNT_ID,
  };
}

const activeConnections: Map<number, DerivAPI> = new Map();

// Shared demo execution remains administrator-only until credentials are isolated
// per user/account and the test environment is explicitly provisioned.
function requireDemoOperator(ctx: { user: { role?: string } }) {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "La cuenta demo compartida está habilitada únicamente para administración durante las pruebas.",
    });
  }
}

function getOrCreateConnection(userId: number): DerivAPI {
  if (!activeConnections.has(userId)) {
    activeConnections.set(userId, new DerivAPI(getDemoConfig()));
  }
  return activeConnections.get(userId)!;
}

async function findUserDerivDemoAccount(userId: number) {
  const db = getDb();
  const rows = await db.select().from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.accountType, "demo")))
    .orderBy(desc(accounts.createdAt));
  return rows.find((account) => account.brokerName.toLowerCase() === "deriv");
}

export const derivRouter = createRouter({
  connect: authedQuery.mutation(async ({ ctx }) => {
    requireDemoOperator(ctx);
    const api = getOrCreateConnection(ctx.user.id);
    return { connected: await api.connect() };
  }),

  getAccountInfo: authedQuery.query(async ({ ctx }) => {
    requireDemoOperator(ctx);
    const api = getOrCreateConnection(ctx.user.id);
    if (!api.isConnected()) await api.connect();
    const info = await api.getAccountInfo();
    return { balance: info.balance, currency: info.currency, loginid: info.loginid, isVirtual: info.is_virtual };
  }),

  getPortfolio: authedQuery.query(async ({ ctx }) => {
    requireDemoOperator(ctx);
    const api = getOrCreateConnection(ctx.user.id);
    if (!api.isConnected()) await api.connect();
    return api.getPortfolio();
  }),

  closeAllPositions: authedQuery.mutation(async ({ ctx }) => {
    requireDemoOperator(ctx);
    const api = getOrCreateConnection(ctx.user.id);
    if (!api.isConnected()) await api.connect();
    return { closed: await api.closeAllPositions() };
  }),

  getBalance: authedQuery.query(async ({ ctx }) => {
    requireDemoOperator(ctx);
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
        throw new TRPCError({ code: "NOT_FOUND", message: "No se encontró una cuenta demo de Deriv vinculada a este usuario" });
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
    return [];
  }),

  disconnect: authedQuery.mutation(async ({ ctx }) => {
    requireDemoOperator(ctx);
    const api = activeConnections.get(ctx.user.id);
    if (api) {
      api.disconnect();
      activeConnections.delete(ctx.user.id);
    }
    return { disconnected: true };
  }),
});
