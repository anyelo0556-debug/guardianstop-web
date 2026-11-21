# Guardian Stop — multibroker connector registry

Status: architecture proposal and research baseline. Not deployed; no production credentials, database migrations, or live trading actions.

## Product decision

Guardian Stop is multibroker by design. The central risk engine must not depend on a specific broker, terminal, trading platform, or execution protocol.

A broker is not considered compatible merely because it appears in a platform directory or because a user can connect it to TradingView. Compatibility must be verified for the exact broker entity, account type, server/environment, permissions, and execution path.

## Three separate dimensions

1. **Trading interface**: MT5 Desktop, TradingView Desktop/Web/Mobile, cTrader, or another platform.
2. **Account/execution infrastructure**: MT5 trade server, cTrader backend, broker REST/FIX API, or another documented execution service.
3. **Guardian Stop connector**: the authorized adapter that reads account state and, where permission exists, sends and verifies close/cancel commands.

TradingView is an interface, not a universal account backend. When a user operates through TradingView, the connector must target the broker/account infrastructure behind the TradingView connection. Native TradingView Paper Trading is a separate simulator and is not assumed to expose a supported external account-control API.

## Connector architecture

The risk engine consumes a normalized internal contract. Broker-specific adapters implement that contract.

### Normalized connector contract

- `connect(user_id, account_ref, environment)`
- `get_account_snapshot(account_ref)`
- `list_positions(account_ref)`
- `list_pending_orders(account_ref)`
- `subscribe_account_events(account_ref)`
- `close_position(account_ref, position_ref, idempotency_key)`
- `close_all_positions(account_ref, idempotency_key)`
- `cancel_order(account_ref, order_ref, idempotency_key)`
- `cancel_all_pending_orders(account_ref, idempotency_key)`
- `reconcile(account_ref)`
- `disconnect(account_ref)`

All connector outputs must be normalized into Guardian Stop's canonical account, position, order, deal, and execution models. Preserve original broker IDs and raw event references for audit/reconciliation. Use decimal-safe monetary types; never use binary floating point for financial ledger values.

### Canonical account identity

Use a Guardian Stop generated internal UUID for each linked account. Store broker-provided identifiers separately:

- broker_id
- broker_legal_entity / jurisdiction (when known)
- platform / execution_infrastructure
- account_id at broker/platform (encrypted or access-controlled; masked in UI)
- server/environment name
- demo/live
- account currency
- connector_id and connector_version
- authorized scopes
- authorization status and expiry
- last successful snapshot / heartbeat
- last reconciliation result

Do not use a browser ID, TradingView username, editable account label, or device fingerprint as the broker account identity.

## Initial connector families

### 1. MetaTrader 5 terminal adapter

Existing Guardian Stop direction: user-authorized MT5 terminal on PC and/or dedicated cloud MT5 terminal. The terminal adapter reads positions and submits authorized close/cancel commands through the supported MT5 terminal integration. A terminal session is not proof that every other direct broker session is blocked.

### 2. cTrader Open API adapter

Research status: documented API capability; Guardian Stop application registration and end-to-end demo tests still required.

Official cTrader documentation states:
- Open API is available to users with a cTrader ID and, by default, supports trading accounts of cTrader-affiliated brokers.
- It supports account information and historical/current/pending trading operations, including orders, deals, and positions.
- It supports demo and live accounts.
- OAuth 2.0 account authorization has read-only `accounts` scope and full `trading` scope. Trading scope must only be requested when the user explicitly authorizes order management/closing.
- Each user generally needs one connection per environment (demo and live); the docs recommend keeping a heartbeat every 10 seconds and using a message queue.
- Published rate limits: 50 requests/second/connection for non-historical requests and 5 requests/second/connection for historical requests.

Implementation requirements:
- Register Guardian Stop as an Open API application with Spotware and configure production redirect URIs.
- Start with demo accounts and read-only authorization for account discovery/compatibility tests.
- Request trading scope only for users who explicitly enable execution/close protection and after clear permission disclosure.
- Exchange short-lived authorization codes server-side; encrypt refresh/access tokens at rest, restrict access, rotate/revoke when possible, and never log secrets.
- Maintain per-account subscription/state and reconnect/reconcile after disconnect.
- Treat each broker legal entity and account as a separate compatibility target even if the brand is listed in cTrader directory.
- Test TradingView-connected account parity: open a demo position in TradingView, confirm it appears through cTrader Open API, close it through the API, and verify the close in TradingView and cTrader. Repeat from TradingView mobile while cloud monitoring remains active.

### 3. Broker-native API adapters

For brokers without MT5 or cTrader support, implement only against documented and authorized broker APIs (REST, FIX, or another supported interface). Do not scrape broker portals or use undocumented private endpoints. Each API requires its own legal, permission, credential, rate-limit, and execution review.

### 4. TradingView-only users

If the user has no MT5 connection and the broker account behind TradingView is not available through a supported connector, Guardian Stop cannot honestly claim account-level protection. Options are:
- supported cTrader Open API connector when the actual account is cTrader-backed;
- documented broker API connector;
- Guardian Stop-owned order ticket/execution path, where an authorized execution adapter exists;
- otherwise mark the account unsupported / protection unavailable.

Do not treat TradingView UI scraping, browser cookies, local storage, DOM automation, TLS interception, or undocumented TradingView endpoints as a connector.

## Compatibility registry data model

Suggested logical tables (adapt names to existing schema conventions before migration):

### broker_catalog
- id (UUID)
- canonical_name
- brand_names (JSON or normalized alias table)
- website
- public_directory_source
- market_segment
- created_at / updated_at

### broker_entities
- id (UUID)
- broker_id
- legal_name
- regulator / license reference (nullable)
- jurisdiction
- supported_countries (maintained evidence, not guessed)
- entity_source_url
- verified_at
- verification_status

### broker_platform_support
- id (UUID)
- broker_entity_id
- platform_name (MT5, cTrader, TradingView integration, proprietary, other)
- execution_infrastructure (MT5 server, cTrader backend, REST, FIX, unknown)
- account_types (demo/live/other)
- server_names (JSON, only after verification)
- public_evidence_url
- evidence_date
- status (listed, user-reported, vendor-confirmed, demo-tested, production-verified, unavailable, unknown)

### connector_catalog
- id (UUID)
- connector_key (MT5_TERMINAL, CTRADER_OPEN_API, BROKER_REST_...)
- protocol
- adapter_version
- required_scopes
- status
- documentation_url

### compatibility_tests
- id (UUID)
- broker_entity_id
- platform_support_id
- connector_id
- test_environment (demo/live)
- test_case (auth, account_read, positions_read, event_stream, close_position, close_all, cancel_orders, mobile_parity, reconnect, reconciliation)
- result (pass/fail/blocked/not_tested)
- evidence_ref
- tested_at
- tester / build_version

### user_broker_accounts
- id (UUID)
- user_id
- broker_entity_id
- connector_id
- external_account_ref (encrypted or protected; masked in UI)
- server_name
- environment
- currency
- granted_scopes
- token_secret_ref (vault/KMS reference; never raw token in logs)
- authorization_status
- protection_status
- last_event_at
- last_reconciled_at

Do not create/migrate these tables until the existing TiDB schema and Drizzle conventions are inspected and the migration is separately approved.

## Compatibility status model

- DISCOVERED: broker/platform found in a public directory or source.
- USER_REPORTED: user says they use it; not independently verified.
- VENDOR_CONFIRMED: platform/API provider confirms support.
- DEMO_READ_VERIFIED: Guardian Stop read account and positions on demo.
- DEMO_EXECUTION_VERIFIED: Guardian Stop closed/cancelled on demo and reconciled result.
- MOBILE_PARITY_VERIFIED: operation opened from mobile is visible and controllable through cloud connector.
- PRODUCTION_VERIFIED: controlled production pilot passed, permissions and operational review completed.
- UNSUPPORTED: no authorized connector for the specific account.
- DEGRADED: connector cannot guarantee fresh state or execution confirmation.

Only DEMO_EXECUTION_VERIFIED or a later status can qualify for a controlled protection pilot. The user interface must not display PROTECTED based solely on directory presence, OAuth success, browser identity, or a successful read-only snapshot.

## Broker discovery and prioritization

Maintain two independent scores; do not combine popularity with compatibility.

### Market-demand score
Use public and dated evidence such as:
- active retail clients (not total registered accounts unless clearly labelled);
- new funded/active clients;
- retail trading activity/volume;
- geographic distribution relevant to Guardian Stop's target markets;
- Guardian Stop's own opt-in broker/platform selections and connected-account counts.

Do not infer broker customer counts from cTrader directory review counts. Do not treat accounts as unique people. Do not add incompatible measures into a single market-share percentage.

### Technical-coverage score
- exact broker legal entity and region confirmed;
- account type and server confirmed;
- documented API or supported terminal available;
- OAuth/scope model approved;
- positions and pending orders readable;
- live event stream stable;
- close and cancel operations successful;
- mobile-originated order parity confirmed;
- disconnect/reconnect and reconciliation tested.

Prioritize connectors that combine high observed Guardian Stop demand with strong technical feasibility.

## First research baseline (21 Nov 2026)

### cTrader directory

The public cTrader broker directory is dynamic and region-filtered. It currently shows examples including IC, Pepperstone, Fusion Markets, FxPro, BlackBull, FP Markets, Errante, GO Markets, FIBO, Tradeview Markets, Purple Trading, Blueberry, Axiory, and others. The same directory can return different broker availability by country; therefore a global brand list is not proof that a specific user can open a cTrader account with that brand in their jurisdiction.

Directory status only means DISCOVERED. It is not regulatory endorsement, user-count ranking, nor demo execution verification.

### Public retail client data example

XTB's 2025 annual report reports 2,164,835 total clients and 1,189,397 active clients at 31 Dec 2025, plus 864,278 new clients during 2025. These figures are useful as a dated public market-demand signal, but XTB is not thereby classified as cTrader-compatible. It must be investigated separately for its actual platform/API routes and jurisdiction-specific entities.

### Market size example

Finance Magnates Intelligence reported 7.42 million active accounts in Q1 2026 across the brokers in its coverage. This is an aggregate of accounts in a defined coverage set, not the total global number of unique retail traders and not a broker-by-broker ranking.

## Immediate execution plan

1. Create and register the Guardian Stop cTrader Open API application with Spotware. Do not use production credentials in development.
2. Implement a minimal read-only cTrader adapter in a separate development branch: OAuth accounts scope, list authorized accounts, fetch account snapshot, fetch open positions and pending orders.
3. Add a demo-only event-stream and reconciliation test.
4. After read tests pass, request trading scope in a separate explicit user authorization and implement one-position close + verification in demo.
5. Test a Deriv cTrader demo account connected to TradingView: position opened from TradingView must appear through cTrader Open API; API close must be reflected in TradingView.
6. Build a cTrader broker directory import/manual review workflow with jurisdiction and source evidence. Never mark entries as compatible based on directory presence alone.
7. Inspect current TiDB/Drizzle schema before proposing a migration for the registry.
8. Keep existing production branch, Render deployment, database, and secrets unchanged until the user separately approves those actions.

## Official references

- cTrader Open API overview: https://help.ctrader.com/open-api/
- cTrader broker directory: https://ctrader.com/brokers
- cTrader account authentication / OAuth scopes: https://help.ctrader.com/open-api/account-authentication/
- cTrader connection, heartbeat and per-environment connection guidance: https://help.ctrader.com/open-api/connection/
- XTB 2025 annual report: https://ir.xtb.com/wp-content/uploads/2026/03/XTB_SA_Consolidated_Annual_Report_2025-ENG.pdf
- Finance Magnates Intelligence Q1 2026 active accounts report: https://www.financemagnates.com/forex/forex-brokers-reported-742-million-active-accounts-in-q1-2026/
