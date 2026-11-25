import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { riskExecutionIntents } from "@db/schema";
import {
  transitionCloseIntent,
  type CloseIntentErrorCode,
  type CloseIntentEvent,
} from "../risk/execution-intent";

export type StoredCloseIntent = typeof riskExecutionIntents.$inferSelect;

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
 * Persist the close intent before calling the broker. If the process stops
 * after this insert, the next worker process can discover and retry it.
 */
export async function ensurePendingCloseIntent(
  accountId: number,
  reason: string,
): Promise<StoredCloseIntent> {
  const existing = await getPendingCloseIntent(accountId);
  if (existing) return existing;

  const idempotencyKey = `${accountId}:${randomUUID()}`;
  const db = getDb();

  await db.insert(riskExecutionIntents).values({
    idempotencyKey,
    accountId,
    reason: reason.slice(0, 64),
    status: "pending",
    attemptCount: 0,
  });

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

export async function recordCloseIntentEvent(
  idempotencyKey: string,
  event:
    | { type: "ATTEMPT_UNCONFIRMED"; errorCode: CloseIntentErrorCode; occurredAtMs?: number }
    | { type: "BROKER_FLAT_CONFIRMED"; occurredAtMs?: number },
): Promise<void> {
  const db = getDb();
  const [stored] = await db
    .select()
    .from(riskExecutionIntents)
    .where(eq(riskExecutionIntents.idempotencyKey, idempotencyKey))
    .limit(1);

  if (!stored) {
    throw new Error("CLOSE_INTENT_NOT_FOUND");
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

  if (next === current) return;

  await db
    .update(riskExecutionIntents)
    .set({
      status: next.status === "CONFIRMED" ? "confirmed" : "pending",
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
    ));
}
