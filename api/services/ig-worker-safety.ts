/**
 * Fail-closed gate for the legacy IG polling worker.
 *
 * The current IG adapter exposes open-position floating P/L only; it does not
 * provide verified realized daily/weekly/monthly loss windows. The normalized
 * REAL/PROP evaluator is also not yet wired to persistent governance. Until
 * both are completed and validated, live-account polling must remain disabled.
 */
export const LIVE_IG_WORKER_ENABLE_FLAG = "GUARDIAN_ALLOW_LIVE_IG_WORKER";
export const LIVE_IG_GOVERNANCE_READY_FLAG = "GUARDIAN_LIVE_RISK_GOVERNANCE_READY";

export function isIGAccountPollingAllowed(
  isDemo: boolean,
  environment: Record<string, string | undefined>,
): boolean {
  if (isDemo) return true;

  return (
    environment[LIVE_IG_WORKER_ENABLE_FLAG] === "true" &&
    environment[LIVE_IG_GOVERNANCE_READY_FLAG] === "true"
  );
}
