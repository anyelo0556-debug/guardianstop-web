import unittest

from engine.safety import is_demo_account


class DemoAccountGateTests(unittest.TestCase):
    def test_explicit_demo_account_is_allowed(self):
        self.assertTrue(is_demo_account("demo"))
        self.assertTrue(is_demo_account(" DEMO "))

    def test_live_and_unknown_account_types_are_blocked(self):
        for value in ("live", "REAL", "prop", "", None, 1):
            with self.subTest(value=value):
                self.assertFalse(is_demo_account(value))


if __name__ == "__main__":
    unittest.main()
