/**
 * Normalized, fail-closed risk evaluation for REAL and PROP accounts.
 *
 * This module is deterministic and side-effect free. It does not persist state,
 * connect to brokers, or execute orders. Callers must provide broker-authoritative
 * losses and freshness metadata, then persist/audit the result before enforcement.
 */
import type { AccountRiskMode, TelemetryState } from "./governance-state";
import { evaluatePropCashLossLimit } from "./prop-cash-loss";

export type RiskDecision = "ALLOW" | "PROTECT" | "HOLD_UNVERIFIED";

export type RiskTrigger =
  | "REAL_DAILY_LIMIT"
  | "REAL_WEEKLY_LIMIT"
  | "REAL_MONTHLY_LIMIT"
  | "REAL_TRAILING_STOP"
  | "PROP_GUARDIAN_CASH_LIMIT"
  | "PROP_FIRM_LIMIT";

export interface RiskCapacity {
  limitUsdOrAccountCurrency: string | null;
  observedLoss: string | null;
  remaining: string;
}

export interface NormalizedRiskEvaluation {
  accountMode: AccountRiskMode;
  currency: string;
  decision: RiskDecision;
  triggers: RiskTrigger[];
  capacities: Record<string, RiskCapacity>;
  telemetryFresh: boolean;
  reason?: "TELEMETRY_NOT_VERIFIED" | "PROP_RULESET_NOT_VERIFIED";
}

interface TelemetryEvidence {
  state: TelemetryState;
  observedAtMs: number;
  nowMs: number;
  maxAgeMs: number;
}

interface BaseInput {
  currency: string;
  telemetry: TelemetryEvidence;
}

interface RealPeriodLimit {
  limit: string;
  realizedAndFloatingLoss: string;
}

export interface RealRiskEvaluationInput extends BaseInput {
  accountMode: "REAL";
  limits: {
    daily: RealPeriodLimit;
    weekly: RealPeriodLimit;
    monthly: RealPeriodLimit;
  };
  trailingStopTriggered?: boolean;
}

export type PropFirmRuleEvidence =
  | { status: "VERIFIED"; remainingCapacityUsd: string }
  | { status: "NOT_CONFIGURED" | "STALE" };

export interface PropRiskEvaluationInput extends BaseInput {
  accountMode: "PROP";
  guardianCashLossLimitUsd: string;
  realizedAndFloatingLossUsd: string;
  firmRules: PropFirmRuleEvidence;
}

export type NormalizedRiskEvaluationInput =
  | RealRiskEvaluationInput
  | PropRiskEvaluationInput;

function parseCents(value: string, field: string, allowNegative = false): bigint {
  const pattern = allowNegative
    ? /^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/
    : /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${field} must be a decimal amount with up to 2 places`);
  }
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ""] = unsigned.split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return negative && cents !== 0n ? -cents : cents;
}

function formatCents(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, "0")}`;
}

function remaining(limit: bigint, loss: bigint): bigint {
  return limit > loss ? limit - loss : 0n;
}

function hasFreshTelemetry(evidence: TelemetryEvidence): boolean {
  return (
    (evidence.state === "CONNECTED" || evidence.state === "VERIFIED") &&
    Number.isSafeInteger(evidence.observedAtMs) &&
    Number.isSafeInteger(evidence.nowMs) &&
    Number.isSafeInteger(evidence.maxAgeMs) &&
    evidence.observedAtMs >= 0 &&
    evidence.nowMs >= evidence.observedAtMs &&
    evidence.maxAgeMs >= 0 &&
    evidence.nowMs - evidence.observedAtMs <= evidence.maxAgeMs
  );
}

function validateCurrency(currency: string): void {
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("currency must be a three-letter uppercase ISO currency code");
  }
}

/**
 * REAL: evaluate the account's own daily, weekly and monthly cash limits.
 * PROP: evaluate Guardian Stop's fixed USD cash limit separately from the
 * verified firm's remaining loss capacity. Unverified firm rules never become
 * an implicit unlimited allowance.
 */
export function evaluateNormalizedAccountRisk(
  input: NormalizedRiskEvaluationInput,
): NormalizedRiskEvaluation {
  validateCurrency(input.currency);

  if (!hasFreshTelemetry(input.telemetry)) {
    return {
      accountMode: input.accountMode,
      currency: input.currency,
      decision: "HOLD_UNVERIFIED",
      triggers: [],
      capacities: {},
      telemetryFresh: false,
      reason: "TELEMETRY_NOT_VERIFIED",
    };
  }

  if (input.accountMode === "REAL") {
    const periods = [
      ["REAL_DAILY_LIMIT", "daily"],
      ["REAL_WEEKLY_LIMIT", "weekly"],
      ["REAL_MONTHLY_LIMIT", "monthly"],
    ] as const;
    const triggers: RiskTrigger[] = [];
    const capacities: Record<string, RiskCapacity> = {};

    for (const [trigger, period] of periods) {
      const limit = parseCents(input.limits[period].limit, `${period}.limit`);
      const loss = parseCents(
        input.limits[period].realizedAndFloatingLoss,
        `${period}.realizedAndFloatingLoss`,
      );
      if (limit <= 0n) {
        throw new Error(`${period}.limit must be greater than zero`);
      }
      capacities[period] = {
        limitUsdOrAccountCurrency: formatCents(limit),
        observedLoss: formatCents(loss),
        remaining: formatCents(remaining(limit, loss)),
      };
      if (loss >= limit) triggers.push(trigger);
    }

    if (input.trailingStopTriggered) triggers.push("REAL_TRAILING_STOP");

    return {
      accountMode: "REAL",
      currency: input.currency,
      decision: triggers.length > 0 ? "PROTECT" : "ALLOW",
      triggers,
      capacities,
      telemetryFresh: true,
    };
  }

  if (input.currency !== "USD") {
    throw new Error("PROP Guardian Stop cash-loss protection requires USD account currency");
  }

  const guardian = evaluatePropCashLossLimit({
    configuredLimitUsd: input.guardianCashLossLimitUsd,
    realizedAndFloatingLossUsd: input.realizedAndFloatingLossUsd,
  });
  const triggers: RiskTrigger[] = [];
  const capacities: Record<string, RiskCapacity> = {
    guardianStop: {
      limitUsdOrAccountCurrency: guardian.configuredLimitUsd,
      observedLoss: guardian.realizedAndFloatingLossUsd,
      remaining: guardian.remainingCapacityUsd,
    },
  };

  if (guardian.state === "LIMIT_REACHED") {
    triggers.push("PROP_GUARDIAN_CASH_LIMIT");
  }

  if (input.firmRules.status === "VERIFIED") {
    const firmRemaining = parseCents(
      input.firmRules.remainingCapacityUsd,
      "firmRules.remainingCapacityUsd",
      true,
    );
    capacities.propFirm = {
      limitUsdOrAccountCurrency: null,
      observedLoss: null,
      remaining: formatCents(firmRemaining),
    };
    if (firmRemaining <= 0n) triggers.push("PROP_FIRM_LIMIT");
  }

  const firmRulesVerified = input.firmRules.status === "VERIFIED";
  return {
    accountMode: "PROP",
    currency: "USD",
    decision: triggers.length > 0
      ? "PROTECT"
      : firmRulesVerified
        ? "ALLOW"
        : "HOLD_UNVERIFIED",
    triggers,
    capacities,
    telemetryFresh: true,
    ...(!firmRulesVerified ? { reason: "PROP_RULESET_NOT_VERIFIED" as const } : {}),
  };
}
