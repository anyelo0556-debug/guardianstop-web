import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, lte, or } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { riskExecutionIntents } from "@db/schema";
import {
  transitionCloseIntent,
  type CloseIntentErrorCode,
  type CloseIntentEvent,
} from "../risk/execution-intent";

export type StoredCloseIntent = typeof riskExecutionIntents.$inferSelect;

export const DEFAULT_CLOSE_INTENT_LEASE_MS = 120_000;

export async function getPendingCloseIntent(
  accountId: number,
): Promise<StoredCloseIntent | null> {
  const [intent] = await getDb()
    .select()
    .from(riskExecutionIntents)
    .where(and(
      eq(riskExecutionIntents.accountId, accountId),
      eq(riskExecutionIntents.status, "pending"),
    ))
    .orderBy(desc(riskExecutionIntents.createdAt))
    .limit(1);

  return intent ?? null;
}

/**
 * Persist the close intent before calling the broker. activeLockKey is unique
 * per account while pending, so concurrent workers cannot create two active
 * close intents for the same account.
 */
export async function ensurePendingCloseIntent(
  accountId: number,
  reason: string,
): Promise<StoredCloseIntent> {
  const existing = await getPendingCloseIntent(accountId);
  if (existing) return existing;

  const idempotencyKey = `${accountId}:${randomUUID()}`;
  const db = getDb();

  try {
    await db.insert(riskExecutionIntents).values({
      idempotencyKey,
      accountId,
      reason: reason.slice(0, 64),
      status: "pending",
      attemptCount: 0,
      activeLockKey: String(accountId),
      leaseOwner: null,
      leaseUntil: null,
    });
  } catch (error) {
    // Another worker may have won the unique activeLockKey insert race.
    const raced = await getPendingCloseIntent(accountId);
    if (raced) return raced;
    throw error;
  }

  const [created] = await db
    .select()
    .from(riskExecutionIntents)
    .where(eq(riskExecutionIntents.idempotencyKey, idempotencyKey))
    .limit(1);

  if (!created) {
    throw new Error("CLOSE_INTENT_PERSISTENCE_FAILED");
  }

  return created;
}

/**
 * Atomically claims a pending intent using a conditional UPDATE. A second
 * worker can only claim it after the current lease expires or is released.
 */
export async function claimPendingCloseIntent(
  idempotencyKey: string,
  leaseMs = DEFAULT_CLOSE_INTENT_LEASE_MS,
): Promise<StoredCloseIntent | null> {
  if (!Number.isSafeInteger(leaseMs) || leaseMs < 1_000 || leaseMs > 10 * 60_000) {
    throw new Error("CLOSE_INTENT_INVALID_LEASE_DURATION");
  }

  const nowMs = Date.now();
  const leaseUntilMs = nowMs + leaseMs;
  if (!Number.isSafeInteger(leaseUntilMs)) {
    throw new Error("CLOSE_INTENT_INVALID_LEASE_EXPIRY");
  }

  const leaseOwner = randomUUID();
  const now = new Date(nowMs);
  const db = getDb();

  await db
    .update(riskExecutionIntents)
    .set({
      leaseOwner,
      leaseUntil: new Date(leaseUntilMs),
      updatedAt: now,
    })
    .where(and(
      eq(riskExecutionIntents.idempotencyKey, idempotencyKey),
      eq(riskExecutionIntents.status, "pending"),
      or(
        isNull(riskExecutionIntents.leaseUntil),
        lte(riskExecutionIntents.leaseUntil, now),
      ),
    ));

  const [claimed] = await db
    .select()
    .from(riskExecutionIntents)
    .where(and(
      eq(riskExecutionIntents.idempotencyKey, idempotencyKey),
      eq(riskExecutionIntents.status, "pending"),
      eq(riskExecutionIntents.leaseOwner, leaseOwner),
    ))
    .limit(1);

  return claimed ?? null;
}

/**
 * Apply an event only while the caller still owns the lease. Clearing the
 * lease in the same UPDATE prevents a stale worker from overwriting a newer
 * claim. Confirmed intents also release the account's unique active lock.
 */
export async function recordCloseIntentEvent(
  idempotencyKey: string,
  leaseOwner: string,
  event:
    | { type: "ATTEMPT_UNCONFIRMED"; errorCode: CloseIntentErrorCode; occurredAtMs?: number }
    | { type: "BROKER_FLAT_CONFIRMED"; occurredAtMs?: number },
): Promise<void> {
  const db = getDb();
  const [stored] = await db
    .select()
    .from(riskExecutionIntents)
    .where(and(
      eq(riskExecutionIntents.idempotencyKey, idempotencyKey),
      eq(riskExecutionIntents.status, "pending"),
      eq(riskExecutionIntents.leaseOwner, leaseOwner),
    ))
    .limit(1);

  if (!stored) {
    throw new Error("CLOSE_INTENT_LEASE_LOST");
  }

  const occurredAtMs = event.occurredAtMs ?? Date.now();
  const current = {
    status: stored.status === "confirmed" ? "CONFIRMED" as const : "PENDING" as const,
    attempts: stored.attemptCount,
    lastAttemptAtMs: stored.lastAttemptAt?.getTime() ?? null,
    confirmedAtMs: stored.confirmedAt?.getTime() ?? null,
    lastErrorCode: stored.lastErrorCode as CloseIntentErrorCode | null,
  };
  const next = transitionCloseIntent(current, {
    ...event,
    occurredAtMs,
  } as CloseIntentEvent);

  if (next === current) {
    throw new Error("CLOSE_INTENT_EVENT_REJECTED");
  }

  await db
    .update(riskExecutionIntents)
    .set({
      status: next.status === "CONFIRMED" ? "confirmed" : "pending",
      activeLockKey: next.status === "CONFIRMED" ? null : String(stored.accountId),
      leaseOwner: null,
      leaseUntil: null,
      attemptCount: next.attempts,
      lastAttemptAt: next.lastAttemptAtMs === null
        ? null
        : new Date(next.lastAttemptAtMs),
      confirmedAt: next.confirmedAtMs === null
        ? null
        : new Date(next.confirmedAtMs),
      lastErrorCode: next.lastErrorCode,
      updatedAt: new Date(),
    })
    .where(and(
      eq(riskExecutionIntents.idempotencyKey, idempotencyKey),
      eq(riskExecutionIntents.status, "pending"),
      eq(riskExecutionIntents.leaseOwner, leaseOwner),
    ));
}
