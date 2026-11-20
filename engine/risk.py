"""Guardian Stop risk calculations with realized and floating loss accounting."""
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

def _utc_naive(dt: Optional[datetime] = None) -> datetime:
    dt = dt or datetime.now(timezone.utc)
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt

def get_trading_day_key(dt: Optional[datetime] = None) -> str:
    """Trading day changes at 22:00 UTC."""
    return (_utc_naive(dt) - timedelta(hours=22)).strftime("%Y-%m-%d")

def get_trading_week_key(dt: Optional[datetime] = None) -> str:
    """Trading week begins Sunday 22:00 UTC."""
    shifted = _utc_naive(dt) + timedelta(hours=2)
    iso = shifted.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"

def get_trading_month_key(dt: Optional[datetime] = None) -> str:
    """Trading month changes at 22:00 UTC."""
    return (_utc_naive(dt) - timedelta(hours=22)).strftime("%Y-%m")

def calculate_drawdown(initial_balance: float, current_balance: float, total_pnl: float) -> Tuple[float, float]:
    if initial_balance <= 0:
        return 0.0, 0.0
    effective_balance = current_balance + total_pnl
    drawdown = max(0.0, initial_balance - effective_balance)
    return drawdown, (drawdown / initial_balance) * 100

def calculate_limits(
    initial_balance: float,
    daily_limit_pct: float,
    weekly_limit_pct: float,
    monthly_limit_pct: float,
    closed_trades: List[Dict],
    floating_pnl: float = 0.0,
    now: Optional[datetime] = None,
) -> Dict[str, float]:
    """Charge negative closed trades plus current negative floating P&L."""
    today_key = get_trading_day_key(now)
    week_key = get_trading_week_key(now)
    month_key = get_trading_month_key(now)
    daily_realized = weekly_realized = monthly_realized = 0.0

    for trade in closed_trades or []:
        try:
            pnl = float(trade.get("profit_loss", trade.get("profitLoss", 0)) or 0)
        except (TypeError, ValueError):
            continue
        if pnl >= 0:
            continue
        closed_at = trade.get("closed_at", trade.get("closedAt"))
        if isinstance(closed_at, str):
            try:
                closed_at = datetime.fromisoformat(closed_at.replace("Z", "+00:00"))
            except ValueError:
                continue
        if not isinstance(closed_at, datetime):
            continue
        if get_trading_day_key(closed_at) == today_key:
            daily_realized += abs(pnl)
        if get_trading_week_key(closed_at) == week_key:
            weekly_realized += abs(pnl)
        if get_trading_month_key(closed_at) == month_key:
            monthly_realized += abs(pnl)

    floating_loss = max(0.0, -float(floating_pnl or 0.0))
    daily_loss = daily_realized + floating_loss
    weekly_loss = weekly_realized + floating_loss
    monthly_loss = monthly_realized + floating_loss
    daily_limit = max(0.0, initial_balance * daily_limit_pct / 100)
    weekly_limit = max(0.0, initial_balance * weekly_limit_pct / 100)
    monthly_limit = max(0.0, initial_balance * min(monthly_limit_pct, 20.0) / 100)

    def pct_used(loss: float, limit: float) -> float:
        return min(100.0, loss / limit * 100) if limit > 0 else 0.0

    return {
        "daily_loss": daily_loss, "daily_limit": daily_limit,
        "daily_remaining": max(0.0, daily_limit - daily_loss),
        "daily_pct_used": pct_used(daily_loss, daily_limit),
        "weekly_loss": weekly_loss, "weekly_limit": weekly_limit,
        "weekly_remaining": max(0.0, weekly_limit - weekly_loss),
        "weekly_pct_used": pct_used(weekly_loss, weekly_limit),
        "monthly_loss": monthly_loss, "monthly_limit": monthly_limit,
        "monthly_remaining": max(0.0, monthly_limit - monthly_loss),
        "monthly_pct_used": pct_used(monthly_loss, monthly_limit),
        "floating_loss": floating_loss,
    }

def calculate_trailing_stop(
    total_pnl: float, peak_pnl: float, trailing_enabled: bool,
    trailing_activation_pct: float, trailing_protection_pct: float,
    initial_balance: float,
) -> Tuple[bool, bool, float, str]:
    if not trailing_enabled or initial_balance <= 0:
        return False, False, 0.0, ""
    activation_threshold = initial_balance * trailing_activation_pct / 100
    is_active = total_pnl >= activation_threshold
    if not is_active or peak_pnl <= 0:
        return False, False, 0.0, ""
    stop_level = peak_pnl * trailing_protection_pct / 100
    triggered = total_pnl <= stop_level
    reason = (f"Trailing Stop: ganancias cayeron de +{peak_pnl:.2f} "
              f"a +{total_pnl:.2f} (nivel: {stop_level:.2f})") if triggered else ""
    return is_active, triggered, stop_level, reason

def check_protection(
    initial_balance: float, current_balance: float, total_pnl: float,
    peak_pnl: float, positions_count: int, daily_limit_pct: float,
    weekly_limit_pct: float, monthly_limit_pct: float, trailing_enabled: bool,
    trailing_activation_pct: float, trailing_protection_pct: float,
    closed_trades: List[Dict], floating_pnl: float = 0.0,
) -> Optional[str]:
    if positions_count <= 0:
        return None
    limits = calculate_limits(
        initial_balance, daily_limit_pct, weekly_limit_pct, monthly_limit_pct,
        closed_trades, floating_pnl=floating_pnl,
    )
    if limits["daily_limit"] > 0 and limits["daily_loss"] >= limits["daily_limit"]:
        return "daily_limit"
    if limits["weekly_limit"] > 0 and limits["weekly_loss"] >= limits["weekly_limit"]:
        return "weekly_limit"
    if limits["monthly_limit"] > 0 and limits["monthly_loss"] >= limits["monthly_limit"]:
        return "monthly_limit"
    _, triggered, _, _ = calculate_trailing_stop(
        total_pnl, peak_pnl, trailing_enabled, trailing_activation_pct,
        trailing_protection_pct, initial_balance,
    )
    if triggered:
        return "trailing_stop"
    return None
