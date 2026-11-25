# Guardian Stop — MT5 demo diagnostic (read-only)

## Purpose

This is the first local integration check for the Windows Companion. It verifies that Guardian Stop can read the already-open MetaTrader 5 terminal, identify a DEMO account, and obtain account/position telemetry.

**It does not place, modify, or close orders.** It rejects REAL, CONTEST, and unknown account modes. It does not ask for or store broker passwords or API tokens.

## Requirements

- Windows with MetaTrader 5 desktop installed and already logged into a broker DEMO account.
- Python 3.11 (64-bit) installed.
- The terminal must remain open during the diagnostic.

Open PowerShell and run:

```powershell
py -3.11 -m pip install MetaTrader5
py -3.11 companion/mt5/diagnostic.py
```

If multiple MT5 terminals are installed, pass the full path:

```powershell
py -3.11 companion/mt5/diagnostic.py --terminal-path "C:\Program Files\MetaTrader 5\terminal64.exe"
```

The script prints a sanitized JSON snapshot. The login is masked to its last four digits. No secrets are read or printed.

## Acceptance criteria

- `mode` is `DEMO`.
- `read_only` is true and `orders_sent` is zero.
- Terminal connection is true.
- Balance/equity/currency are present.
- Positions count and position fields match the demo terminal.
- Running against a REAL account must stop with an explicit refusal.

## Next integration stage

Only after the read-only diagnostic passes on a DEMO terminal should we add authenticated heartbeat, device binding, and a simulated close-intent test. A real `order_send` close test is a separate stage and requires explicit confirmation that the selected terminal is a disposable DEMO account.
