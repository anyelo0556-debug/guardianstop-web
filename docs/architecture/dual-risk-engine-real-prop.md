# Guardian Stop Dual Risk Engine — Real + Prop Accounts

Status: Phase A partially implemented in the development branch; end-to-end enforcement is not certified.

Implemented pure components:
- `api/risk/prop-cash-loss.ts`: fixed USD $50–$300 PROP cash-loss calculator using integer cents.
- `api/risk/normalized-risk-evaluator.ts`: deterministic REAL period limits and separate PROP Guardian Stop / verified-firm capacity evaluation; stale telemetry and unverified firm rules fail closed.
- `api/risk/governance-state.ts`: deterministic discipline, telemetry, close-confirmation and 12-hour lockout transitions.
- `api/lib/credential-vault.ts`: shared AES-256-GCM credential encryption/decryption, with legacy plaintext read compatibility during migration.
- `api/services/IGPollingWorker.ts`: loads per-account encrypted IG credentials and re-reads broker positions after close requests; unconfirmed closes are alerted and retried while the worker process remains running.

Not yet integrated or certified:
- The normalized evaluator and governance state machine are not yet wired into the persistent account/risk request path or TiDB ledger.
- The legacy `api/services/RiskEngine.ts` still contains simulated broker observations and a close routine whose broker call is a TODO; it must not be treated as a live execution adapter.
- The IG worker is started through an administrator endpoint, not automatically at server boot. It has not been exercised against an IG demo account in this development run.
- The current IG worker still needs broker-history reconciliation, a timezone-aware daily baseline, durable close-pending recovery across process restarts, and end-to-end tests.
- No MT5 Companion, TradingView execution gateway, or Prop Firm ruleset catalogue is certified.

All changes above are development-branch code only. No production database migration or deployment has been performed.
Scope: one risk authority for broker-funded accounts and proprietary trading firm accounts.
Safety: this document does not authorize production changes, migrations, live trading, or automated actions against third-party accounts.

## 1. Decision

**Guardian Stop prop-evaluation protection uses a fixed USD cash-loss limit, not a percentage.** The trader selects an amount from **$50.00 USD (minimum) to $300.00 USD (maximum)**. The server validates this range and the risk engine triggers the configured lock when the authoritative cumulative loss reaches or exceeds it. This is Guardian Stop's own protective threshold; it must not be silently replaced with a percentage of nominal account size. The implementation uses integer cents for exact money comparisons. The initial pure calculator is in `api/risk/prop-cash-loss.ts` with tests in `api/risk/prop-cash-loss.test.ts`.

Official prop-firm rules remain a separate compliance layer: where a firm imposes additional conditions, Guardian Stop must disclose and monitor those rules accurately. The fixed $50–$300 Guardian Stop limit does not waive or rewrite a firm's contractual limits.


Guardian Stop will expose two account modes over one normalized risk engine:

- REAL: user-owned broker account; rules derive from account configuration and broker/account constraints.
- PROP: evaluation or funded account; rules derive from a versioned prop-firm program profile and verified account telemetry.

The risk engine remains broker/platform independent. Platform adapters normalize observations and execution capabilities. A Prop Rules Engine calculates firm-specific thresholds and lockout semantics.

Do not assume that a nominal $100k prop account has $100k of loss capacity. Risk must be calculated from the firm's verified drawdown boundary and its reset/trailing rules.

## 2. Normalized account model

Each connected account must carry:

- owner_id, broker_id, platform_id, external_account_id (encrypted or tokenized at rest where appropriate)
- account_mode: REAL | PROP_EVALUATION | PROP_FUNDED | SIMULATION
- firm_id, program_id, phase_id, ruleset_id, ruleset_version (nullable for REAL)
- currency, initial_balance, current_balance, current_equity
- drawdown_model: STATIC | TRAILING_INTRADAY | TRAILING_EOD | DAILY_RESET | FIRM_CUSTOM
- max_loss_amount, daily_loss_amount, trailing_floor, high_water_mark, reset_timezone
- telemetry_source, observed_at, source_sequence, confidence, freshness_state
- execution_capabilities: READ_POSITIONS, PLACE_CLOSE, CANCEL_ORDERS, SET_RISK_LIMITS
- enforcement_scope: API_ACCOUNT | TERMINAL_SESSION | LOCAL_UI_ONLY | TELEMETRY_ONLY

Unknown firm rules or stale/ambiguous telemetry must never be silently converted into a permissive default. Account state becomes DEGRADED / UNVERIFIED until reconciled.

## 3. Risk calculation

Compute remaining loss capacity from the verified rule boundary, not nominal buying power:

- static: floor = initial_balance - max_loss_amount
- trailing intraday: floor follows the firm's specified high-water-mark formula and update timing
- trailing EOD: floor changes only at the firm's defined end-of-day event
- daily: reset using the firm's timezone and reset convention

All rules must explicitly define whether they use balance, equity, realized PnL, floating PnL, commissions, fees, swaps, deposits, withdrawals, open-position valuation and liquidation slippage. Do not assume that all firms treat these items identically.

The evaluator returns: remaining_capacity, utilization_pct, breach_state, projected_breach, rule_explanation, data_quality, and calculation_version. Use decimal arithmetic for money; persist the inputs and output used for every decision.

## 4. Adapter architecture

Implement independent adapters behind a normalized contract:

- MetaTrader 5 terminal adapter (official terminal integration, visible and consent-based)
- cTrader Open API adapter
- Tradovate REST + WebSocket adapter
- ProjectX API adapter
- NinjaTrader adapter only after supported official integration and permission review
- Other broker/firm adapters only after legal-entity, program, jurisdiction, account-type and execution tests.

An adapter declares capabilities individually. Authentication/telemetry access does not imply permission or ability to close positions. Do not use scraping, undocumented endpoints, TLS interception, reverse engineering, credential harvesting, or unauthorized UI automation.

TradingView is a charting/front-end surface, not a universal account-control API. For accounts traded through TradingView, integrate the underlying broker or gateway API when officially supported and authorized. Do not use OCR/screen scraping or TradingView alerts/webhooks/market data for automated risk decisions or order generation without explicit applicable authorization.

## 5. Enforcement truth model

- API_ACCOUNT: server-side account-wide enforcement only where the broker/platform exposes authorized account-level controls.
- TERMINAL_SESSION: local terminal control affects that connected terminal/session; it does not prove other devices or sessions are blocked.
- LOCAL_UI_ONLY: visible local warning/overlay and best-effort input guard. This is not a security boundary and cannot guarantee broker-level prevention.
- TELEMETRY_ONLY: observe and alert; no close capability.

Never claim mobile protection or account-wide lockdown unless the adapter proves it with account-level API enforcement and tests. A local Windows hook or overlay is defense-in-depth only; users can terminate, bypass, or use another device/session. Do not deploy invisible persistence, rootkit-like controls, or global input suppression.

## 6. Heartbeat and outage state machine

Agent sends authenticated heartbeat with device identity, monotonic sequence, timestamp, account binding, agent version and signed telemetry status. Cloud uses leases and explicit freshness states:

CONNECTED -> DEGRADED -> LOST -> RECONCILIATION_REQUIRED -> VERIFIED or INCIDENT_REVIEW.

A missed heartbeat is evidence of lost telemetry, not proof of sabotage or proof that trading occurred. During LOCKDOWN, record the outage, alert, and mark coverage unavailable. On reconnect, reconcile broker-authoritative balances, positions, orders and fills before changing certification. Close newly discovered positions only if account-level execution is authorized and the user's active policy permits it. Preserve audit evidence; do not label a user as malicious solely due to power/network failure.

## 7. Local Companion

The Companion is visible, consent-based and least-privilege. It may:
- detect installed/running supported trading applications and report platform presence;
- monitor its own process health and connectivity;
- display lock state, warnings and audit events;
- invoke documented terminal APIs or supported platform commands;
- apply a reversible, app-scoped overlay as a deterrent.

It must not globally suppress Windows input, install hidden hooks/persistence, prevent uninstall, or represent a UI overlay as an account lock. Platform keyboard shortcuts are not a universal close protocol and must not be assumed safe or stable. Every close must be verified from authoritative account/position telemetry.

## 8. Event flow

Normal:
1. Adapter authenticates with approved scope.
2. Adapter streams/polls account state and normalizes observations.
3. Risk engine applies versioned REAL or PROP rules.
4. Ledger stores source event, calculation inputs and state transition.
5. Dashboard displays coverage and data freshness.

Threshold:
1. Risk engine records breach intent with idempotency key.
2. Policy engine checks adapter execution capabilities and authorization.
3. Adapter cancels eligible pending orders and requests position closes.
4. Adapter re-reads account state and confirms zero positions / residual orders.
5. If not confirmed, enter CLOSE_UNCONFIRMED, retry under bounded policy and alert.

Mobile or alternate session:
- API_ACCOUNT: account-level event stream observes new positions and can close them if authorized.
- TERMINAL_SESSION / LOCAL_UI_ONLY: mobile or another terminal may be invisible. Show coverage limitation; do not claim instant detection.

PC shutdown:
1. Heartbeat lease expires -> LOST / DEGRADED, not automatic sabotage.
2. Alert user and preserve last verified snapshot.
3. If API_ACCOUNT adapter remains online, continue account monitoring independently of PC.
4. On reconnect, reconcile authoritative history and positions, then restore verification or open incident review.

## 9. Security controls and trader agreement

- The trader must accept the current Terms and Conditions before protection is activated. Store user/account identity, document version, acceptance timestamp, and the relevant consent/audit evidence. Re-acceptance is required when a material version change requires it.
- Required protection settings must be server-enforced. A client-side toggle or modified request must not bypass a mandatory lock or lower/disable a required control.
- Lock reasons, policy version, trigger measurements, adapter capability and execution result must be recorded in an immutable audit trail.
- Terms acceptance is not a substitute for clear disclosure: show the trader what Guardian Stop can actually enforce for that platform/session and what remains outside its control.


- OAuth state is cryptographically random, stored server-side, single-use, short-lived and bound to user/session.
- Tokens encrypted with authenticated encryption and envelope versioning; keys held in secret manager, separate from DB.
- Per-user/account authorization on every read/write; least-privilege scopes.
- Signed agent requests, replay protection, monotonic sequence, key rotation and device revocation.
- Idempotent close/cancel commands, durable command outbox, execution ledger, broker response plus post-action verification.
- Rate limits, audit trails, alerting, secrets redaction and no credentials in logs.
- Separate sandbox/test tenant and demo accounts; no production migration/deploy until explicitly approved.

## 10. Rollout plan

Phase A: rules schema, normalized account model, deterministic Prop Rules Engine and unit tests.
Phase B: adapter capability registry and Tradovate/ProjectX technical proof-of-concept in approved demo environments.
Phase C: MT5 and cTrader account-level reconciliation and verified execution tests.
Phase D: visible Companion heartbeat and outage/reconciliation state machine.
Phase E: prop-firm program catalogue, legal/technical compatibility verification, user-facing coverage labels.
Phase F: multi-account concurrency, chaos testing, security review and release gates.

Release gate: no firm/platform advertised as "protected" until its exact legal entity, program, account type, API permissions, mobile/alternate-session coverage, drawdown semantics and close verification are documented and tested.
