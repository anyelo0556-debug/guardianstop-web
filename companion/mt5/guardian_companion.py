"""Guardian Stop local MT5 companion: DEMO-only snapshot and explicit close.

This runs on the Windows machine where the authenticated MT5 desktop terminal is
open. It never asks for broker credentials. Closing is opt-in, DEMO-only, and
requires an explicit interactive confirmation. No cloud-triggered execution is
enabled by this module.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from typing import Any


def _require_demo(mt5: Any) -> tuple[Any, Any]:
    terminal = mt5.terminal_info()
    account = mt5.account_info()
    if terminal is None or account is None:
        raise RuntimeError(f"MT5 session unavailable: {mt5.last_error()}")
    if not bool(getattr(terminal, "connected", False)):
        raise RuntimeError("MT5 terminal is disconnected")
    if getattr(account, "trade_mode", None) != getattr(mt5, "ACCOUNT_TRADE_MODE_DEMO", 0):
        raise RuntimeError("SAFETY BLOCK: only an explicit DEMO account is permitted")
    if not bool(getattr(terminal, "trade_allowed", False)):
        raise RuntimeError("MT5 terminal has Algo Trading disabled")
    if not bool(getattr(account, "trade_allowed", False)):
        raise RuntimeError("Trading is not allowed for this MT5 account")
    return terminal, account


def build_snapshot(mt5: Any) -> dict[str, Any]:
    terminal, account = _require_demo(mt5)
    positions = mt5.positions_get()
    if positions is None:
        raise RuntimeError(f"Could not read positions: {mt5.last_error()}")
    items = [{
        "ticket": int(p.ticket),
        "symbol": str(p.symbol),
        "side": "BUY" if p.type == mt5.POSITION_TYPE_BUY else "SELL",
        "volume": float(p.volume),
        "profit": float(p.profit),
        "price_open": float(p.price_open),
        "price_current": float(p.price_current),
        "stop_loss": float(p.sl),
        "take_profit": float(p.tp),
    } for p in positions]
    return {
        "source": "MetaTrader5-local-terminal",
        "mode": "DEMO",
        "read_only": True,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "terminal_connected": bool(terminal.connected),
        "account": {
            "login_suffix": str(account.login)[-4:],
            "server": str(account.server),
            "currency": str(account.currency),
            "balance": float(account.balance),
            "equity": float(account.equity),
            "margin_free": float(account.margin_free),
        },
        "positions_count": len(items),
        "positions": items,
    }


def close_all_demo_positions(mt5: Any, expected_login_suffix: str) -> dict[str, Any]:
    """Close each currently open DEMO position and verify it disappears."""
    _, account = _require_demo(mt5)
    actual_suffix = str(account.login)[-4:]
    if not expected_login_suffix or actual_suffix != expected_login_suffix:
        raise RuntimeError("Account confirmation does not match the connected DEMO account")

    positions = mt5.positions_get()
    if positions is None:
        raise RuntimeError(f"Could not read positions: {mt5.last_error()}")

    results = []
    for position in positions:
        symbol = str(position.symbol)
        tick = mt5.symbol_info_tick(symbol)
        if tick is None:
            results.append({"ticket": int(position.ticket), "closed": False, "error": "NO_TICK"})
            continue
        is_buy = position.type == mt5.POSITION_TYPE_BUY
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "position": int(position.ticket),
            "volume": float(position.volume),
            "type": mt5.ORDER_TYPE_SELL if is_buy else mt5.ORDER_TYPE_BUY,
            "price": float(tick.bid if is_buy else tick.ask),
            "deviation": 30,
            "magic": 26001,
            "comment": "GuardianStop DEMO risk close",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_RETURN,
        }
        sent = mt5.order_send(request)
        if sent is None or sent.retcode != mt5.TRADE_RETCODE_DONE:
            results.append({
                "ticket": int(position.ticket),
                "closed": False,
                "retcode": getattr(sent, "retcode", None),
                "error": str(mt5.last_error()),
            })
            continue

        remaining = mt5.positions_get(ticket=int(position.ticket))
        closed = remaining is not None and len(remaining) == 0
        results.append({
            "ticket": int(position.ticket),
            "closed": closed,
            "retcode": int(sent.retcode),
            "deal": int(getattr(sent, "deal", 0)),
        })

    return {
        "mode": "DEMO",
        "requested": len(positions),
        "closed": sum(1 for item in results if item["closed"]),
        "failed": sum(1 for item in results if not item["closed"]),
        "results": results,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Guardian Stop MT5 DEMO companion")
    parser.add_argument("command", choices=("status", "close-all"))
    parser.add_argument("--terminal-path")
    args = parser.parse_args()

    try:
        import MetaTrader5 as mt5
    except ImportError:
        print("Install with: py -3.11 -m pip install MetaTrader5", file=sys.stderr)
        return 2

    initialized = mt5.initialize(args.terminal_path) if args.terminal_path else mt5.initialize()
    if not initialized:
        print(f"MT5 initialize failed: {mt5.last_error()}", file=sys.stderr)
        return 2
    try:
        if args.command == "status":
            print(json.dumps(build_snapshot(mt5), indent=2, ensure_ascii=False))
            return 0

        if os.environ.get("GUARDIAN_MT5_ALLOW_DEMO_CLOSE") != "YES":
            print("Blocked. Set GUARDIAN_MT5_ALLOW_DEMO_CLOSE=YES only for a disposable DEMO account.", file=sys.stderr)
            return 3
        _, account = _require_demo(mt5)
        suffix = str(account.login)[-4:]
        print(f"DEMO account suffix: {suffix}")
        typed = input(f"Type CLOSE DEMO {suffix} to close ALL open positions: ").strip()
        if typed != f"CLOSE DEMO {suffix}":
            print("Cancelled; no orders sent.")
            return 4
        result = close_all_demo_positions(mt5, suffix)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0 if result["failed"] == 0 else 5
    finally:
        mt5.shutdown()


if __name__ == "__main__":
    raise SystemExit(main())
