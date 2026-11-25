/**
 * Fixed cash loss protection for prop-firm evaluations.
 *
 * This is Guardian Stop's own protective limit, denominated in USD.
 * It is deliberately not a percentage of nominal account size.
 */
export const PROP_CASH_LOSS_MIN_USD = "50.00";
export const PROP_CASH_LOSS_MAX_USD = "300.00";

export type PropCashLossState = "WITHIN_LIMIT" | "LIMIT_REACHED";

export interface PropCashLossEvaluation {
  configuredLimitUsd: string;
  realizedAndFloatingLossUsd: string;
  remainingCapacityUsd: string;
  utilizationBps: number;
  state: PropCashLossState;
}

function toCents(value: string, field: string): bigint {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) {
    throw new Error(`${field} must be a non-negative USD amount with up to 2 decimals`);
  }
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function fromCents(value: bigint): string {
  const whole = value / 100n;
  const fraction = (value % 100n).toString().padStart(2, "0");
  return `${whole}.${fraction}`;
}

/** Validate the user's configured hard loss limit: $50.00 through $300.00. */
export function validatePropCashLossLimitUsd(value: string): string {
  const cents = toCents(value, "configuredLimitUsd");
  if (cents < toCents(PROP_CASH_LOSS_MIN_USD, "minimum") ||
      cents > toCents(PROP_CASH_LOSS_MAX_USD, "maximum")) {
    throw new Error("Prop-firm cash loss limit must be between $50.00 and $300.00 USD");
  }
  return fromCents(cents);
}

/**
 * Evaluate cumulative account loss as a positive USD amount.
 * The caller must supply the authoritative loss figure, including floating
 * P/L and fees according to the selected account's verified policy.
 */
export function evaluatePropCashLossLimit(input: {
  configuredLimitUsd: string;
  realizedAndFloatingLossUsd: string;
}): PropCashLossEvaluation {
  const limit = toCents(
    validatePropCashLossLimitUsd(input.configuredLimitUsd),
    "configuredLimitUsd",
  );
  const loss = toCents(input.realizedAndFloatingLossUsd, "realizedAndFloatingLossUsd");
  const remaining = loss >= limit ? 0n : limit - loss;
  const utilizationBps = Number((loss * 10_000n) / limit);

  return {
    configuredLimitUsd: fromCents(limit),
    realizedAndFloatingLossUsd: fromCents(loss),
    remainingCapacityUsd: fromCents(remaining),
    utilizationBps,
    state: loss >= limit ? "LIMIT_REACHED" : "WITHIN_LIMIT",
  };
}
