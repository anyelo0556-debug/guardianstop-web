import unittest
from types import SimpleNamespace

from companion.mt5.diagnostic import build_read_only_snapshot


class FakeMetaTrader5:
    ACCOUNT_TRADE_MODE_DEMO = 0
    ACCOUNT_TRADE_MODE_REAL = 2
    POSITION_TYPE_BUY = 0
    POSITION_TYPE_SELL = 1

    def __init__(self, trade_mode=0, connected=True, positions=None):
        self._trade_mode = trade_mode
        self._connected = connected
        self._positions = positions if positions is not None else []

    def terminal_info(self):
        return SimpleNamespace(name="MetaTrader 5", connected=self._connected, trade_allowed=True)

    def account_info(self):
        return SimpleNamespace(
            trade_mode=self._trade_mode, login=12345678, server="Demo-Server",
            currency="USD", balance=10000, equity=9990, margin_free=9000,
        )

    def positions_get(self):
        return self._positions

    def last_error(self):
        return (1, "fake error")


class MT5ReadOnlyDiagnosticTests(unittest.TestCase):
    def test_demo_account_returns_sanitized_read_only_snapshot(self):
        fake = FakeMetaTrader5(positions=[SimpleNamespace(
            ticket=42, symbol="US100", type=0, volume=0.1, price_open=20000,
            price_current=20001, profit=1.25, sl=19990, tp=20020,
        )])
        snapshot = build_read_only_snapshot(fake)
        self.assertEqual(snapshot["mode"], "DEMO")
        self.assertTrue(snapshot["read_only"])
        self.assertEqual(snapshot["orders_sent"], 0)
        self.assertEqual(snapshot["account"]["login_suffix"], "5678")
        self.assertEqual(snapshot["positions_count"], 1)
        self.assertEqual(snapshot["positions"][0]["side"], "BUY")
        self.assertNotIn("login", snapshot["account"])

    def test_live_account_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "LIVE/CONTEST/UNKNOWN"):
            build_read_only_snapshot(FakeMetaTrader5(trade_mode=2))

    def test_disconnected_terminal_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "not connected"):
            build_read_only_snapshot(FakeMetaTrader5(connected=False))

    def test_failed_positions_query_is_not_reported_as_empty(self):
        fake = FakeMetaTrader5()
        fake.positions_get = lambda: None
        with self.assertRaisesRegex(RuntimeError, "positions query failed"):
            build_read_only_snapshot(fake)


if __name__ == "__main__":
    unittest.main()
