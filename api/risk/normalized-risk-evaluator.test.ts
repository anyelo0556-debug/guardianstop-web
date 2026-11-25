import { describe, expect, it } from "vitest";
import {
  evaluateNormalizedAccountRisk,
  type RealRiskEvaluationInput,
  type PropRiskEvaluationInput,
} from "./normalized-risk-evaluator";

const freshTelemetry = {
  state: "CONNECTED" as const,
  observedAtMs: 1_000,
  nowMs: 2_000,
  maxAgeMs: 5_000,
};

const realInput = (
  overrides: Partial<RealRiskEvaluationInput> = {},
): RealRiskEvaluationInput => ({
  accountMode: "REAL",
  currency: "USD",
  telemetry: freshTelemetry,
  limits: {
    daily: { limit: "100.00", realizedAndFloatingLoss: "20.00" },
    weekly: { limit: "500.00", realizedAndFloatingLoss: "20.00" },
    monthly: { limit: "1000.00", realizedAndFloatingLoss: "20.00" },
  },
  ...overrides,
});

const propInput = (
  overrides: Partial<PropRiskEvaluationInput> = {},
): PropRiskEvaluationInput => ({
  accountMode: "PROP",
  currency: "USD",
  telemetry: freshTelemetry,
  guardianCashLossLimitUsd: "100.00",
  realizedAndFloatingLossUsd: "25.00",
  firmRules: { status: "VERIFIED", remainingCapacityUsd: "750.00" },
  ...overrides,
});

describe("normalized REAL/PROP risk evaluator", () => {
  it("evaluates REAL daily, weekly and monthly budgets independently", () => {
    const result = evaluateNormalizedAccountRisk(realInput({
      limits: {
        daily: { limit: "100.00", realizedAndFloatingLoss: "100.00" },
        weekly: { limit: "500.00", realizedAndFloatingLoss: "499.99" },
        monthly: { limit: "1000.00", realizedAndFloatingLoss: "1000.01" },
      },
    }));

    expect(result.decision).toBe("PROTECT");
    expect(result.triggers).toEqual(["REAL_DAILY_LIMIT", "REAL_MONTHLY_LIMIT"]);
    expect(result.capacities.daily.remaining).toBe("0.00");
    expect(result.capacities.weekly.remaining).toBe("0.01");
    expect(result.capacities.monthly.remaining).toBe("0.00");
  });

  it("allows a REAL account while all configured budgets remain below their limits", () => {
    const result = evaluateNormalizedAccountRisk(realInput());
    expect(result.decision).toBe("ALLOW");
    expect(result.triggers).toEqual([]);
    expect(result.capacities.daily.remaining).toBe("80.00");
  });

  it("adds an independent REAL trailing-stop trigger", () => {
    const result = evaluateNormalizedAccountRisk(realInput({
      trailingStopTriggered: true,
    }));
    expect(result.decision).toBe("PROTECT");
    expect(result.triggers).toContain("REAL_TRAILING_STOP");
  });

  it("uses exact cents at the REAL breach boundary", () => {
    const below = evaluateNormalizedAccountRisk(realInput({
      limits: {
        daily: { limit: "100.00", realizedAndFloatingLoss: "99.99" },
        weekly: { limit: "500.00", realizedAndFloatingLoss: "0.00" },
        monthly: { limit: "1000.00", realizedAndFloatingLoss: "0.00" },
      },
    }));
    expect(below.decision).toBe("ALLOW");
    expect(below.capacities.daily.remaining).toBe("0.01");
  });

  it("requires current telemetry and never evaluates stale snapshots as safe", () => {
    const result = evaluateNormalizedAccountRisk(realInput({
      telemetry: { ...freshTelemetry, nowMs: 10_001 },
      limits: {
        daily: { limit: "100.00", realizedAndFloatingLoss: "100.00" },
        weekly: { limit: "500.00", realizedAndFloatingLoss: "0.00" },
        monthly: { limit: "1000.00", realizedAndFloatingLoss: "0.00" },
      },
    }));
    expect(result.decision).toBe("HOLD_UNVERIFIED");
    expect(result.reason).toBe("TELEMETRY_NOT_VERIFIED");
    expect(result.telemetryFresh).toBe(false);
    expect(result.triggers).toEqual([]);
  });

  it("rejects future timestamps and non-connected telemetry", () => {
    const future = evaluateNormalizedAccountRisk(realInput({
      telemetry: { ...freshTelemetry, observedAtMs: 3_000 },
    }));
    const lost = evaluateNormalizedAccountRisk(realInput({
      telemetry: { ...freshTelemetry, state: "LOST" },
    }));
    expect(future.decision).toBe("HOLD_UNVERIFIED");
    expect(lost.decision).toBe("HOLD_UNVERIFIED");
  });

  it("keeps Guardian Stop's PROP cash limit separate from verified firm capacity", () => {
    const result = evaluateNormalizedAccountRisk(propInput({
      guardianCashLossLimitUsd: "100.00",
      realizedAndFloatingLossUsd: "100.00",
      firmRules: { status: "VERIFIED", remainingCapacityUsd: "500.00" },
    }));
    expect(result.decision).toBe("PROTECT");
    expect(result.triggers).toEqual(["PROP_GUARDIAN_CASH_LIMIT"]);
    expect(result.capacities.guardianStop.remaining).toBe("0.00");
    expect(result.capacities.propFirm.remaining).toBe("500.00");
  });

  it("holds PROP activation when firm rules are missing instead of assuming unlimited capacity", () => {
    const result = evaluateNormalizedAccountRisk(propInput({
      firmRules: { status: "NOT_CONFIGURED" },
    }));
    expect(result.decision).toBe("HOLD_UNVERIFIED");
    expect(result.reason).toBe("PROP_RULESET_NOT_VERIFIED");
    expect(result.triggers).toEqual([]);
  });

  it("still enforces Guardian Stop's own PROP limit when firm rules are unverified", () => {
    const result = evaluateNormalizedAccountRisk(propInput({
      realizedAndFloatingLossUsd: "100.00",
      firmRules: { status: "STALE" },
    }));
    expect(result.decision).toBe("PROTECT");
    expect(result.triggers).toEqual(["PROP_GUARDIAN_CASH_LIMIT"]);
  });

  it("triggers the firm rule when its verified remaining capacity reaches zero", () => {
    const result = evaluateNormalizedAccountRisk(propInput({
      firmRules: { status: "VERIFIED", remainingCapacityUsd: "0.00" },
    }));
    expect(result.decision).toBe("PROTECT");
    expect(result.triggers).toEqual([]);
    expect(result.triggers).toContain("PROP_FIRM_LIMIT");
  });

  it("accepts negative verified firm capacity as an already-breached boundary", () => {
    const result = evaluateNormalizedAccountRisk(propInput({
      firmRules: { status: "VERIFIED", remainingCapacityUsd: "-0.01" },
    }));
    expect(result.triggers).toContain("PROP_FIRM_LIMIT");
    expect(result.capacities.propFirm.remaining).toBe("-0.01");
  });

  it("rejects non-USD PROP accounts and malformed REAL amounts", () => {
    expect(() => evaluateNormalizedAccountRisk(propInput({ currency: "EUR" })))
      .toThrow("requires USD");
    expect(() => evaluateNormalizedAccountRisk(realInput({
      limits: {
        daily: { limit: "0.00", realizedAndFloatingLoss: "0.00" },
        weekly: { limit: "500.00", realizedAndFloatingLoss: "0.00" },
        monthly: { limit: "1000.00", realizedAndFloatingLoss: "0.00" },
      },
    }))).toThrow("greater than zero");
  });
});
