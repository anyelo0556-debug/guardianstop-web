import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { createPayment, updatePaymentStatus, findPendingPayment } from "./queries/payments";
import { createSubscription } from "./queries/subscriptions";

// ─── STRIPE ───────────────────────────────────────────────────────
async function createStripeSession(params: {
  priceId: string;
  userId: number;
  planType: "basic" | "trailing";
  periodDays: number;
  successUrl: string;
  cancelUrl: string;
}) {
  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET) throw new Error("Stripe not configured");

  const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      "mode": "subscription",
      "payment_method_types[]": "card",
      "line_items[0][price]": params.priceId,
      "line_items[0][quantity]": "1",
      "success_url": params.successUrl,
      "cancel_url": params.cancelUrl,
      "client_reference_id": String(params.userId),
      "metadata[planType]": params.planType,
      "metadata[periodDays]": String(params.periodDays),
    }),
  });

  if (!resp.ok) {
    const err = await resp.json() as { error?: { message?: string } };
    throw new Error(err.error?.message || "Stripe error");
  }

  const data = await resp.json() as { id: string; url: string };
  return data;
}

// ─── PAYPAL ───────────────────────────────────────────────────────
async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("PayPal not configured");

  const isSandbox = !process.env.PAYPAL_LIVE;
  const baseUrl = isSandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  const resp = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!resp.ok) throw new Error("PayPal auth failed");
  const data = await resp.json() as { access_token: string };
  return data.access_token;
}

async function createPayPalSubscription(params: {
  planId: string;
  userId: number;
  successUrl: string;
  cancelUrl: string;
}) {
  const token = await getPayPalAccessToken();
  const isSandbox = !process.env.PAYPAL_LIVE;
  const baseUrl = isSandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  const resp = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: params.planId,
      application_context: {
        brand_name: "Guardian Stop",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: params.successUrl,
        cancel_url: params.cancelUrl,
      },
      custom_id: String(params.userId),
    }),
  });

  if (!resp.ok) {
    const err = await resp.json() as { message?: string };
    throw new Error(err.message || "PayPal error");
  }

  const data = await resp.json() as { id: string; links: Array<{ rel: string; href: string }> };
  return data;
}

// ─── CRYPTO (NowPayments) ─────────────────────────────────────────
async function createCryptoPayment(params: {
  amount: number;
  currency: string; // USDC or USDT
  orderId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) throw new Error("Crypto payments not configured");

  const resp = await fetch("https://api.nowpayments.io/v1/payment", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      price_amount: params.amount,
      price_currency: "usd",
      pay_currency: params.currency.toLowerCase(),
      order_id: params.orderId,
      order_description: "Guardian Stop Subscription",
      ipn_callback_url: `${process.env.API_URL || ""}/api/trpc/payment.cryptoWebhook`,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json() as { message?: string };
    throw new Error(err.message || "Crypto payment error");
  }

  const data = await resp.json() as {
    payment_id: string;
    pay_address: string;
    pay_amount: string;
    payment_expiration: number;
  };
  return data;
}

// ─── ROUTER ───────────────────────────────────────────────────────
export const paymentRouter = createRouter({
  // Stripe: create checkout session
  createStripeSession: authedQuery
    .input(
      z.object({
        planType: z.enum(["basic", "trailing"]),
        periodDays: z.number().min(30),
        priceId: z.string(),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const session = await createStripeSession({
        priceId: input.priceId,
        userId,
        planType: input.planType,
        periodDays: input.periodDays,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      });

      await createPayment({
        userId,
        provider: "stripe",
        providerPaymentId: session.id,
        planType: input.planType,
        periodDays: input.periodDays,
        amount: input.planType === "basic" ? "19.99" : "22.99",
        status: "pending",
      });

      return { sessionId: session.id, url: session.url };
    }),

  // PayPal: create subscription
  createPayPalSubscription: authedQuery
    .input(
      z.object({
        planType: z.enum(["basic", "trailing"]),
        periodDays: z.number().min(30),
        paypalPlanId: z.string(),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const sub = await createPayPalSubscription({
        planId: input.paypalPlanId,
        userId,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      });

      await createPayment({
        userId,
        provider: "paypal",
        providerPaymentId: sub.id,
        planType: input.planType,
        periodDays: input.periodDays,
        amount: input.planType === "basic" ? "19.99" : "22.99",
        status: "pending",
      });

      const approveLink = sub.links.find((l) => l.rel === "approve")?.href;
      return { subscriptionId: sub.id, url: approveLink };
    }),

  // Crypto: create payment
  createCryptoPayment: authedQuery
    .input(
      z.object({
        planType: z.enum(["basic", "trailing"]),
        periodDays: z.number().min(30),
        currency: z.enum(["USDC", "USDT"]),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const orderId = `gs_${userId}_${Date.now()}`;
      const payment = await createCryptoPayment({
        amount: input.planType === "basic" ? 19.99 : 22.99,
        currency: input.currency,
        orderId,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      });

      await createPayment({
        userId,
        provider: input.currency === "USDC" ? "crypto_usdc" : "crypto_usdt",
        providerPaymentId: payment.payment_id || orderId,
        planType: input.planType,
        periodDays: input.periodDays,
        amount: input.planType === "basic" ? "19.99" : "22.99",
        status: "pending",
        metadata: JSON.stringify({
          payAddress: payment.pay_address,
          payAmount: payment.pay_amount,
          cryptoCurrency: input.currency,
        }),
      });

      return {
        paymentId: payment.payment_id,
        payAddress: payment.pay_address,
        payAmount: payment.pay_amount,
        cryptoCurrency: input.currency,
        expiration: payment.payment_expiration,
      };
    }),

  // Verify payment status (poll from frontend)
  verifyPayment: authedQuery
    .input(z.object({ paymentId: z.string(), provider: z.enum(["stripe", "paypal", "crypto_usdc", "crypto_usdt"]) }))
    .query(async ({ input, ctx }) => {
      const payment = await findPendingPayment(ctx.user.id, input.provider, input.paymentId);
      return { status: payment?.status || "not_found" };
    }),

  // Webhook: Stripe (public, no auth)
  stripeWebhook: publicQuery
    .input(z.any())
    .mutation(async ({ input }: { input: any }) => {
      const event = input;
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as { id: string; client_reference_id: string; metadata?: { planType?: string; periodDays?: string } };
        const payment = await findPendingPayment(
          Number(session.client_reference_id),
          "stripe",
          session.id
        );
        if (payment) {
          const planType = session.metadata?.planType || "basic";
          const periodDays = Number(session.metadata?.periodDays) || 30;
          const sub = await createSubscription({
            userId: payment.userId,
            planType: planType === "basic" ? "basic" : "trailing",
            pricePaid: planType === "basic" ? "19.99" : "22.99",
            periodDays,
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
            status: "active",
          });
          await updatePaymentStatus(payment.id, "completed", {
            paidAt: new Date(),
            subscriptionId: sub.id,
          });
        }
      }
      return { received: true };
    }),

  // Webhook: PayPal (public, no auth)
  paypalWebhook: publicQuery
    .input(z.any())
    .mutation(async ({ input }: { input: any }) => {
      const event = input;
      if (event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
        const subscription = event.resource as { id: string; custom_id: string };
        const payment = await findPendingPayment(
          Number(subscription.custom_id),
          "paypal",
          subscription.id
        );
        if (payment) {
          const sub = await createSubscription({
            userId: payment.userId,
            planType: payment.planType,
            pricePaid: payment.amount,
            periodDays: payment.periodDays,
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + payment.periodDays * 24 * 60 * 60 * 1000),
            status: "active",
          });
          await updatePaymentStatus(payment.id, "completed", {
            paidAt: new Date(),
            subscriptionId: sub.id,
          });
        }
      }
      return { received: true };
    }),

  // Webhook: Crypto (public, no auth)
  cryptoWebhook: publicQuery
    .input(z.any())
    .mutation(async ({ input }: { input: any }) => {
      const paymentId = input.payment_id as string;
      const status = input.payment_status as string;
      if (status === "finished") {
        const db = (await import("./queries/connection")).getDb();
        const { payments: paymentsTable } = await import("@db/schema");
        const { eq, and } = await import("drizzle-orm");
        const results = await db
          .select()
          .from(paymentsTable)
          .where(
            and(
              eq(paymentsTable.providerPaymentId, paymentId),
              eq(paymentsTable.status, "pending")
            )
          )
          .limit(1);
        const payment = results[0];
        if (payment) {
          const sub = await createSubscription({
            userId: payment.userId,
            planType: payment.planType,
            pricePaid: payment.amount,
            periodDays: payment.periodDays,
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + payment.periodDays * 24 * 60 * 60 * 1000),
            status: "active",
          });
          await updatePaymentStatus(payment.id, "completed", {
            paidAt: new Date(),
            subscriptionId: sub.id,
          });
        }
      }
      return { received: true };
    }),
});
