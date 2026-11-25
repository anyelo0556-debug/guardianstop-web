"""Guardian Stop risk calculations with realized and floating loss accounting."""
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

def _utc_naive(dt: Optional[datetime] = None) -> datetime:
    dt = dt or datetime.now(timezone.utc)
    return dt.astimezone(timezone.utc).replace(tzinfo=None) if dt.tzinfo else dt

def get_trading_day_key(dt=None):
    return (_utc_naive(dt) - timedelta(hours=22)).strftime("%Y-%m-%d")

def get_trading_week_key(dt=None):
    iso = (_utc_naive(dt) + timedelta(hours=2)).isocalendar()
    return f"{iso.year}-W{iso.week:02d}"

def get_trading_month_key(dt=None):
    return (_utc_naive(dt) - timedelta(hours=22)).strftime("%Y-%m")

def calculate_drawdown(initial_balance, current_balance, total_pnl):
    if initial_balance <= 0: return 0.0, 0.0
    loss = max(0.0, initial_balance - (current_balance + total_pnl))
    return loss, loss / initial_balance * 100

def calculate_limits(initial_balance, daily_limit_pct, weekly_limit_pct, monthly_limit_pct,
                     closed_trades: List[Dict], floating_pnl=0.0, now=None):
    day, week, month = get_trading_day_key(now), get_trading_week_key(now), get_trading_month_key(now)
    daily = weekly = monthly = 0.0
    for trade in closed_trades or []:
        try: pnl = float(trade.get("profit_loss", trade.get("profitLoss", 0)) or 0)
        except (TypeError, ValueError): continue
        if pnl >= 0: continue
        closed = trade.get("closed_at", trade.get("closedAt"))
        if isinstance(closed, str):
            try: closed = datetime.fromisoformat(closed.replace("Z", "+00:00"))
            except ValueError: continue
        if not isinstance(closed, datetime): continue
        if get_trading_day_key(closed) == day: daily += -pnl
        if get_trading_week_key(closed) == week: weekly += -pnl
        if get_trading_month_key(closed) == month: monthly += -pnl
    floating_loss = max(0.0, -float(floating_pnl or 0.0))
    daily += floating_loss; weekly += floating_loss; monthly += floating_loss
    dlim = max(0.0, initial_balance * daily_limit_pct / 100)
    wlim = max(0.0, initial_balance * weekly_limit_pct / 100)
    mlim = max(0.0, initial_balance * min(monthly_limit_pct, 20.0) / 100)
    def used(loss, limit): return min(100.0, loss / limit * 100) if limit else 0.0
    return {"daily_loss":daily,"daily_limit":dlim,"daily_remaining":max(0,dlim-daily),"daily_pct_used":used(daily,dlim),
            "weekly_loss":weekly,"weekly_limit":wlim,"weekly_remaining":max(0,wlim-weekly),"weekly_pct_used":used(weekly,wlim),
            "monthly_loss":monthly,"monthly_limit":mlim,"monthly_remaining":max(0,mlim-monthly),"monthly_pct_used":used(monthly,mlim),
            "floating_loss":floating_loss}

def calculate_trailing_stop(total_pnl, peak_pnl, trailing_enabled, trailing_activation_pct,
                            trailing_protection_pct, initial_balance):
    if not trailing_enabled or initial_balance <= 0: return False, False, 0.0, ""
    if total_pnl < initial_balance * trailing_activation_pct / 100 or peak_pnl <= 0:
        return False, False, 0.0, ""
    level = peak_pnl * trailing_protection_pct / 100
    hit = total_pnl <= level
    reason = f"Trailing Stop: ganancias cayeron de +{peak_pnl:.2f} a +{total_pnl:.2f} (nivel: {level:.2f})" if hit else ""
    return True, hit, level, reason

def check_protection(initial_balance, current_balance, total_pnl, peak_pnl, positions_count,
                     daily_limit_pct, weekly_limit_pct, monthly_limit_pct, trailing_enabled,
                     trailing_activation_pct, trailing_protection_pct, closed_trades, floating_pnl=0.0,
                     now=None):
    # Use the same evaluation instant as the ledger calculation. This keeps historical
    # simulations deterministic and prevents a breach from disappearing when tests
    # (or replayed events) evaluate a past trading day.
    limits = calculate_limits(initial_balance, daily_limit_pct, weekly_limit_pct, monthly_limit_pct,
                              closed_trades, floating_pnl=floating_pnl, now=now)
    if limits["daily_limit"] and limits["daily_loss"] >= limits["daily_limit"]: return "daily_limit"
    if limits["weekly_limit"] and limits["weekly_loss"] >= limits["weekly_limit"]: return "weekly_limit"
    if limits["monthly_limit"] and limits["monthly_loss"] >= limits["monthly_limit"]: return "monthly_limit"
    if positions_count > 0:
        _, hit, _, _ = calculate_trailing_stop(total_pnl, peak_pnl, trailing_enabled,
                                                trailing_activation_pct, trailing_protection_pct, initial_balance)
        if hit: return "trailing_stop"
    return None
