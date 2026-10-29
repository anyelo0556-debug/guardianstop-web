"""
Guardian Stop — Risk Engine Logic
Calculates daily/weekly/monthly limits, trailing stop, session drawdown.
Pure functions, no side effects.
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

# ── TRADING DAY ────────────────────────────────────────────────
# Forex trading day ends at 17:00 NY time = 22:00 UTC

def get_trading_day_key(dt: Optional[datetime] = None) -> str:
    """Return trading day key (YYYY-MM-DD) based on 22:00 UTC cutoff."""
    if dt is None:
        dt = datetime.utcnow()
    shifted = dt - timedelta(hours=22)
    return shifted.strftime("%Y-%m-%d")

def get_trading_week_key(dt: Optional[datetime] = None) -> str:
    """Return trading week key (YYYY-WW) based on Sunday 22:00 UTC."""
    if dt is None:
        dt = datetime.utcnow()
    shifted = dt - timedelta(hours=22)
    return shifted.strftime("%Y-W%W")

def get_trading_month_key(dt: Optional[datetime] = None) -> str:
    """Return trading month key (YYYY-MM) based on 22:00 UTC cutoff."""
    if dt is None:
        dt = datetime.utcnow()
    shifted = dt - timedelta(hours=22)
    return shifted.strftime("%Y-%m")

# ── CALCULATIONS ───────────────────────────────────────────────

def calculate_drawdown(initial_balance: float, current_balance: float, total_pnl: float) -> Tuple[float, float]:
    """
    Calculate session drawdown.
    effective_balance = current_balance + total_pnl (IG balance doesn't include floating P&L)
    drawdown = max(0, initial_balance - effective_balance)
    Returns: (drawdown_amount, drawdown_pct)
    """
    if initial_balance <= 0:
        return 0.0, 0.0
    effective_balance = current_balance + total_pnl
    drawdown = max(0.0, initial_balance - effective_balance)
    drawdown_pct = (drawdown / initial_balance) * 100
    return drawdown, drawdown_pct

def calculate_limits(
    initial_balance: float,
    daily_limit_pct: float,
    weekly_limit_pct: float,
    monthly_limit_pct: float,
    closed_trades: List[Dict],  # trades with profit/loss and closed_at
) -> Dict[str, float]:
    """
    Calculate realized losses for daily/weekly/monthly periods.
    Only counts trades with negative P&L (losses).
    """
    today_key = get_trading_day_key()
    week_key = get_trading_week_key()
    month_key = get_trading_month_key()

    daily_loss = 0.0
    weekly_loss = 0.0
    monthly_loss = 0.0

    for trade in closed_trades:
        pnl = trade.get("profit_loss", 0)
        if pnl >= 0:
            continue  # Only losses
        closed_at = trade.get("closed_at")
        if closed_at is None:
            continue
        if isinstance(closed_at, str):
            try:
                closed_at = datetime.fromisoformat(closed_at.replace("Z", "+00:00"))
            except:
                continue

        trade_day = get_trading_day_key(closed_at)
        trade_week = get_trading_week_key(closed_at)
        trade_month = get_trading_month_key(closed_at)

        loss = abs(pnl)
        if trade_day == today_key:
            daily_loss += loss
        if trade_week == week_key:
            weekly_loss += loss
        if trade_month == month_key:
            monthly_loss += loss

    daily_limit = initial_balance * (daily_limit_pct / 100)
    weekly_limit = initial_balance * (weekly_limit_pct / 100)
    monthly_limit = initial_balance * (monthly_limit_pct / 100)

    return {
        "daily_loss": daily_loss,
        "daily_limit": daily_limit,
        "daily_remaining": max(0.0, daily_limit - daily_loss),
        "daily_pct_used": min(100.0, (daily_loss / daily_limit * 100)) if daily_limit > 0 else 0,
        "weekly_loss": weekly_loss,
        "weekly_limit": weekly_limit,
        "weekly_remaining": max(0.0, weekly_limit - weekly_loss),
        "weekly_pct_used": min(100.0, (weekly_loss / weekly_limit * 100)) if weekly_limit > 0 else 0,
        "monthly_loss": monthly_loss,
        "monthly_limit": monthly_limit,
        "monthly_remaining": max(0.0, monthly_limit - monthly_loss),
        "monthly_pct_used": min(100.0, (monthly_loss / monthly_limit * 100)) if monthly_limit > 0 else 0,
    }

# ── TRAILING STOP ──────────────────────────────────────────────

def calculate_trailing_stop(
    total_pnl: float,
    peak_pnl: float,
    trailing_enabled: bool,
    trailing_activation_pct: float,
    trailing_protection_pct: float,
    initial_balance: float,
) -> Tuple[bool, bool, float, str]:
    """
    Check trailing stop condition.
    Returns: (is_active, is_triggered, stop_level, reason)
    """
    if not trailing_enabled or initial_balance <= 0:
        return False, False, 0.0, ""

    activation_threshold = initial_balance * (trailing_activation_pct / 100)
    is_active = total_pnl >= activation_threshold

    if not is_active or peak_pnl <= 0:
        return False, False, 0.0, ""

    stop_level = peak_pnl * (trailing_protection_pct / 100)
    is_triggered = total_pnl <= stop_level

    if is_triggered:
        reason = (
            f"Trailing Stop: ganancias cayeron de +{peak_pnl:.2f} "
            f"a +{total_pnl:.2f} (nivel: {stop_level:.2f})"
        )
    else:
        reason = ""

    return is_active, is_triggered, stop_level, reason

# ── PROTECTION DECISION ────────────────────────────────────────

def check_protection(
    initial_balance: float,
    current_balance: float,
    total_pnl: float,
    peak_pnl: float,
    positions_count: int,
    daily_limit_pct: float,
    weekly_limit_pct: float,
    monthly_limit_pct: float,
    trailing_enabled: bool,
    trailing_activation_pct: float,
    trailing_protection_pct: float,
    closed_trades: List[Dict],
) -> Optional[str]:
    """
    Determine if protection should trigger.
    Returns trigger type or None.
    """
    if positions_count == 0:
        return None

    limits = calculate_limits(
        initial_balance, daily_limit_pct, weekly_limit_pct, monthly_limit_pct, closed_trades
    )

    # 1. Daily limit
    if limits["daily_loss"] >= limits["daily_limit"] and limits["daily_limit"] > 0:
        return "daily_limit"

    # 2. Weekly limit
    if limits["weekly_loss"] >= limits["weekly_limit"] and limits["weekly_limit"] > 0:
        return "weekly_limit"

    # 3. Monthly limit
    if limits["monthly_loss"] >= limits["monthly_limit"] and limits["monthly_limit"] > 0:
        return "monthly_limit"

    # 4. Trailing stop
    _, is_triggered, _, _ = calculate_trailing_stop(
        total_pnl, peak_pnl, trailing_enabled,
        trailing_activation_pct, trailing_protection_pct, initial_balance
    )
    if is_triggered:
        return "trailing_stop"

    return None
