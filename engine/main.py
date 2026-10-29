"""
Guardian Stop — Risk Engine (Python)
Runs 24/7 monitoring trading accounts and closing positions when limits hit.
"""
import os
import sys
import time
import signal
from datetime import datetime
from typing import Dict, List, Optional

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine import db_client
from engine.brokers.ig import IGClient
from engine.brokers.deriv import DerivClient
from engine.risk import (
    check_protection,
    calculate_limits,
    calculate_drawdown,
    calculate_trailing_stop,
    get_trading_day_key,
)

# ── GLOBAL STATE ───────────────────────────────────────────────

running = True
POLL_INTERVAL = 5  # seconds between account checks
account_states: Dict[int, Dict] = {}  # account_id -> state

def signal_handler(signum, frame):
    global running
    print("\n[ENGINE] Shutdown signal received, stopping...")
    running = False

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# ── ACCOUNT MONITOR ────────────────────────────────────────────

class AccountMonitor:
    def __init__(self, account: Dict):
        self.account_id = account["accountId"]
        self.user_id = account["userId"]
        self.broker_name = account["brokerName"]
        self.account_number = account["accountNumber"]
        self.account_type = account["accountType"]
        self.initial_balance = float(account["initialCapital"]) if account["initialCapital"] else 0
        self.daily_limit_pct = float(account["dailyLimitPct"]) if account["dailyLimitPct"] else 1.0
        self.weekly_limit_pct = float(account["weeklyLimitPct"]) if account["weeklyLimitPct"] else 10.0
        self.monthly_limit_pct = float(account["monthlyLimitPct"]) if account["monthlyLimitPct"] else 30.0
        self.trailing_enabled = bool(account["trailingEnabled"])
        self.trailing_activation_pct = float(account["trailingActivationPct"]) if account["trailingActivationPct"] else 1.0
        self.trailing_protection_pct = float(account["trailingProtectionPct"]) if account["trailingProtectionPct"] else 30.0

        # Broker credentials
        self.ig_api_key = account.get("igApiKey", "") or ""
        self.ig_identifier = account.get("igIdentifier", "") or ""
        self.ig_password = account.get("igPassword", "") or ""
        self.deriv_api_token = account.get("derivApiToken", "") or ""

        # Runtime state
        self.client: Optional[object] = None
        self.connected = False
        self.current_balance: float = 0.0
        self.total_pnl: float = 0.0
        self.peak_pnl: float = 0.0
        self.positions: List[Dict] = []
        self.closed_trades_cache: List[Dict] = []
        self.last_check = 0
        self.trailing_fired = False

    def connect(self) -> bool:
        """Connect to broker API."""
        if self.broker_name.lower() == "ig":
            if not all([self.ig_api_key, self.ig_identifier, self.ig_password]):
                print(f"[ACCOUNT {self.account_id}] Missing IG credentials")
                return False
            self.client = IGClient(
                api_key=self.ig_api_key,
                identifier=self.ig_identifier,
                password=self.ig_password,
                account_id=self.account_number,
                demo=(self.account_type == "demo"),
            )
            self.connected = self.client.login()
            return self.connected

        elif self.broker_name.lower() == "deriv":
            if not self.deriv_api_token:
                print(f"[ACCOUNT {self.account_id}] Missing Deriv token")
                return False
            self.client = DerivClient(api_token=self.deriv_api_token)
            self.connected = self.client.connect(timeout=10)
            return self.connected

        else:
            print(f"[ACCOUNT {self.account_id}] Unsupported broker: {self.broker_name}")
            return False

    def disconnect(self):
        if self.client:
            if hasattr(self.client, "disconnect"):
                self.client.disconnect()
        self.connected = False
        self.client = None

    def refresh(self) -> bool:
        """Fetch fresh data from broker."""
        if not self.connected or not self.client:
            return False

        try:
            if self.broker_name.lower() == "ig":
                bal = self.client.get_balance()
                if bal:
                    self.current_balance = float(bal.get("balance", 0))
                    self.total_pnl = float(bal.get("profitLoss", 0))
                self.positions = self.client.get_positions()

            elif self.broker_name.lower() == "deriv":
                bal = self.client.get_balance()
                if bal is not None:
                    self.current_balance = bal
                self.positions = self.client.get_positions()
                self.total_pnl = sum(p.get("profit", 0) for p in self.positions)

            # Track peak P&L for trailing stop
            if self.total_pnl > self.peak_pnl:
                self.peak_pnl = self.total_pnl

            return True
        except Exception as e:
            print(f"[ACCOUNT {self.account_id}] Refresh error: {e}")
            self.connected = False
            return False

    def run_protection(self) -> Optional[str]:
        """
        Check if protection should trigger and execute if needed.
        Returns trigger type or None.
        """
        if len(self.positions) == 0:
            return None

        trigger = check_protection(
            initial_balance=self.initial_balance,
            current_balance=self.current_balance,
            total_pnl=self.total_pnl,
            peak_pnl=self.peak_pnl,
            positions_count=len(self.positions),
            daily_limit_pct=self.daily_limit_pct,
            weekly_limit_pct=self.weekly_limit_pct,
            monthly_limit_pct=self.monthly_limit_pct,
            trailing_enabled=self.trailing_enabled,
            trailing_activation_pct=self.trailing_activation_pct,
            trailing_protection_pct=self.trailing_protection_pct,
            closed_trades=self.closed_trades_cache,
        )

        if trigger and self.client:
            print(f"[ACCOUNT {self.account_id}] PROTECTION TRIGGERED: {trigger}")

            # Calculate stats before closing
            drawdown, drawdown_pct = calculate_drawdown(
                self.initial_balance, self.current_balance, self.total_pnl
            )
            limits = calculate_limits(
                self.initial_balance,
                self.daily_limit_pct,
                self.weekly_limit_pct,
                self.monthly_limit_pct,
                self.closed_trades_cache,
            )

            # Close all positions
            closed_count = 0
            failed_count = 0

            if self.broker_name.lower() == "ig":
                closed_count, failed_count = self.client.close_all(self.positions)
            elif self.broker_name.lower() == "deriv":
                closed_count, failed_count = self.client.close_all(self.positions)

            print(f"[ACCOUNT {self.account_id}] Closed {closed_count}/{len(self.positions)} positions ({failed_count} failed)")

            # Log protection event
            pnl_at_trigger = self.total_pnl
            pnl_pct_at_trigger = (pnl_at_trigger / self.initial_balance * 100) if self.initial_balance > 0 else 0
            protected_amount = limits.get("daily_remaining", 0)

            db_client.insert_protection_log(
                account_id=self.account_id,
                user_id=self.user_id,
                trigger_type=trigger,
                profit_loss_at_trigger=pnl_at_trigger,
                profit_loss_pct_at_trigger=pnl_pct_at_trigger,
                protected_amount=protected_amount,
                notes=f"Closed {closed_count} positions, {failed_count} failed. Drawdown: {drawdown:.2f} ({drawdown_pct:.2f}%)",
            )

            # Send notification
            trigger_names = {
                "daily_limit": "Límite Diario Alcanzado",
                "weekly_limit": "Límite Semanal Alcanzado",
                "monthly_limit": "Límite Mensual Alcanzado",
                "trailing_stop": "Trailing Stop Activado",
            }
            db_client.insert_notification(
                user_id=self.user_id,
                notif_type="limit_breach" if "limit" in trigger else "trailing_executed",
                title=trigger_names.get(trigger, "Protección Activada"),
                message=f"Se cerraron {closed_count} posiciones por {trigger}. P&L: {pnl_at_trigger:.2f}",
            )

            # Refresh to get new state
            time.sleep(2)
            self.refresh()

            return trigger

        return None

    def log_open_positions(self):
        """Log currently open positions to database (if not already logged)."""
        # This would track open positions in the trades table
        # For now, we only log when they close via protection
        pass

# ── MAIN LOOP ──────────────────────────────────────────────────

def load_accounts() -> List[AccountMonitor]:
    """Load active accounts from database."""
    rows = db_client.get_active_accounts()
    monitors = []
    for row in rows:
        mon = AccountMonitor(row)
        monitors.append(mon)
    return monitors

def main_loop():
    global running

    print("=" * 60)
    print("  GUARDIAN STOP — Risk Engine (Python)")
    print("  Monitoring trading accounts 24/7")
    print("=" * 60)

    # Ensure tables exist
    db_client.ensure_credentials_table()
    db_client.ensure_state_table()

    monitors: List[AccountMonitor] = []
    last_account_refresh = 0

    while running:
        try:
            now = time.time()

            # Refresh account list every 60 seconds
            if now - last_account_refresh > 60:
                print("[ENGINE] Refreshing account list...")
                new_monitors = load_accounts()

                # Preserve state for existing monitors
                existing = {m.account_id: m for m in monitors}
                monitors = []
                for nm in new_monitors:
                    if nm.account_id in existing:
                        old = existing[nm.account_id]
                        nm.peak_pnl = old.peak_pnl
                        nm.closed_trades_cache = old.closed_trades_cache
                        nm.trailing_fired = old.trailing_fired
                    monitors.append(nm)

                last_account_refresh = now
                print(f"[ENGINE] {len(monitors)} active accounts loaded")

            # Process each account
            for monitor in monitors:
                if not running:
                    break

                # Connect if not connected
                if not monitor.connected:
                    print(f"[ACCOUNT {monitor.account_id}] Connecting to {monitor.broker_name}...")
                    ok = monitor.connect()
                    if not ok:
                        continue

                # Refresh data
                ok = monitor.refresh()
                if not ok:
                    print(f"[ACCOUNT {monitor.account_id}] Refresh failed, will retry...")
                    monitor.disconnect()
                    continue

                # Update balance in DB
                db_client.update_account_balance(monitor.account_id, monitor.current_balance)

                # Log status
                drawdown, drawdown_pct = calculate_drawdown(
                    monitor.initial_balance, monitor.current_balance, monitor.total_pnl
                )
                limits = calculate_limits(
                    monitor.initial_balance,
                    monitor.daily_limit_pct,
                    monitor.weekly_limit_pct,
                    monitor.monthly_limit_pct,
                    monitor.closed_trades_cache,
                )

                print(
                    f"[ACCOUNT {monitor.account_id}] "
                    f"Balance={monitor.current_balance:.2f} | "
                    f"PnL={monitor.total_pnl:.2f} | "
                    f"Positions={len(monitor.positions)} | "
                    f"DD={drawdown:.2f}({drawdown_pct:.2f}%) | "
                    f"Daily={limits['daily_loss']:.2f}/{limits['daily_limit']:.2f}"
                )

                # Check and execute protection
                trigger = monitor.run_protection()
                if trigger:
                    print(f"[ACCOUNT {monitor.account_id}] Protection executed: {trigger}")

            # Update heartbeat
            db_client.update_heartbeat(
                f"Monitoring {len(monitors)} accounts | Last check: {datetime.utcnow().isoformat()}"
            )

            # Sleep
            for _ in range(POLL_INTERVAL):
                if not running:
                    break
                time.sleep(1)

        except Exception as e:
            print(f"[ENGINE] Main loop error: {e}")
            time.sleep(POLL_INTERVAL)

    # Cleanup
    print("[ENGINE] Disconnecting all accounts...")
    for monitor in monitors:
        monitor.disconnect()
    print("[ENGINE] Shutdown complete.")

# ── ENTRY POINT ────────────────────────────────────────────────

if __name__ == "__main__":
    main_loop()
