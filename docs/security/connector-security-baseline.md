# Guardian Stop — security baseline for broker connectors

Status: implementation baseline on development branch only. Not production-certified.

## Immediate incident remediation

A Deriv demo API token was found hardcoded in the previous source version of `api/deriv-router.ts`. The current development-branch implementation removes that literal and reads demo credentials from server environment variables:
- `DERIV_DEMO_APP_ID`
- `DERIV_DEMO_API_TOKEN`
- `DERIV_DEMO_ACCOUNT_ID`

Required operator action: revoke/rotate the previously exposed Deriv token in the Deriv account portal. Removing a secret from the latest commit does not erase Git history, clones, caches, or prior build artifacts. Do not reuse the exposed token. Before any public release, purge the secret from repository history and review access/log/build artifacts.

## Implemented on development branch

- `api/lib/secret-vault.ts`: versioned AES-256-GCM authenticated encryption helper for connector secrets. Uses a 12-byte random IV and 16-byte authentication tag. Requires `GUARDIAN_TOKEN_ENCRYPTION_KEY` to be a base64-encoded 32-byte key.
- `api/services/CTraderOAuth.ts`: server-side cTrader consent URL builder, authorization-code exchange, and refresh-token exchange. Defaults to the read-only `accounts` scope at the URL builder.
- Deriv demo router no longer contains a hardcoded API token and fails closed if its environment secrets are absent.

These are foundational components only. cTrader OAuth routes are not yet wired to user sessions or persistent account records; token persistence, account discovery, Protobuf/WebSocket session management, event streaming, positions and close execution are not implemented yet. Do not display a cTrader account as connected or protected.

## Mandatory security architecture

### Secret handling
- Never collect broker passwords.
- Use OAuth or documented vendor authorization wherever available.
- Encrypt access/refresh tokens at rest with envelope encryption. Keep the data-encryption key in a managed secret/KMS service separate from TiDB.
- Use per-record random IVs; authenticate ciphertext; version envelopes for key rotation.
- Restrict decryption to the connector worker identity. The web/API process should not expose token values to clients.
- Never log authorization codes, access tokens, refresh tokens, client secrets, passwords, full account identifiers, or request URLs containing secrets.
- Redact secrets from errors, tracing, analytics, support logs, and crash reports.
- Support user revocation, token deletion, key rotation, and audit events.

### OAuth and session protection
- Use exact pre-registered HTTPS redirect URIs.
- Generate cryptographically random, one-time `state` bound to the authenticated Guardian Stop user and an expiring server-side record; consume it once. Do not implement OAuth callbacks until state storage/replay prevention exists.
- Validate callback origin, state, error parameters, code length, and user/account ownership.
- Exchange authorization codes server-side immediately.
- Request cTrader `accounts` scope first. Request `trading` only after explicit, separate user consent describing that it permits trading operations.
- Use secure, HttpOnly, SameSite cookies for browser sessions and CSRF protection for state-changing endpoints.

### Execution safety
- Separate read-only surveillance workers from execution workers.
- Every command must bind to user_id, internal account UUID, broker entity, connector, command expiry, and unique idempotency key.
- Persist lockout before dispatching close/cancel.
- Verify closure with a fresh broker-side positions query; an acknowledgement is not proof of closure.
- Reconcile after reconnect. On stale state, lost connection, token revocation, or unconfirmed close, fail closed for new entries and show DEGRADED / CLOSE_UNCONFIRMED.
- Keep a tamper-evident append-only audit trail of authorization, risk decisions, commands, acknowledgements, and reconciliation outcomes.
- Never claim global account lockout unless the broker's account infrastructure actually enforces it across all sessions.

### Infrastructure
- TLS 1.2+ in transit; TLS 1.3 preferred where supported.
- TiDB encryption at rest plus application-level encryption for connector tokens.
- Least-privilege DB credentials, separate dev/staging/production credentials, no production secrets in GitHub Actions logs.
- Rate limits, request size limits, timeouts, bounded retries with jitter, circuit breakers, and alerting for connector failures.
- Dependency and secret scanning in CI; signed releases and software bill of materials before public distribution.
- Security review and penetration testing before production use.

## cTrader integration gates

1. Register Guardian Stop at Spotware and obtain application approval.
2. Configure production HTTPS redirect URI.
3. Implement server-side one-time OAuth state persistence before exposing connect routes.
4. Persist encrypted tokens and cTrader account IDs in a new schema migration, after review and approval.
5. Implement account-list discovery with read-only scope.
6. Implement authenticated cTrader connection, account authorization, heartbeat, queue and event processing.
7. Read account state, positions and pending orders; persist normalized snapshots/events.
8. Add a separate explicit trading-scope grant and demo-only close/cancel commands.
9. Verify TradingView-originated demo positions are visible and can be closed through the cTrader API.
10. Only then consider production pilot.

## Environment variables for development

- `DERIV_DEMO_APP_ID`
- `DERIV_DEMO_API_TOKEN`
- `DERIV_DEMO_ACCOUNT_ID`
- `GUARDIAN_TOKEN_ENCRYPTION_KEY` (base64 32-byte key; generate/store in secret manager)
- `CTRADER_CLIENT_ID`
- `CTRADER_CLIENT_SECRET`
- `CTRADER_REDIRECT_URI` (exact HTTPS URI registered in Spotware)

Never put values for these variables in source files, issue comments, chat messages, or screenshots.

## Deployment boundary

No production deployment, TiDB migration, credential replacement, or live account connection is authorized by this change. Validate on an isolated development environment and demo accounts first.
