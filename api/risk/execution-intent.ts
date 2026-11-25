/**
 * Pure transition rules for durable broker-close intents.
 *
 * A broker close request is not proof that the account is flat. The intent
 * remains pending until a fresh broker position query confirms zero positions.
 */
export type CloseIntentStatus = "PENDING" | "CONFIRMED";
export type CloseIntentErrorCode =
  | "CLOSE_COMMAND_FAILED"
  | "POSITION_QUERY_FAILED"
  | "POSITIONS_REMAINING";

export interface CloseIntentSnapshot {
  status: CloseIntentStatus;
  attempts: number;
  lastAttemptAtMs: number | null;
  confirmedAtMs: number | null;
  lastErrorCode: CloseIntentErrorCode | null;
}

export type CloseIntentEvent =
  | {
      type: "ATTEMPT_UNCONFIRMED";
      occurredAtMs: number;
      errorCode: CloseIntentErrorCode;
    }
  | { type: "BROKER_FLAT_CONFIRMED"; occurredAtMs: number };

function isValidTimestamp(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

/**
 * Confirmed intents are terminal. A later timeout or retry result must never
 * downgrade an already-confirmed broker-flat observation.
 */
export function transitionCloseIntent(
  current: CloseIntentSnapshot,
  event: CloseIntentEvent,
): CloseIntentSnapshot {
  if (
    current.status === "CONFIRMED" ||
    !Number.isSafeInteger(current.attempts) ||
    current.attempts < 0 ||
    !isValidTimestamp(event.occurredAtMs) ||
    current.attempts >= Number.MAX_SAFE_INTEGER
  ) {
    return current;
  }

  if (event.type === "BROKER_FLAT_CONFIRMED") {
    return {
      ...current,
      status: "CONFIRMED",
      attempts: current.attempts + 1,
      lastAttemptAtMs: event.occurredAtMs,
      confirmedAtMs: event.occurredAtMs,
      lastErrorCode: null,
    };
  }

  return {
    ...current,
    status: "PENDING",
    attempts: current.attempts + 1,
    lastAttemptAtMs: event.occurredAtMs,
    confirmedAtMs: null,
    lastErrorCode: event.errorCode,
  };
}
