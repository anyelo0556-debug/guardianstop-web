# Guardian Stop — MT5 DEMO Companion

Windows local companion for the already-authenticated MetaTrader 5 desktop terminal, using the official `MetaTrader5` Python package. No broker password, API token, or separate broker API is requested.

## Install and read status

Open MT5 and log into a disposable DEMO account. In PowerShell:

```powershell
py -3.11 -m pip install MetaTrader5
py -3.11 companion/mt5/guardian_companion.py status
```

The status command reads account balance/equity and open positions. It refuses disconnected and non-DEMO accounts.

## Explicit DEMO close test

This sends real close requests to the connected broker DEMO server; it is not a simulation. Use only a disposable DEMO account with positions you intend to close.

```powershell
$env:GUARDIAN_MT5_ALLOW_DEMO_CLOSE = "YES"
py -3.11 companion/mt5/guardian_companion.py close-all
```

The operator must type the displayed account-suffix confirmation. Each close sends the opposite market side and re-queries the exact position ticket to verify it disappeared. Failed or unverified closes are reported individually. The process exits non-zero if any close is not verified.

## Safety and current scope

- LIVE, CONTEST, disconnected, and trade-disabled terminals are blocked.
- Close-all is opt-in and interactive; it is not silently triggered by a cloud command.
- This is a local DEMO execution milestone, not yet the complete Guardian Stop SaaS integration. Authenticated device registration, secure heartbeat/telemetry upload, TiDB persistence, cloud risk-state delivery, and end-to-end Render validation remain outstanding.
- Never put broker passwords, terminal credentials, or account secrets in source control or chat.

## Tests

```powershell
py -3.11 -m unittest engine.tests.test_mt5_companion -v
```
