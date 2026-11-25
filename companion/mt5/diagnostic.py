"""Read-only, demo-only MetaTrader 5 terminal diagnostic.

This module never sends orders, modifies positions, or logs broker credentials.
It reads the already-authenticated local terminal session only.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from typing import Any


def _money(value: Any) -> str:
    return f"{float(value):.2f}"


def build_read_only_snapshot(mt5: Any) -> dict[str, Any]:
    """Build a sanitized snapshot, refusing every account except explicit DEMO."""
    terminal = mt5.terminal_info()
    account = mt5.account_info()
    if terminal is None or account is None:
        raise RuntimeError("MT5 terminal/account information unavailable")
    if not bool(getattr(terminal, "connected", False)):
        raise RuntimeError("MT5 terminal is not connected to the broker")

    demo_mode = getattr(mt5, "ACCOUNT_TRADE_MODE_DEMO", 0)
    if getattr(account, "trade_mode", None) != demo_mode:
        raise RuntimeError("LIVE/CONTEST/UNKNOWN MT5 accounts are blocked; use a DEMO account")

    positions = mt5.positions_get()
    if positions is None:
        error = mt5.last_error() if hasattr(mt5, "last_error") else "unknown"
        raise RuntimeError(f"MT5 positions query failed: {error}")

    buy_type = getattr(mt5, "POSITION_TYPE_BUY", 0)
    sell_type = getattr(mt5, "POSITION_TYPE_SELL", 1)
    sanitized_positions = []
    for position in positions:
        position_type = getattr(position, "type", None)
        side = "BUY" if position_type == buy_type else "SELL" if position_type == sell_type else "UNKNOWN"
        sanitized_positions.append({
            "ticket": int(getattr(position, "ticket")),
            "symbol": str(getattr(position, "symbol", "")),
            "side": side,
            "volume": str(getattr(position, "volume", "")),
            "price_open": str(getattr(position, "price_open", "")),
            "price_current": str(getattr(position, "price_current", "")),
            "profit": _money(getattr(position, "profit", 0)),
            "stop_loss": str(getattr(position, "sl", "")),
            "take_profit": str(getattr(position, "tp", "")),
        })

    login = str(getattr(account, "login", ""))
    return {
        "source": "MetaTrader5-local-terminal",
        "mode": "DEMO",
        "read_only": True,
        "orders_sent": 0,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "terminal": {
            "name": str(getattr(terminal, "name", "")),
            "connected": True,
            "trade_allowed": bool(getattr(terminal, "trade_allowed", False)),
        },
        "account": {
            "login_suffix": login[-4:] if login else "",
            "server": str(getattr(account, "server", "")),
            "currency": str(getattr(account, "currency", "")),
            "balance": _money(getattr(account, "balance", 0)),
            "equity": _money(getattr(account, "equity", 0)),
            "margin_free": _money(getattr(account, "margin_free", 0)),
        },
        "positions": sanitized_positions,
        "positions_count": len(sanitized_positions),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Guardian Stop MT5 read-only demo diagnostic")
    parser.add_argument("--terminal-path", help="Optional path to terminal64.exe")
    args = parser.parse_args()

    try:
        import MetaTrader5 as mt5
    except ImportError:
        raise SystemExit("MetaTrader5 package missing. Install it on Windows with: py -m pip install MetaTrader5")

    initialized = mt5.initialize(args.terminal_path) if args.terminal_path else mt5.initialize()
    if not initialized:
        error = mt5.last_error()
        raise SystemExit(f"Could not initialize MT5 terminal: {error}")

    try:
        snapshot = build_read_only_snapshot(mt5)
        print(json.dumps(snapshot, ensure_ascii=False, indent=2))
        return 0
    finally:
        mt5.shutdown()


if __name__ == "__main__":
    raise SystemExit(main())
