/**
 * Broker credentials are account-owned and encrypted before persistence.
 * Secrets are never returned to the browser after being saved.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { accounts, accountCredentials } from "@db/schema";
import { encryptSecret } from "./lib/credential-vault";
import { and, eq } from "drizzle-orm";

const secretSchema = z.string().min(1).max(2048).optional();

function encryptSecretForApi(value: string): string {
  try {
    return encryptSecret(value);
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Broker credential encryption is not configured",
    });
  }
}

export const credentialsRouter = createRouter({
  save: authedQuery
    .input(z.object({
      accountId: z.number().int().positive(),
      broker: z.enum(["ig", "deriv"]),
      igApiKey: secretSchema,
      igIdentifier: z.string().min(1).max(100).optional(),
      igPassword: secretSchema,
      derivApiToken: secretSchema,
    }).refine((v) => Boolean(v.igApiKey || v.igIdentifier || v.igPassword || v.derivApiToken), {
      message: "At least one credential field must be supplied",
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const owned = await db.select({ id: accounts.id, brokerName: accounts.brokerName })
        .from(accounts)
        .where(and(eq(accounts.id, input.accountId), eq(accounts.userId, ctx.user.id)))
        .limit(1);

      if (!owned.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Trading account not found" });
      }
      if (owned[0].brokerName.toLowerCase() !== input.broker) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Broker does not match the trading account" });
      }

      const values: { igApiKey?: string; igIdentifier?: string; igPassword?: string; derivApiToken?: string } = {};
      if (input.igApiKey !== undefined) values.igApiKey = encryptSecretForApi(input.igApiKey);
      if (input.igIdentifier !== undefined) values.igIdentifier = input.igIdentifier;
      if (input.igPassword !== undefined) values.igPassword = encryptSecretForApi(input.igPassword);
      if (input.derivApiToken !== undefined) values.derivApiToken = encryptSecretForApi(input.derivApiToken);

      const existing = await db.select({ id: accountCredentials.id })
        .from(accountCredentials)
        .where(eq(accountCredentials.accountId, input.accountId))
        .limit(1);

      if (existing.length) {
        await db.update(accountCredentials).set(values)
          .where(eq(accountCredentials.accountId, input.accountId));
      } else {
        await db.insert(accountCredentials).values({
          accountId: input.accountId,
          igApiKey: values.igApiKey ?? null,
          igIdentifier: values.igIdentifier ?? null,
          igPassword: values.igPassword ?? null,
          derivApiToken: values.derivApiToken ?? null,
        });
      }
      return { success: true };
    }),

  get: authedQuery
    .input(z.object({ accountId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const owned = await db.select({ id: accounts.id, brokerName: accounts.brokerName })
        .from(accounts)
        .where(and(eq(accounts.id, input.accountId), eq(accounts.userId, ctx.user.id)))
        .limit(1);
      if (!owned.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Trading account not found" });
      }
      const rows = await db.select({
        igApiKey: accountCredentials.igApiKey,
        igIdentifier: accountCredentials.igIdentifier,
        igPassword: accountCredentials.igPassword,
        derivApiToken: accountCredentials.derivApiToken,
      }).from(accountCredentials)
        .where(eq(accountCredentials.accountId, input.accountId))
        .limit(1);
      const row = rows[0];
      return {
        accountId: input.accountId,
        broker: owned[0].brokerName,
        configured: Boolean(row),
        hasIgApiKey: Boolean(row?.igApiKey),
        hasIgIdentifier: Boolean(row?.igIdentifier),
        hasIgPassword: Boolean(row?.igPassword),
        hasDerivApiToken: Boolean(row?.derivApiToken),
      };
    }),
});
