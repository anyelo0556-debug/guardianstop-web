import { describe, expect, it } from "vitest";
import {
  transitionCloseIntent,
  type CloseIntentSnapshot,
} from "./execution-intent";

const pending: CloseIntentSnapshot = {
  status: "PENDING",
  attempts: 0,
  lastAttemptAtMs: null,
  confirmedAtMs: null,
  lastErrorCode: null,
};

describe("durable close intent transitions", () => {
  it("keeps an unconfirmed close pending and records a retryable error code", () => {
    expect(transitionCloseIntent(pending, {
      type: "ATTEMPT_UNCONFIRMED",
      occurredAtMs: 1_800_000_000_000,
      errorCode: "POSITIONS_REMAINING",
    })).toEqual({
      status: "PENDING",
      attempts: 1,
      lastAttemptAtMs: 1_800_000_000_000,
      confirmedAtMs: null,
      lastErrorCode: "POSITIONS_REMAINING",
    });
  });

  it("marks an intent confirmed only after a broker-flat event", () => {
    expect(transitionCloseIntent(pending, {
      type: "BROKER_FLAT_CONFIRMED",
      occurredAtMs: 1_800_000_000_000,
    })).toEqual({
      status: "CONFIRMED",
      attempts: 1,
      lastAttemptAtMs: 1_800_000_000_000,
      confirmedAtMs: 1_800_000_000_000,
      lastErrorCode: null,
    });
  });

  it("does not downgrade a confirmed intent after a later failed retry", () => {
    const confirmed = transitionCloseIntent(pending, {
      type: "BROKER_FLAT_CONFIRMED",
      occurredAtMs: 1_800_000_000_000,
    });
    expect(transitionCloseIntent(confirmed, {
      type: "ATTEMPT_UNCONFIRMED",
      occurredAtMs: 1_800_000_001_000,
      errorCode: "POSITION_QUERY_FAILED",
    })).toBe(confirmed);
  });

  it("rejects out-of-order events so an old worker cannot move the attempt clock backwards", () => {
    const attempted = transitionCloseIntent(pending, {
      type: "ATTEMPT_UNCONFIRMED",
      occurredAtMs: 1_800_000_000_000,
      errorCode: "POSITIONS_REMAINING",
    });
    expect(transitionCloseIntent(attempted, {
      type: "ATTEMPT_UNCONFIRMED",
      occurredAtMs: 1_799_999_999_999,
      errorCode: "CLOSE_COMMAND_FAILED",
    })).toBe(attempted);
  });

  it("rejects an unknown runtime error code", () => {
    expect(transitionCloseIntent(pending, {
      type: "ATTEMPT_UNCONFIRMED",
      occurredAtMs: 1_800_000_000_000,
      errorCode: "UNRECOGNIZED" as any,
    })).toBe(pending);
  });

  it("rejects invalid timestamps without changing the intent", () => {
    expect(transitionCloseIntent(pending, {
      type: "BROKER_FLAT_CONFIRMED",
      occurredAtMs: Number.NaN,
    })).toBe(pending);
    expect(transitionCloseIntent(pending, {
      type: "ATTEMPT_UNCONFIRMED",
      occurredAtMs: Number.MAX_SAFE_INTEGER + 1,
      errorCode: "CLOSE_COMMAND_FAILED",
    })).toBe(pending);
  });
});
