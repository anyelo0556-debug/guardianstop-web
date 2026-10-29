import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { findAccountsByUserId, findAccountById, createAccount, updateAccount } from "./queries/accounts";

export const accountRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    return findAccountsByUserId(ctx.user.id);
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return findAccountById(input.id);
    }),

  create: authedQuery
    .input(
      z.object({
        brokerName: z.string().min(1).max(100),
        accountNumber: z.string().min(1).max(100),
        accountType: z.enum(["demo", "live"]),
        initialCapital: z.string(),
        dailyLimitPct: z.string().optional(),
        weeklyLimitPct: z.string().optional(),
        monthlyLimitPct: z.string().optional(),
        trailingEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createAccount({
        userId: ctx.user.id,
        brokerName: input.brokerName,
        accountNumber: input.accountNumber,
        accountType: input.accountType,
        initialCapital: input.initialCapital,
        currentBalance: input.initialCapital,
        dailyLimitPct: input.dailyLimitPct ?? "1.00",
        weeklyLimitPct: input.weeklyLimitPct ?? "10.00",
        monthlyLimitPct: input.monthlyLimitPct ?? "30.00",
        trailingEnabled: input.trailingEnabled ?? false,
      });
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        dailyLimitPct: z.string().optional(),
        weeklyLimitPct: z.string().optional(),
        monthlyLimitPct: z.string().optional(),
        trailingEnabled: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateAccount(id, data);
    }),
});
