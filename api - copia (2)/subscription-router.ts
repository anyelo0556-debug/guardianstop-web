import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { findSubscriptionsByUserId, findActiveSubscription, createSubscription } from "./queries/subscriptions";

export const subscriptionRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    return findSubscriptionsByUserId(ctx.user.id);
  }),

  active: authedQuery.query(async ({ ctx }) => {
    return findActiveSubscription(ctx.user.id);
  }),

  create: authedQuery
    .input(
      z.object({
        planType: z.enum(["basic", "trailing"]),
        periodDays: z.number().int().min(30).max(365),
        pricePaid: z.string(),
        expiresAt: z.string().datetime(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createSubscription({
        userId: ctx.user.id,
        planType: input.planType,
        periodDays: input.periodDays,
        pricePaid: input.pricePaid,
        expiresAt: new Date(input.expiresAt),
      });
    }),
});
