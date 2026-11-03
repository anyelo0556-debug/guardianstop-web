import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import * as cookie from "cookie";
import { createRouter, publicQuery } from "./middleware";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { signSessionToken } from "./kimi/session";
import { env } from "./lib/env";
import { findUserByUnionId } from "./queries/users";
import { createEmailCredential, findCredentialByEmail } from "./queries/emailAuth";
import { createSubscription } from "./queries/subscriptions";
import { sendWelcomeEmail } from "./services/EmailService";
import { getDb } from "./queries/connection";
import * as schema from "@db/schema";

let tableEnsured = false;
async function ensureEmailCredentialsTable() {
  if (tableEnsured) return;
  await getDb().execute(`
    CREATE TABLE IF NOT EXISTS email_credentials (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      userId BIGINT UNSIGNED NOT NULL,
      email VARCHAR(320) NOT NULL,
      passwordHash TEXT NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY email_credentials_email_unique (email),
      CONSTRAINT fk_email_credentials_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`);
  tableEnsured = true;
}

function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scrypt(pw, salt, 64).toString("hex")}`;
}

function verifyPassword(pw: string, stored: string) {
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  return timingSafeEqual(scrypt(pw, salt, 64), Buffer.from(hash, "hex"));
}

async function setSessionCookie(resHeaders: Headers, reqHeaders: Headers, unionId: string) {
  const token = await signSessionToken({ unionId, clientId: env.appId });
  const opts = getSessionCookieOptions(reqHeaders);
  resHeaders.append(
    "set-cookie",
    cookie.serialize(Session.cookieName, token, {
      httpOnly: opts.httpOnly,
      path: opts.path,
      sameSite: (opts.sameSite || "lax").toLowerCase() as "lax" | "none",
      secure: opts.secure,
      maxAge: Session.maxAgeMs / 1000,
    }),
  );
}

export const registerRouter = createRouter({
  // Registro + activación de suscripción + correo de bienvenida
  register: publicQuery
    .input(
      z.object({
        name: z.string().min(2).max(100),
        email: z.string().email().max(320),
        password: z.string().min(6).max(100),
        planType: z.enum(["basic", "trailing"]),
        periodDays: z.number().int().min(30).max(365),
        price: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const email = input.email.toLowerCase().trim();
      await ensureEmailCredentialsTable();

      const existing = await findCredentialByEmail(email);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Este correo ya está registrado. Inicia sesión." });
      }

      const unionId = `email:${email}`;
      const db = getDb();
      if (!(await findUserByUnionId(unionId))) {
        await db.insert(schema.users).values({ unionId, name: input.name, email, lastSignInAt: new Date() });
      }
      const user = (await findUserByUnionId(unionId))!;

      await createEmailCredential({ userId: user.id, email, passwordHash: hashPassword(input.password) });

      const sub = await createSubscription({
        userId: user.id,
        planType: input.planType,
        periodDays: input.periodDays,
        pricePaid: input.price,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + input.periodDays * 24 * 60 * 60 * 1000),
        status: "active",
      });

      let emailSent = false;
      try {
        const r = await sendWelcomeEmail({ to: email, name: input.name, planType: input.planType, periodDays: input.periodDays, price: input.price });
        emailSent = r.sent;
      } catch (e) {
        console.error("[register] welcome email failed:", e);
      }

      await setSessionCookie(ctx.resHeaders, ctx.req.headers, unionId);
      return {
        success: true,
        emailSent,
        user: { id: user.id, name: user.name, email },
        subscription: { id: sub.id, planType: sub.planType, periodDays: sub.periodDays, expiresAt: sub.expiresAt },
      };
    }),

  loginEmail: publicQuery
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const email = input.email.toLowerCase().trim();
      await ensureEmailCredentialsTable();
      const creds = await findCredentialByEmail(email);
      if (!creds || !verifyPassword(input.password, creds.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Correo o contraseña incorrectos." });
      }
      const user = (await findUserByUnionId(`email:${email}`))!;
      await setSessionCookie(ctx.resHeaders, ctx.req.headers, user.unionId);
      return { success: true, name: user.name };
    }),
});
