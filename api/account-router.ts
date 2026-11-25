import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { findAccountsByUserId, findAccountById, createAccount, updateAccount } from "./queries/accounts";

const dailyLimit = z.string().refine((value) => [1, 2, 3].includes(Number(value)), "Daily limit must be 1%, 2%, or 3%");
const weeklyLimit = z.string().refine((value) => Number(value) === 10, "Weekly limit is fixed at 10%");
const monthlyLimit = z.string().refine((value) => Number(value) === 20, "Monthly limit is fixed at 20%");

export const accountRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => findAccountsByUserId(ctx.user.id)),

  getById: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => findAccountById(input.id, ctx.user.id)),

  create: authedQuery
    .input(z.object({
      brokerName: z.string().min(1).max(100),
      accountNumber: z.string().min(1).max(100),
      accountType: z.enum(["demo", "live"]),
      initialCapital: z.string().regex(/^\d+(\.\d{1,2})?$/),
      dailyLimitPct: dailyLimit.optional(),
      weeklyLimitPct: weeklyLimit.optional(),
      monthlyLimitPct: monthlyLimit.optional(),
      trailingEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => createAccount({
      userId: ctx.user.id,
      brokerName: input.brokerName,
      accountNumber: input.accountNumber,
      accountType: input.accountType,
      initialCapital: input.initialCapital,
      currentBalance: input.initialCapital,
      dailyLimitPct: input.dailyLimitPct ?? "1.00",
      weeklyLimitPct: "10.00",
      monthlyLimitPct: "20.00",
      trailingEnabled: input.trailingEnabled ?? false,
    })),

  update: authedQuery
    .input(z.object({
      id: z.number().int().positive(),
      dailyLimitPct: dailyLimit.optional(),
      weeklyLimitPct: weeklyLimit.optional(),
      monthlyLimitPct: monthlyLimit.optional(),
      trailingEnabled: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return updateAccount(id, ctx.user.id, {
        ...data,
        weeklyLimitPct: data.weeklyLimitPct ? "10.00" : undefined,
        monthlyLimitPct: data.monthlyLimitPct ? "20.00" : undefined,
      });
    }),
});
