/**
 * Pure, deterministic Guardian Stop governance transitions.
 *
 * This module deliberately does not persist state or execute broker commands.
 * Callers must persist the returned snapshot and separately authorize execution.
 */
export const GUARDIAN_LOCKOUT_HOURS = 12;
export const GUARDIAN_LOCKOUT_MS = GUARDIAN_LOCKOUT_HOURS * 60 * 60 * 1000;

export type AccountRiskMode = "REAL" | "PROP";
export type DisciplineState = "NORMAL" | "WARNING" | "FRICTION" | "LOCKED";
export type TelemetryState =
  | "CONNECTED"
  | "DEGRADED"
  | "LOST"
  | "RECONCILIATION_REQUIRED"
  | "VERIFIED"
  | "INCIDENT_REVIEW";
export type CloseExecutionState =
  | "IDLE"
  | "CLOSE_PENDING"
  | "CLOSE_CONFIRMED"
  | "CLOSE_UNCONFIRMED";

export interface RiskGovernanceSnapshot {
  accountMode: AccountRiskMode;
  discipline: DisciplineState;
  telemetry: TelemetryState;
  execution: CloseExecutionState;
  lockoutStartedAtMs: number | null;
  lockoutUntilMs: number | null;
}

export type RiskGovernanceEvent =
  | { type: "RISK_WARNING" }
  | { type: "RISK_FRICTION" }
  | { type: "RISK_RECOVERED" }
  | { type: "RISK_BREACH"; occurredAtMs: number }
  | { type: "HEARTBEAT_DEGRADED" }
  | { type: "HEARTBEAT_LOST" }
  | { type: "HEARTBEAT_RESTORED" }
  | { type: "RECONCILIATION_PASSED" }
  | { type: "RECONCILIATION_FAILED" }
  | { type: "CLOSE_REQUESTED" }
  | { type: "CLOSE_CONFIRMED" }
  | { type: "CLOSE_FAILED" }
  | {
      type: "UNLOCK_AFTER_LOCKOUT";
      nowMs: number;
      riskClear: boolean;
      termsAccepted: boolean;
    }
  | { type: "SET_ACCOUNT_MODE"; mode: AccountRiskMode; termsAccepted: boolean };

export function createInitialRiskGovernanceState(
  accountMode: AccountRiskMode,
): RiskGovernanceSnapshot {
  return {
    accountMode,
    discipline: "NORMAL",
    telemetry: "CONNECTED",
    execution: "IDLE",
    lockoutStartedAtMs: null,
    lockoutUntilMs: null,
  };
}

/**
 * Apply one trusted server-side event. Unknown, premature, or unsafe transitions
 * are no-ops; this function never trusts a client-provided target state.
 */
export function transitionRiskGovernance(
  current: RiskGovernanceSnapshot,
  event: RiskGovernanceEvent,
): RiskGovernanceSnapshot {
  switch (event.type) {
    case "RISK_WARNING":
      return current.discipline === "NORMAL"
        ? { ...current, discipline: "WARNING" }
        : current;

    case "RISK_FRICTION":
      return current.discipline === "NORMAL" || current.discipline === "WARNING"
        ? { ...current, discipline: "FRICTION" }
        : current;

    case "RISK_RECOVERED":
      return current.discipline === "WARNING" || current.discipline === "FRICTION"
        ? { ...current, discipline: "NORMAL" }
        : current;

    case "RISK_BREACH": {
      if (!Number.isSafeInteger(event.occurredAtMs) || event.occurredAtMs < 0) {
        return current;
      }
      if (current.discipline === "LOCKED") return current;
      return {
        ...current,
        discipline: "LOCKED",
        lockoutStartedAtMs: event.occurredAtMs,
        lockoutUntilMs: event.occurredAtMs + GUARDIAN_LOCKOUT_MS,
      };
    }

    case "HEARTBEAT_DEGRADED":
      return current.telemetry === "INCIDENT_REVIEW" || current.telemetry === "LOST"
        ? current
        : { ...current, telemetry: "DEGRADED" };

    case "HEARTBEAT_LOST":
      return current.telemetry === "INCIDENT_REVIEW"
        ? current
        : { ...current, telemetry: "LOST" };

    case "HEARTBEAT_RESTORED":
      return current.telemetry === "DEGRADED" || current.telemetry === "LOST"
        ? { ...current, telemetry: "RECONCILIATION_REQUIRED" }
        : current;

    case "RECONCILIATION_PASSED":
      return current.telemetry === "RECONCILIATION_REQUIRED"
        ? { ...current, telemetry: "VERIFIED" }
        : current;

    case "RECONCILIATION_FAILED":
      return current.telemetry === "RECONCILIATION_REQUIRED"
        ? { ...current, telemetry: "INCIDENT_REVIEW" }
        : current;

    case "CLOSE_REQUESTED":
      return current.execution === "CLOSE_CONFIRMED"
        ? current
        : { ...current, execution: "CLOSE_PENDING" };

    case "CLOSE_CONFIRMED":
      return current.execution === "CLOSE_PENDING" ||
        current.execution === "CLOSE_UNCONFIRMED"
        ? { ...current, execution: "CLOSE_CONFIRMED" }
        : current;

    case "CLOSE_FAILED":
      return current.execution === "CLOSE_PENDING"
        ? { ...current, execution: "CLOSE_UNCONFIRMED" }
        : current;

    case "UNLOCK_AFTER_LOCKOUT": {
      const lockoutElapsed =
        current.lockoutUntilMs !== null && event.nowMs >= current.lockoutUntilMs;
      const safeToResume =
        current.telemetry === "VERIFIED" &&
        current.execution !== "CLOSE_UNCONFIRMED" &&
        event.riskClear &&
        event.termsAccepted;
      if (current.discipline !== "LOCKED" || !lockoutElapsed || !safeToResume) {
        return current;
      }
      return {
        ...current,
        discipline: "NORMAL",
        lockoutStartedAtMs: null,
        lockoutUntilMs: null,
      };
    }

    case "SET_ACCOUNT_MODE":
      if (
        current.discipline === "LOCKED" ||
        !event.termsAccepted ||
        current.accountMode === event.mode
      ) {
        return current;
      }
      return { ...current, accountMode: event.mode };
  }
}
