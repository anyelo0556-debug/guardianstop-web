import unittest
from types import SimpleNamespace

from companion.mt5.guardian_companion import build_snapshot, close_all_demo_positions


class FakeMT5:
    ACCOUNT_TRADE_MODE_DEMO = 0
    ACCOUNT_TRADE_MODE_REAL = 2
    POSITION_TYPE_BUY = 0
    POSITION_TYPE_SELL = 1
    TRADE_ACTION_DEAL = 1
    ORDER_TYPE_BUY = 0
    ORDER_TYPE_SELL = 1
    ORDER_TIME_GTC = 0
    ORDER_FILLING_RETURN = 2
    TRADE_RETCODE_DONE = 10009

    def __init__(self, mode=0, positions=None):
        self.mode = mode
        self.positions = list(positions or [])
        self.requests = []

    def terminal_info(self):
        return SimpleNamespace(connected=True, trade_allowed=True)

    def account_info(self):
        return SimpleNamespace(trade_mode=self.mode, trade_allowed=True, login=12345678,
                               server="Demo", currency="USD", balance=1000,
                               equity=990, margin_free=900)

    def positions_get(self, ticket=None):
        if ticket is None:
            return list(self.positions)
        return [p for p in self.positions if p.ticket == ticket]

    def symbol_info_tick(self, symbol):
        return SimpleNamespace(bid=100.0, ask=100.1)

    def order_send(self, request):
        self.requests.append(request)
        self.positions = [p for p in self.positions if p.ticket != request["position"]]
        return SimpleNamespace(retcode=10009, deal=9001)

    def last_error(self):
        return (0, "ok")


def pos(ticket=11, side=0):
    return SimpleNamespace(ticket=ticket, symbol="US100", type=side, volume=0.1,
                           profit=-2.0, price_open=100, price_current=99,
                           sl=0, tp=0)


class CompanionTests(unittest.TestCase):
    def test_snapshot_reads_demo_positions(self):
        snapshot = build_snapshot(FakeMT5(positions=[pos()]))
        self.assertEqual(snapshot["mode"], "DEMO")
        self.assertEqual(snapshot["positions_count"], 1)
        self.assertEqual(snapshot["positions"][0]["ticket"], 11)

    def test_real_account_is_blocked(self):
        with self.assertRaisesRegex(RuntimeError, "only an explicit DEMO"):
            build_snapshot(FakeMT5(mode=2, positions=[pos()]))

    def test_close_all_sends_opposite_deal_and_verifies_flat(self):
        mt5 = FakeMT5(positions=[pos(11, 0), pos(12, 1)])
        result = close_all_demo_positions(mt5, "5678")
        self.assertEqual(result["closed"], 2)
        self.assertEqual(result["failed"], 0)
        self.assertEqual(len(mt5.requests), 2)
        self.assertEqual(mt5.requests[0]["type"], mt5.ORDER_TYPE_SELL)
        self.assertEqual(mt5.requests[1]["type"], mt5.ORDER_TYPE_BUY)

    def test_wrong_account_confirmation_blocks_closing(self):
        mt5 = FakeMT5(positions=[pos()])
        with self.assertRaisesRegex(RuntimeError, "confirmation does not match"):
            close_all_demo_positions(mt5, "0000")
        self.assertEqual(mt5.requests, [])


if __name__ == "__main__":
    unittest.main()
