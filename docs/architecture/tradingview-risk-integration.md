# TradingView risk-control integration — technical decision

Status: proposed implementation path for Guardian Stop; not deployed.

## Executive decision

Guardian Stop must not depend on the native TradingView Paper Trading account, browser scraping, DOM automation, undocumented endpoints, or TradingView alerts/webhooks as an execution/risk-control channel.

TradingView's current Terms of Use restrict automated extraction and machine use of its charts, alerts, webhooks, and market data for automated trading, order generation, algorithmic decisions, and risk-management programs. TradingView also states that its alerts are not designed for automated trading. We must obtain written permission before any use outside the documented/licensed interfaces.

The feasible product path is to embed TradingView's licensed Advanced Charts / Trading Platform library inside Guardian Stop (subject to TradingView granting the required license), connect it to a Guardian Stop-owned Broker API, and use a separately licensed market-data feed. This is TradingView charting technology inside Guardian Stop; it is not control of a user's native tradingview.com Paper Trading account.

## Target architecture

- One central Guardian Stop risk engine remains the authority for user-level governance and account-level risk.
- A platform connector is registered per user + broker account + environment. A user lockout is enforced across every linked connector/session, not just the account that triggered it.
- The embedded Trading Platform UI calls Guardian Stop's Broker API for account state, orders, positions, and execution.
- A Guardian Stop paper-execution adapter provides simulated fills, balance, equity, open positions, realized/unrealized PnL, order history, and close-all for test accounts.
- Later, a broker adapter may route orders to an external broker only through that broker's documented API and user-authorized credentials.
- Market data must come from a feed Guardian Stop is licensed to use for this purpose; do not relay TradingView website data into the risk engine.

## Mandatory risk-control flow

1. Authenticate user and resolve their active Guardian Stop license.
2. Resolve all linked platform connectors and accounts.
3. Before accepting any new order, ask the central risk service for authorization.
4. On a breach, atomically persist the lockout before sending any close commands.
5. Reject new orders across all linked connectors while the lock is active.
6. Send close-all to every connected execution adapter; retry safely with idempotency keys.
7. Re-fetch positions from each adapter and mark each account as closed only when absence/closure is confirmed.
8. If an adapter is disconnected or closure cannot be confirmed, show an explicit enforcement-failed/degraded state and keep the user locked. Never report a successful close based only on an order acknowledgement.
9. Reconcile on reconnect before enabling trading.

## Phase 1 and test plan

- Deriv Demo remains the only external broker used for Phase 1 integration tests.
- Build a Guardian Stop paper adapter for internal deterministic multi-user tests; do not label it as native TradingView Paper Trading.
- Simulate 3–4 independent users concurrently, with separate accounts, balances, positions, and credentials.
- Test daily 1/2/3%, weekly 10%, monthly 20%, 12-hour daily lock, weekly/monthly lock escalation, simultaneous breaches, disconnect/reconnect, duplicate close requests, and platform-switch attempts.
- Assert isolation: one user's breach must never close or lock another user's accounts.
- Assert global governance: a user locked on one connector cannot place orders through another connector linked to the same Guardian Stop identity.
- Do not merge or deploy this work to production until tests pass and external licensing/data-feed requirements are resolved.

## TradingView integration choices

A. Native TradingView.com Paper Trading: unsupported for Guardian Stop automated read/close control unless TradingView provides an authorized API/partnership expressly permitting it. Do not reverse-engineer or automate the UI.

B. TradingView Advanced Charts / Trading Platform embedded in Guardian Stop: viable technical direction, subject to license approval. Implement the official Broker API against Guardian Stop's own backend and paper adapter. TradingView's documentation describes broker endpoints for accounts, state, orders, and positions, including position modification/deletion.

C. TradingView website connected to a third-party broker: Guardian Stop can only enforce if the broker exposes a documented API or an approved TradingView broker integration that Guardian Stop is authorized to use. The broker remains the execution authority. Do not assume a TradingView alert/webhook provides a compliant control channel.

## Acceptance criteria before calling TradingView protected

- Guardian Stop can read the account and every open position from its own broker adapter.
- New order authorization is enforced server-side, not merely by disabling UI buttons.
- Lockout is persisted centrally and applies to all linked accounts/connectors for that user.
- Close-all is idempotent, retried, and independently verified.
- A disconnected adapter cannot silently restore trading access.
- The dashboard distinguishes protected, locked, disconnected, and closure-unconfirmed states.
- Legal/licensing review confirms the chosen TradingView product, data feed, and integration permissions.

## References

- TradingView Terms of Use: https://www.tradingview.com/policies/
- TradingView webhook guidance: https://www.tradingview.com/support/solutions/43000722015-using-credentials-for-webhooks/
- TradingView broker integration endpoints: https://github.com/tradingview/rest_integrations_docs/blob/master/source/Endpoints.rst
- TradingView Advanced Charts Broker API tutorial: https://www.tradingview.com/charting-library-docs/latest/tutorials/implement-broker-api/
