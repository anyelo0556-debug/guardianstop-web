import { authRouter } from "./auth-router";
import { accountRouter } from "./account-router";
import { subscriptionRouter } from "./subscription-router";
import { adminRouter } from "./admin-router";
import { guardianoRouter } from "./guardiano-router";
import { tradeRouter } from "./trade-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  account: accountRouter,
  subscription: subscriptionRouter,
  admin: adminRouter,
  guardiano: guardianoRouter,
  trade: tradeRouter,
});

export type AppRouter = typeof appRouter;
