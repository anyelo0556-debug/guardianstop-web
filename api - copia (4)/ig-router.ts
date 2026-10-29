/**
 * IG ROUTER — Endpoints para el dashboard de Guardian Stop
 * Permite al frontend ver estado, historial, y controlar el worker.
 */

import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { accounts, trades, protectionLogs, notifications } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getWorkerStatus, iniciarWorkerGlobal, detenerWorkerGlobal } from "./services/IGPollingWorker";

export const igRouter = createRouter({
  // ============================================================
  // 1. ESTADO DEL WORKER
  // ============================================================
  workerStatus: publicQuery.query(async () => {
    return getWorkerStatus();
  }),

  // ============================================================
  // 2. INICIAR/DETENER WORKER
  // ============================================================
  startWorker: publicQuery.mutation(async () => {
    await iniciarWorkerGlobal();
    return { success: true, message: "Worker iniciado" };
  }),

  stopWorker: publicQuery.mutation(async () => {
    detenerWorkerGlobal();
    return { success: true, message: "Worker detenido" };
  }),

  // ============================================================
  // 3. DATOS DE CUENTA EN TIEMPO REAL
  // ============================================================
  getAccountStatus: publicQuery
    .input(z.object({ accountId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();

      const [account] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, input.accountId))
        .limit(1);

      if (!account) {
        return { error: "Cuenta no encontrada" };
      }

      // Get latest trades
      const latestTrades = await db
        .select()
        .from(trades)
        .where(eq(trades.accountId, input.accountId))
        .orderBy(desc(trades.createdAt))
        .limit(10);

      // Get open trades
      const openTrades = latestTrades.filter(t => t.status === "open");

      // Get latest protection logs
      const logs = await db
        .select()
        .from(protectionLogs)
        .where(eq(protectionLogs.accountId, input.accountId))
        .orderBy(desc(protectionLogs.createdAt))
        .limit(10);

      // Get unread notifications
      const notifs = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, account.userId),
            eq(notifications.isRead, false)
          )
        )
        .orderBy(desc(notifications.sentAt))
        .limit(5);

      return {
        account: {
          id: account.id,
          brokerType: account.brokerName,
          accountNumber: account.accountNumber,
          currentBalance: account.currentBalance,
          currentEquity: account.currentBalance, // No hay currentEquity, usar balance
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

  // ============================================================
  // 4. HISTORIAL COMPLETO DE PROTECCIÓN
  // ============================================================
  getProtectionHistory: publicQuery
    .input(z.object({
      accountId: z.number(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = getDb();

      const logs = await db
        .select()
        .from(protectionLogs)
        .where(eq(protectionLogs.accountId, input.accountId))
        .orderBy(desc(protectionLogs.createdAt))
        .limit(input.limit);

      return logs;
    }),

  // ============================================================
  // 5. NOTIFICACIONES
  // ============================================================
  getNotifications: publicQuery
    .input(z.object({
      userId: z.number(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = getDb();

      const notifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, input.userId))
        .orderBy(desc(notifications.sentAt))
        .limit(input.limit);

      return notifs;
    }),

  markNotificationRead: publicQuery
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, input.notificationId));

      return { success: true };
    }),

  // ============================================================
  // 6. LISTAR CUENTAS DEL USUARIO
  // ============================================================
  getUserAccounts: publicQuery
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();

      const userAccounts = await db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, input.userId))
        .orderBy(desc(accounts.createdAt));

      return userAccounts;
    }),

  // ============================================================
  // 7. ESTADÍSTICAS DE SESIÓN
  // ============================================================
  getSessionStats: publicQuery
    .input(z.object({ accountId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();

      // Total trades
      const allTrades = await db
        .select()
        .from(trades)
        .where(eq(trades.accountId, input.accountId));

      const openTrades = allTrades.filter(t => t.status === "open");
      const closedTrades = allTrades.filter(t => t.status === "closed");

      // Total P&L
      const totalPnL = closedTrades.reduce((sum, t) => sum + Number(t.profitLoss || 0), 0);

      // Protection triggers
      const logs = await db
        .select()
        .from(protectionLogs)
        .where(eq(protectionLogs.accountId, input.accountId));

      const dailyTriggers = logs.filter(l => l.triggerType === "daily_limit").length;
      const trailingTriggers = logs.filter(l => l.triggerType === "trailing_profit").length;

      return {
        totalTrades: allTrades.length,
        openTrades: openTrades.length,
        closedTrades: closedTrades.length,
        totalPnL,
        winRate: closedTrades.length > 0
          ? (closedTrades.filter(t => Number(t.profitLoss) > 0).length / closedTrades.length * 100).toFixed(1)
          : 0,
        dailyTriggers,
        trailingTriggers,
        totalProtectionEvents: logs.length,
      };
    }),
});
