/**
 * IG ROUTER — Authenticated dashboard endpoints.
 *
 * Every account-scoped read is constrained to the authenticated owner.
 * Global worker controls are administrator-only.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { accounts, trades, protectionLogs, notifications } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getWorkerStatus, iniciarWorkerGlobal, detenerWorkerGlobal } from "./services/IGPollingWorker";

const accountIdSchema = z.number().int().positive();
const boundedLimit = (fallback: number, max: number) =>
  z.number().int().min(1).max(max).default(fallback);

async function requireOwnedAccount(accountId: number, userId: number) {
  const db = getDb();
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);

  if (!account) {
    // Do not reveal whether an account owned by another user exists.
    throw new TRPCError({ code: "NOT_FOUND", message: "Cuenta no encontrada" });
  }
  return account;
}

export const igRouter = createRouter({
  // Global process controls are never exposed to ordinary customers.
  workerStatus: adminQuery.query(async () => getWorkerStatus()),

  startWorker: adminQuery.mutation(async () => {
    await iniciarWorkerGlobal();
    return { success: true, message: "Worker iniciado" };
  }),

  stopWorker: adminQuery.mutation(async () => {
    detenerWorkerGlobal();
    return { success: true, message: "Worker detenido" };
  }),

  getAccountStatus: authedQuery
    .input(z.object({ accountId: accountIdSchema }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const account = await requireOwnedAccount(input.accountId, ctx.user.id);

      const latestTrades = await db
        .select()
        .from(trades)
        .where(eq(trades.accountId, input.accountId))
        .orderBy(desc(trades.createdAt))
        .limit(10);

      const openTrades = latestTrades.filter((trade) => trade.status === "open");

      const logs = await db
        .select()
        .from(protectionLogs)
        .where(eq(protectionLogs.accountId, input.accountId))
        .orderBy(desc(protectionLogs.createdAt))
        .limit(10);

      const notifs = await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false),
        ))
        .orderBy(desc(notifications.sentAt))
        .limit(5);

      return {
        account: {
          id: account.id,
          brokerType: account.brokerName,
          accountNumber: account.accountNumber,
          currentBalance: account.currentBalance,
          currentEquity: account.currentBalance,
          dailyLimit: account.dailyLimitPct,
          weeklyLimit: account.weeklyLimitPct,
          monthlyLimit: account.monthlyLimitPct,
          trailingEnabled: account.trailingEnabled,
          isLocked: !account.isActive,
          status: account.isActive ? "ACTIVE" : "LOCKED",
          updatedAt: account.updatedAt,
        },
        openTrades,
        recentLogs: logs,
        unreadNotifications: notifs,
      };
    }),

  getProtectionHistory: authedQuery
    .input(z.object({
      accountId: accountIdSchema,
      limit: boundedLimit(50, 100),
    }))
    .query(async ({ input, ctx }) => {
      await requireOwnedAccount(input.accountId, ctx.user.id);
      const db = getDb();
      return db
        .select()
        .from(protectionLogs)
        .where(eq(protectionLogs.accountId, input.accountId))
        .orderBy(desc(protectionLogs.createdAt))
        .limit(input.limit);
    }),

  // userId is accepted for backwards-compatible clients but deliberately ignored.
  // The authenticated session is the sole source of identity.
  getNotifications: authedQuery
    .input(z.object({
      userId: z.number().int().positive().optional(),
      limit: boundedLimit(20, 100),
    }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      return db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, ctx.user.id))
        .orderBy(desc(notifications.sentAt))
        .limit(input.limit);
    }),

  markNotificationRead: authedQuery
    .input(z.object({ notificationId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.id, input.notificationId),
          eq(notifications.userId, ctx.user.id),
        ));

      return { success: true, updated: result[0]?.affectedRows > 0 };
    }),

  // userId is accepted for backwards-compatible clients but deliberately ignored.
  getUserAccounts: authedQuery
    .input(z.object({ userId: z.number().int().positive().optional() }).optional())
    .query(async ({ ctx }) => {
      const db = getDb();
      return db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, ctx.user.id))
        .orderBy(desc(accounts.createdAt));
    }),

  getSessionStats: authedQuery
    .input(z.object({ accountId: accountIdSchema }))
    .query(async ({ input, ctx }) => {
      await requireOwnedAccount(input.accountId, ctx.user.id);
      const db = getDb();

      const allTrades = await db
        .select()
        .from(trades)
        .where(eq(trades.accountId, input.accountId));

      const openTrades = allTrades.filter((trade) => trade.status === "open");
      const closedTrades = allTrades.filter((trade) => trade.status === "closed");
      const totalPnL = closedTrades.reduce((sum, trade) => sum + Number(trade.profitLoss || 0), 0);

      const logs = await db
        .select()
        .from(protectionLogs)
        .where(eq(protectionLogs.accountId, input.accountId));

      const dailyTriggers = logs.filter((log) => log.triggerType === "daily_limit").length;
      const trailingTriggers = logs.filter((log) => log.triggerType === "trailing_profit").length;

      return {
        totalTrades: allTrades.length,
        openTrades: openTrades.length,
        closedTrades: closedTrades.length,
        totalPnL,
        winRate: closedTrades.length > 0
          ? (closedTrades.filter((trade) => Number(trade.profitLoss) > 0).length / closedTrades.length * 100).toFixed(1)
          : 0,
        dailyTriggers,
        trailingTriggers,
        totalProtectionEvents: logs.length,
      };
    }),
});
