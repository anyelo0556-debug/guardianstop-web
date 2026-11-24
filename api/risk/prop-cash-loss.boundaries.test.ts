import { describe, expect, it } from "vitest";
import {
  evaluatePropCashLossLimit,
  validatePropCashLossLimitUsd,
} from "./prop-cash-loss";

describe("PROP cash-loss threshold boundary matrix", () => {
  it.each([
    ["50.00", "0.00", "50.00", "WITHIN_LIMIT"],
    ["50.00", "49.99", "0.01", "WITHIN_LIMIT"],
    ["50.00", "50.00", "0.00", "LIMIT_REACHED"],
    ["50.00", "50.01", "0.00", "LIMIT_REACHED"],
    ["150.00", "149.99", "0.01", "WITHIN_LIMIT"],
    ["150.00", "150.00", "0.00", "LIMIT_REACHED"],
    ["300.00", "299.99", "0.01", "WITHIN_LIMIT"],
    ["300.00", "300.00", "0.00", "LIMIT_REACHED"],
    ["300.00", "425.75", "0.00", "LIMIT_REACHED"],
  ] as const)(
    "limit %s with loss %s returns remaining %s and state %s",
    (configuredLimitUsd, realizedAndFloatingLossUsd, remainingCapacityUsd, state) => {
      expect(evaluatePropCashLossLimit({
        configuredLimitUsd,
        realizedAndFloatingLossUsd,
      })).toMatchObject({ remainingCapacityUsd, state });
    },
  );

  it.each(["49.99", "300.01", "-50.00", "0", "50.001", "1e2", "NaN", ""])(
    "rejects invalid configured limit %s",
    (value) => {
      expect(() => validatePropCashLossLimitUsd(value)).toThrow();
    },
  );

  it.each(["-0.01", "1.001", "Infinity", "NaN", "1e2", ""])(
    "rejects invalid loss input %s",
    (realizedAndFloatingLossUsd) => {
      expect(() => evaluatePropCashLossLimit({
        configuredLimitUsd: "100.00",
        realizedAndFloatingLossUsd,
      })).toThrow();
    },
  );

  it("uses exact cents around the breach boundary without floating-point rounding", () => {
    const below = evaluatePropCashLossLimit({
      configuredLimitUsd: "100.00",
      realizedAndFloatingLossUsd: "99.99",
    });
    const at = evaluatePropCashLossLimit({
      configuredLimitUsd: "100.00",
      realizedAndFloatingLossUsd: "100.00",
    });

    expect(below.remainingCapacityUsd).toBe("0.01");
    expect(below.state).toBe("WITHIN_LIMIT");
    expect(at.remainingCapacityUsd).toBe("0.00");
    expect(at.state).toBe("LIMIT_REACHED");
  });
});
