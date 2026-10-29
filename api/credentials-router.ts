/**
 * CREDENTIALS ROUTER — Guarda credenciales de broker para el Risk Engine Python
 */

import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { accountCredentials } from "@db/schema";
import { eq } from "drizzle-orm";

export const credentialsRouter = createRouter({
  save: publicQuery
    .input(
      z.object({
        accountId: z.number(),
        broker: z.enum(["ig", "deriv"]),
        igApiKey: z.string().optional(),
        igIdentifier: z.string().optional(),
        igPassword: z.string().optional(),
        derivApiToken: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Upsert credentials
      const existing = await db
        .select()
        .from(accountCredentials)
        .where(eq(accountCredentials.accountId, input.accountId))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(accountCredentials)
          .set({
            igApiKey: input.igApiKey || existing[0].igApiKey,
            igIdentifier: input.igIdentifier || existing[0].igIdentifier,
            igPassword: input.igPassword || existing[0].igPassword,
            derivApiToken: input.derivApiToken || existing[0].derivApiToken,
          })
          .where(eq(accountCredentials.accountId, input.accountId));
      } else {
        await db.insert(accountCredentials).values({
          accountId: input.accountId,
          igApiKey: input.igApiKey || null,
          igIdentifier: input.igIdentifier || null,
          igPassword: input.igPassword || null,
          derivApiToken: input.derivApiToken || null,
        });
      }

      return { success: true };
    }),

  get: publicQuery
    .input(z.object({ accountId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(accountCredentials)
        .where(eq(accountCredentials.accountId, input.accountId))
        .limit(1);
      return rows[0] || null;
    }),
});
