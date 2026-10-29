import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { trades, accounts } from "@db/schema";

export const tradeRouter = createRouter({
  // Listar trades del usuario autenticado (para dashboard)
  list: authedQuery
    .input(
      z.object({
        accountId: z.number().optional(),
        status: z.enum(["open", "closed"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      // Si especifica accountId, verificar que pertenece al usuario
      if (input?.accountId) {
        const [cuenta] = await db
          .select()
          .from(accounts)
          .where(
            and(
              eq(accounts.id, input.accountId),
              eq(accounts.userId, userId)
            )
          )
          .limit(1);

        if (!cuenta) {
          throw new Error("Cuenta no encontrada o no pertenece al usuario");
        }
      }

      const conditions = [eq(trades.userId, userId)];
      if (input?.accountId) conditions.push(eq(trades.accountId, input.accountId));
      if (input?.status) conditions.push(eq(trades.status, input.status));

      const lista = await db
        .select()
        .from(trades)
        .where(and(...conditions))
        .orderBy(desc(trades.openedAt))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);

      return lista;
    }),

  // Obtener stats de trades para el dashboard
  stats: authedQuery
    .input(
      z.object({
        accountId: z.number().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      const conditions = [eq(trades.userId, userId)];
      if (input?.accountId) conditions.push(eq(trades.accountId, input.accountId));

      const allTrades = await db
        .select()
        .from(trades)
        .where(and(...conditions));

      const totalTrades = allTrades.length;
      const ganadas = allTrades.filter((t) => t.resultType === "win").length;
      const perdidas = allTrades.filter((t) => t.resultType === "loss").length;
      const protegidas = allTrades.filter(
        (t) =>
          t.resultType === "trailing_protection" ||
          t.resultType === "limit_protection"
      ).length;
      const abiertas = allTrades.filter((t) => t.status === "open").length;

      const profitTotal = allTrades.reduce(
        (sum, t) => sum + parseFloat(t.profitLoss || "0"),
        0
      );

      const winRate = totalTrades > 0 ? ((ganadas / totalTrades) * 100).toFixed(1) : "0.0";

      return {
        totalTrades,
        ganadas,
        perdidas,
        protegidas,
        abiertas,
        profitTotal: profitTotal.toFixed(2),
        winRate: `${winRate}%`,
      };
    }),

  // Obtener detalle de un trade especifico
  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      const [trade] = await db
        .select()
        .from(trades)
        .where(
          and(
            eq(trades.id, input.id),
            eq(trades.userId, userId)
          )
        )
        .limit(1);

      if (!trade) {
        throw new Error("Operacion no encontrada");
      }

      return trade;
    }),

  // Admin: listar trades de cualquier usuario
  adminList: adminQuery
    .input(
      z.object({
        userId: z.number().optional(),
        accountId: z.number().optional(),
        limit: z.number().min(1).max(200).default(100),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();

      const conditions = [];
      if (input?.userId) conditions.push(eq(trades.userId, input.userId));
      if (input?.accountId) conditions.push(eq(trades.accountId, input.accountId));

      const lista = await db
        .select()
        .from(trades)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(trades.openedAt))
        .limit(input?.limit || 100)
        .offset(input?.offset || 0);

      return lista;
    }),
});
