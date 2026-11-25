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

## New implementation direction: Guardian Stop Execution Gateway without a broker REST API

Preferred experiment for brokers that support MetaTrader 5 but do not offer a public trading API. It uses the broker's supported MT5 terminal protocol; it does not intercept TradingView traffic.

### Core idea

Keep TradingView as the charting/research surface. All protected order entry goes through a Guardian Stop order ticket (web/mobile) and a Guardian Stop execution gateway. The gateway routes orders to a user-authorized MetaTrader 5 terminal using the official MT5 terminal integration (Python package or an explicitly installed EA bridge). The broker receives ordinary orders from its supported MT5 terminal; no separate broker REST API partnership is assumed.

The user must not place orders through TradingView's native broker panel for an account claimed to be fully protected, because those orders bypass the Guardian Stop gateway. TradingView can remain open on desktop, browser, or phone for charts, while protected Buy/Sell/Close controls are provided by Guardian Stop.

### Execution topologies

1. **Local execution (first prototype):**
   - MT5 terminal is installed and logged in by the user.
   - Guardian Stop Companion attaches through the official MT5 Python integration / an explicitly installed EA bridge.
   - Guardian Stop mobile/web order ticket submits an order intent to the cloud.
   - Cloud validates license, account lockout, risk authorization, and idempotency key.
   - Companion fetches authorized intents over an authenticated outbound channel and executes them through the logged-in MT5 terminal.
   - If the PC/terminal is offline, Guardian Stop rejects new protected orders and shows the account as unavailable. It must never queue an entry to execute later without fresh risk authorization.

2. **Cloud terminal (later, opt-in):**
   - A dedicated Windows VPS/VM runs the broker's supported MT5 terminal for that user/account.
   - The user explicitly authorizes the account login to that terminal; credentials are encrypted and access-controlled.
   - The terminal is the execution adapter; no broker REST API is required, but broker terms, simultaneous-session rules, and VPS policy must be checked.
   - This enables mobile order entry even when the user's PC is off.
   - It does not prevent orders placed through a separate direct broker/TradingView session. Preventing that bypass still requires exclusive account access, broker-side restrictions, or the user's agreement to use only the Guardian Stop route.

### Mobile flow

- TradingView mobile remains the charting surface.
- Guardian Stop mobile web/app is the order ticket.
- User enters symbol, side, quantity, order type, and optional SL/TP in Guardian Stop.
- Guardian Stop validates the request centrally and routes it through the registered MT5 terminal.
- The app reports broker acknowledgement and reconciles the resulting position/order from MT5.
- On lockout, cloud rejects new order intents before they reach MT5 and sends close/cancel commands through the terminal adapter.
- If the user manually trades from TradingView's native broker panel or broker app, that route is outside the gateway and cannot be technically blocked without broker-level account controls.

### Why not proxy or intercept TradingView?

- TradingView content, alerts, webhooks, and market data have display-only restrictions and prohibitions on automated/non-display risk-management and order-generation uses in its current Terms of Use.
- HTTPS/TLS interception, DOM injection, browser automation, reverse engineering, or undocumented endpoint use is brittle, bypassable, and can violate platform terms. Do not build these as an enforcement path.
- DNS/proxy blocking cannot distinguish trading orders from chart traffic and does not stop a user on another device/network.

### Security and consistency requirements

- Every order intent is authenticated, bound to user_id + account_id + connector_id, expires quickly, and carries an idempotency key.
- Central risk authorization is checked at execution time, not only when the mobile ticket is opened.
- Companion accepts only signed, short-lived commands from Guardian Stop; it cannot invent or replay orders.
- If cloud lockout is active, local adapter rejects all entry intents and only permits authorized liquidation/cancel actions.
- After reconnect, reconcile broker positions/orders before re-enabling entry.
- A close acknowledgement is not a confirmed close; verify via a fresh positions query.
- Distinguish PROTECTED, LOCKED, OFFLINE, BYPASS_POSSIBLE, and CLOSE_UNCONFIRMED.
- Never claim a native TradingView account or direct broker session is protected if it can bypass the Guardian Stop gateway.

### Honest product promise

Guardian Stop can guarantee its own order ticket will not submit new entries after lockout and can close positions visible through its authorized MT5 terminal adapter, subject to broker execution and connectivity. It cannot prevent the same user from placing separate orders directly in TradingView, the broker's website, or a phone app unless the broker provides account-level controls or the account is operationally restricted to the Guardian Stop execution path.

### Staged validation

- Phase 1: Deriv Demo remains the current external test broker; test central risk engine and close verification.
- Phase 2: Build an MT5 execution adapter against a demo terminal and a simulated mobile/web order ticket. No real accounts.
- Phase 3: Test local terminal topology with PC online/offline, TradingView open/closed, browser changes, and phone order submissions through Guardian Stop.
- Phase 4: Test cloud MT5 terminal feasibility, broker concurrent-session policy, credential storage, reconnect, and isolation for 3–4 users.
- Phase 5: Decide whether direct TradingView broker-panel use is unsupported/unprotected, or pursue a broker/TradingView partnership for native order-panel integration.

## Official technical references

- MetaTrader 5 Python integration: https://www.mql5.com/en/docs/python_metatrader5
- MetaTrader 5 order_send: https://www.mql5.com/en/docs/python_metatrader5/mt5ordersend_py
- MetaTrader 5 positions_get: https://www.mql5.com/en/docs/python_metatrader5/mt5positionsget_py
- TradingView terms: https://www.tradingview.com/policies/
- TradingView broker integration endpoints: https://github.com/tradingview/rest_integrations_docs/blob/master/source/Endpoints.rst
- NinjaTrader cross-platform account-level risk settings: https://support.ninjatrader.com/s/article/Risk-Settings?language=en_US
