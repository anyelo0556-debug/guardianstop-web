import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import DerivAPI, { type ProtectionState, type ProtectionLog } from "./services/DerivAPI";

// Demo config - Ángel's account
const DEMO_CONFIG = {
  appId: "019e0769-496a-7c63-9b8d-cbe709b744e4",
  apiToken: "pat_85e81e5b3e0efc239ef10b2df8b1db9b4d31ab4d86a28ba682e22abd2c733845",
  accountId: "VRTC41298507",
};

// Store active connections (in production, use Redis)
const activeConnections: Map<number, DerivAPI> = new Map();

function getOrCreateConnection(userId: number): DerivAPI {
  if (!activeConnections.has(userId)) {
    const api = new DerivAPI(DEMO_CONFIG);
    activeConnections.set(userId, api);
  }
  return activeConnections.get(userId)!;
}

export const derivRouter = createRouter({
  // Connect to Deriv
  connect: authedQuery
    .mutation(async ({ ctx }) => {
      const api = getOrCreateConnection(ctx.user.id);
      const connected = await api.connect();
      return { connected };
    }),

  // Get account info
  getAccountInfo: authedQuery
    .query(async ({ ctx }) => {
      const api = getOrCreateConnection(ctx.user.id);
      if (!api.isConnected()) {
        await api.connect();
      }
      const info = await api.getAccountInfo();
      return {
        balance: info.balance,
        currency: info.currency,
        loginid: info.loginid,
        isVirtual: info.is_virtual,
      };
    }),

  // Get current portfolio (open positions)
  getPortfolio: authedQuery
    .query(async ({ ctx }) => {
      const api = getOrCreateConnection(ctx.user.id);
      if (!api.isConnected()) {
        await api.connect();
      }
      const positions = await api.getPortfolio();
      return positions;
    }),

  // Close all positions (emergency)
  closeAllPositions: authedQuery
    .mutation(async ({ ctx }) => {
      const api = getOrCreateConnection(ctx.user.id);
      if (!api.isConnected()) {
        await api.connect();
      }
      const closed = await api.closeAllPositions();
      return { closed };
    }),

  // Subscribe to balance updates (polling-based for now)
  getBalance: authedQuery
    .query(async ({ ctx }) => {
      const api = getOrCreateConnection(ctx.user.id);
      if (!api.isConnected()) {
        await api.connect();
      }
      const info = await api.getAccountInfo();
      return { balance: info.balance, currency: info.currency };
    }),

  // Get protection state (stored in DB or memory)
  getProtectionState: authedQuery
    .query(async () => {
      // Default protection state
      const state: ProtectionState = {
        dailyLimitPct: 1,
        weeklyLimitPct: 10,
        monthlyLimitPct: 30,
        trailingEnabled: true,
        trailingActivationPct: 1,
        trailingProtectionPct: 30,
        isActive: true,
      };
      return state;
    }),

  // Update protection settings
  updateProtection: authedQuery
    .input(
      z.object({
        dailyLimitPct: z.number().min(0.1).max(100),
        weeklyLimitPct: z.number().min(0.1).max(100),
        monthlyLimitPct: z.number().min(0.1).max(100),
        trailingEnabled: z.boolean(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      // In production, save to DB
      return { success: true, settings: input };
    }),

  // Get protection logs
  getProtectionLogs: authedQuery
    .query(async () => {
      // Return mock logs for demo
      const logs: ProtectionLog[] = [
        {
          timestamp: new Date(),
          action: "RESET",
          message: "Sistema de protección iniciado",
          balanceBefore: 10000,
          balanceAfter: 10000,
          details: "Prueba piloto con Deriv Demo VRTC41298507",
        },
      ];
      return logs;
    }),

  // Disconnect
  disconnect: authedQuery
    .mutation(async ({ ctx }) => {
      const api = activeConnections.get(ctx.user.id);
      if (api) {
        api.disconnect();
        activeConnections.delete(ctx.user.id);
      }
      return { disconnected: true };
    }),
});
