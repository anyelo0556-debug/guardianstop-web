import unittest
from datetime import datetime, timezone

from engine.risk import calculate_limits, check_protection, get_trading_day_key, get_trading_week_key

class RiskLimitTests(unittest.TestCase):
    def test_realized_and_floating_losses_consume_daily_budget(self):
        now = datetime(2026, 11, 18, 15, 0, tzinfo=timezone.utc)
        result = calculate_limits(
            10000, 1, 10, 20,
            [{"profit_loss": -30, "closed_at": now}],
            floating_pnl=-20,
            now=now,
        )
        self.assertEqual(result["daily_loss"], 50)
        self.assertEqual(result["daily_remaining"], 50)
        self.assertEqual(result["weekly_loss"], 50)
        self.assertEqual(result["monthly_loss"], 50)

    def test_profitable_floating_pnl_does_not_erase_realized_loss(self):
        now = datetime(2026, 11, 18, 15, 0, tzinfo=timezone.utc)
        result = calculate_limits(
            10000, 1, 10, 20,
            [{"profit_loss": -30, "closed_at": now}],
            floating_pnl=40,
            now=now,
        )
        self.assertEqual(result["daily_loss"], 30)

    def test_monthly_limit_is_capped_at_twenty_percent(self):
        result = calculate_limits(10000, 1, 10, 30, [], now=datetime(2026, 11, 18, tzinfo=timezone.utc))
        self.assertEqual(result["monthly_limit"], 2000)

    def test_week_rollover_is_sunday_2200_utc(self):
        before = datetime(2026, 11, 15, 21, 59, tzinfo=timezone.utc)
        after = datetime(2026, 11, 15, 22, 0, tzinfo=timezone.utc)
        self.assertNotEqual(get_trading_week_key(before), get_trading_week_key(after))

    def test_realized_daily_breach_triggers_without_open_positions(self):
        now = datetime(2026, 11, 18, 15, 0, tzinfo=timezone.utc)
        trigger = check_protection(
            initial_balance=10000, current_balance=9900, total_pnl=0,
            peak_pnl=0, positions_count=0, daily_limit_pct=1,
            weekly_limit_pct=10, monthly_limit_pct=20,
            trailing_enabled=False, trailing_activation_pct=1,
            trailing_protection_pct=30,
            closed_trades=[{"profit_loss": -100, "closed_at": now}],
            floating_pnl=0,
            now=now,
        )
        self.assertEqual(trigger, "daily_limit")

    def test_day_rollover_is_2200_utc(self):
        before = datetime(2026, 11, 18, 21, 59, tzinfo=timezone.utc)
        after = datetime(2026, 11, 18, 22, 0, tzinfo=timezone.utc)
        self.assertNotEqual(get_trading_day_key(before), get_trading_day_key(after))

if __name__ == "__main__":
    unittest.main()
