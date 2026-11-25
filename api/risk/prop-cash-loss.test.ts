import { describe, expect, it } from "vitest";
import {
  evaluatePropCashLossLimit,
  validatePropCashLossLimitUsd,
} from "./prop-cash-loss";

describe("prop cash loss limit", () => {
  it("accepts the inclusive USD boundaries", () => {
    expect(validatePropCashLossLimitUsd("50")).toBe("50.00");
    expect(validatePropCashLossLimitUsd("300.00")).toBe("300.00");
  });

  it("rejects percentage-like, below-minimum and above-maximum values", () => {
    expect(() => validatePropCashLossLimitUsd("49.99")).toThrow();
    expect(() => validatePropCashLossLimitUsd("300.01")).toThrow();
    expect(() => validatePropCashLossLimitUsd("5%")).toThrow();
    expect(() => validatePropCashLossLimitUsd("-50")).toThrow();
  });

  it("calculates remaining capacity using exact cents", () => {
    expect(evaluatePropCashLossLimit({
      configuredLimitUsd: "100",
      realizedAndFloatingLossUsd: "37.45",
    })).toEqual({
      configuredLimitUsd: "100.00",
      realizedAndFloatingLossUsd: "37.45",
      remainingCapacityUsd: "62.55",
      utilizationBps: 3745,
      state: "WITHIN_LIMIT",
    });
  });

  it("triggers at the exact configured cash limit", () => {
    expect(evaluatePropCashLossLimit({
      configuredLimitUsd: "75.00",
      realizedAndFloatingLossUsd: "75.00",
    })).toMatchObject({
      remainingCapacityUsd: "0.00",
      state: "LIMIT_REACHED",
    });
  });

  it("stays triggered above the configured cash limit", () => {
    expect(evaluatePropCashLossLimit({
      configuredLimitUsd: "50",
      realizedAndFloatingLossUsd: "53.21",
    })).toMatchObject({
      remainingCapacityUsd: "0.00",
      state: "LIMIT_REACHED",
    });
  });
});
