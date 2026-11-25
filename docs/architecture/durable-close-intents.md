# Guardian Stop — durable close intents

## Scope

The IG worker must persist a close intent before sending a close command. A successful HTTP response from a broker is not proof that positions are closed. An intent remains pending until a fresh broker position query reports zero open positions.

## Implemented in the development branch

- The risk_execution_intents table stores the account, reason, idempotency key, attempt count, last attempt, last safe error code, and confirmation timestamp.
- The worker writes the intent before issuing the close command.
- A process restart can discover pending intents and resume verification/retry rather than losing the reason in process memory.
- A confirmed intent is terminal and cannot be downgraded by a later retry result.

## Limits still requiring work

- This first version is durable across process restarts, but it does not yet implement a distributed lease/claim protocol for multiple worker replicas. Run only one IG worker instance per account until that is added.
- The intent table does not replace the persistent discipline/telemetry state machine or the normalized REAL/PROP evaluator.
- It does not establish a daily timezone-aware baseline or reconcile closed broker history.
- The SQL migration is a draft. It has not been applied to TiDB, production or any external database.
- No broker account is authenticated or used by the tests.

## Safe validation sequence

1. Apply the migration only to a disposable TiDB test database.
2. Test insert-before-command and restart recovery using a fake broker adapter.
3. Test the same account with concurrent worker replicas after adding the lease protocol.
4. Run an explicitly authorized demo-account integration test.
5. Keep live IG polling disabled until persistent governance, baseline reconciliation, and recovery tests are complete.
