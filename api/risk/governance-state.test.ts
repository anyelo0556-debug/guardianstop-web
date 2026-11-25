import { describe, expect, it } from "vitest";
import {
  createInitialRiskGovernanceState,
  GUARDIAN_LOCKOUT_MS,
  transitionRiskGovernance,
} from "./governance-state";

describe("Guardian Stop governance state machine", () => {
  it("starts with independent risk, telemetry and execution states", () => {
    expect(createInitialRiskGovernanceState("REAL")).toEqual({
      accountMode: "REAL",
      discipline: "NORMAL",
      telemetry: "CONNECTED",
      execution: "IDLE",
      lockoutStartedAtMs: null,
      lockoutUntilMs: null,
    });
  });

  it("escalates NORMAL to WARNING to FRICTION without allowing a downgrade", () => {
    const initial = createInitialRiskGovernanceState("REAL");
    const warning = transitionRiskGovernance(initial, { type: "RISK_WARNING" });
    const friction = transitionRiskGovernance(warning, { type: "RISK_FRICTION" });
    expect(warning.discipline).toBe("WARNING");
    expect(friction.discipline).toBe("FRICTION");
    expect(transitionRiskGovernance(friction, { type: "RISK_WARNING" })).toBe(friction);
  });

  it("recovers WARNING or FRICTION only on an explicit recovery event", () => {
    const warning = transitionRiskGovernance(
      createInitialRiskGovernanceState("PROP"),
      { type: "RISK_WARNING" },
    );
    expect(transitionRiskGovernance(warning, { type: "RISK_RECOVERED" }).discipline)
      .toBe("NORMAL");
  });

  it("locks on a valid breach and sets a twelve-hour server-time window", () => {
    const occurredAtMs = 1_800_000_000_000;
    const locked = transitionRiskGovernance(
      createInitialRiskGovernanceState("PROP"),
      { type: "RISK_BREACH", occurredAtMs },
    );
    expect(locked.discipline).toBe("LOCKED");
    expect(locked.lockoutStartedAtMs).toBe(occurredAtMs);
    expect(locked.lockoutUntilMs).toBe(occurredAtMs + GUARDIAN_LOCKOUT_MS);
  });

  it("rejects invalid breach timestamps", () => {
    const initial = createInitialRiskGovernanceState("REAL");
    expect(transitionRiskGovernance(initial, {
      type: "RISK_BREACH",
      occurredAtMs: Number.NaN,
    })).toBe(initial);
  });

  it("does not restart the lockout when another breach arrives while locked", () => {
    const first = transitionRiskGovernance(
      createInitialRiskGovernanceState("REAL"),
      { type: "RISK_BREACH", occurredAtMs: 1_000 },
    );
    expect(transitionRiskGovernance(first, {
      type: "RISK_BREACH",
      occurredAtMs: 99_000,
    })).toBe(first);
  });

  it("requires the full lockout duration before unlocking", () => {
    const locked = transitionRiskGovernance(
      createInitialRiskGovernanceState("REAL"),
      { type: "RISK_BREACH", occurredAtMs: 10_000 },
    );
    const verified = transitionRiskGovernance(
      transitionRiskGovernance(locked, { type: "HEARTBEAT_LOST" }),
      { type: "HEARTBEAT_RESTORED" },
    );
    const reconciled = transitionRiskGovernance(verified, {
      type: "RECONCILIATION_PASSED",
    });
    expect(transitionRiskGovernance(reconciled, {
      type: "UNLOCK_AFTER_LOCKOUT",
      nowMs: locked.lockoutUntilMs! - 1,
      riskClear: true,
      termsAccepted: true,
    })).toBe(reconciled);
  });

  it("requires verified telemetry, clear risk and accepted terms to unlock", () => {
    const locked = transitionRiskGovernance(
      createInitialRiskGovernanceState("REAL"),
      { type: "RISK_BREACH", occurredAtMs: 10_000 },
    );
    const event = {
      type: "UNLOCK_AFTER_LOCKOUT" as const,
      nowMs: locked.lockoutUntilMs!,
      riskClear: true,
      termsAccepted: true,
    };
    expect(transitionRiskGovernance(locked, event)).toBe(locked);

    const verified = transitionRiskGovernance(
      transitionRiskGovernance(
        transitionRiskGovernance(locked, { type: "HEARTBEAT_LOST" }),
        { type: "HEARTBEAT_RESTORED" },
      ),
      { type: "RECONCILIATION_PASSED" },
    );
    expect(transitionRiskGovernance(verified, { ...event, riskClear: false }))
      .toBe(verified);
    expect(transitionRiskGovernance(verified, { ...event, termsAccepted: false }))
      .toBe(verified);
    expect(transitionRiskGovernance(verified, event).discipline).toBe("NORMAL");
  });

  it("does not unlock while a close remains unconfirmed", () => {
    const locked = transitionRiskGovernance(
      createInitialRiskGovernanceState("REAL"),
      { type: "RISK_BREACH", occurredAtMs: 10_000 },
    );
    const closeUnconfirmed = transitionRiskGovernance(
      transitionRiskGovernance(locked, { type: "CLOSE_REQUESTED" }),
      { type: "CLOSE_FAILED" },
    );
    const verified = transitionRiskGovernance(
      transitionRiskGovernance(
        transitionRiskGovernance(closeUnconfirmed, { type: "HEARTBEAT_LOST" }),
        { type: "HEARTBEAT_RESTORED" },
      ),
      { type: "RECONCILIATION_PASSED" },
    );
    expect(transitionRiskGovernance(verified, {
      type: "UNLOCK_AFTER_LOCKOUT",
      nowMs: locked.lockoutUntilMs!,
      riskClear: true,
      termsAccepted: true,
    })).toBe(verified);
  });

  it("moves lost telemetry to reconciliation instead of declaring it verified", () => {
    const initial = createInitialRiskGovernanceState("REAL");
    const lost = transitionRiskGovernance(initial, { type: "HEARTBEAT_LOST" });
    const restored = transitionRiskGovernance(lost, { type: "HEARTBEAT_RESTORED" });
    expect(lost.telemetry).toBe("LOST");
    expect(restored.telemetry).toBe("RECONCILIATION_REQUIRED");
  });

  it("does not downgrade a pending reconciliation to degraded telemetry", () => {
    const pending = transitionRiskGovernance(
      transitionRiskGovernance(
        createInitialRiskGovernanceState("REAL"),
        { type: "HEARTBEAT_LOST" },
      ),
      { type: "HEARTBEAT_RESTORED" },
    );
    expect(transitionRiskGovernance(pending, {
      type: "HEARTBEAT_DEGRADED",
    })).toBe(pending);
  });

  it("marks failed reconciliation for incident review", () => {
    const restored = transitionRiskGovernance(
      transitionRiskGovernance(
        createInitialRiskGovernanceState("REAL"),
        { type: "HEARTBEAT_LOST" },
      ),
      { type: "HEARTBEAT_RESTORED" },
    );
    expect(transitionRiskGovernance(restored, {
      type: "RECONCILIATION_FAILED",
    }).telemetry).toBe("INCIDENT_REVIEW");
  });

  it("tracks close confirmation separately from the discipline lock", () => {
    const locked = transitionRiskGovernance(
      createInitialRiskGovernanceState("PROP"),
      { type: "RISK_BREACH", occurredAtMs: 10_000 },
    );
    const pending = transitionRiskGovernance(locked, { type: "CLOSE_REQUESTED" });
    const confirmed = transitionRiskGovernance(pending, { type: "CLOSE_CONFIRMED" });
    expect(pending.execution).toBe("CLOSE_PENDING");
    expect(confirmed.execution).toBe("CLOSE_CONFIRMED");
    expect(confirmed.discipline).toBe("LOCKED");
  });

  it("allows a confirmed retry to resolve a previously unconfirmed close", () => {
    const pending = transitionRiskGovernance(
      createInitialRiskGovernanceState("REAL"),
      { type: "CLOSE_REQUESTED" },
    );
    const failed = transitionRiskGovernance(pending, { type: "CLOSE_FAILED" });
    const confirmed = transitionRiskGovernance(failed, { type: "CLOSE_CONFIRMED" });
    expect(failed.execution).toBe("CLOSE_UNCONFIRMED");
    expect(confirmed.execution).toBe("CLOSE_CONFIRMED");
  });

  it("prevents switching REAL/PROP mode during a lockout or without accepted terms", () => {
    const initial = createInitialRiskGovernanceState("REAL");
    expect(transitionRiskGovernance(initial, {
      type: "SET_ACCOUNT_MODE",
      mode: "PROP",
      termsAccepted: false,
    })).toBe(initial);
    const locked = transitionRiskGovernance(initial, {
      type: "RISK_BREACH",
      occurredAtMs: 10_000,
    });
    expect(transitionRiskGovernance(locked, {
      type: "SET_ACCOUNT_MODE",
      mode: "PROP",
      termsAccepted: true,
    })).toBe(locked);
    expect(transitionRiskGovernance(initial, {
      type: "SET_ACCOUNT_MODE",
      mode: "PROP",
      termsAccepted: true,
    }).accountMode).toBe("PROP");
  });
});
