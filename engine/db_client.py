"""
Guardian Stop — Database Client for Risk Engine
Reads account configs and writes trade/protection logs.
"""
import os
import pymysql
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from contextlib import contextmanager

# Parse DATABASE_URL: mysql://user:pass@host:port/db
def _parse_db_url():
    url = os.environ.get("DATABASE_URL", "")
    if url.startswith("mysql://"):
        url = url[8:]
    if "@" in url:
        creds, rest = url.split("@", 1)
        user, pwd = creds.split(":", 1) if ":" in creds else (creds, "")
        host_db = rest
    else:
        user, pwd, host_db = "", "", url
    if "/" in host_db:
        host_port, db = host_db.split("/", 1)
    else:
        host_port, db = host_db, ""
    if ":" in host_port:
        host, port = host_port.split(":", 1)
        port = int(port)
    else:
        host, port = host_port, 3306
    return {"host": host, "port": port, "user": user, "password": pwd, "database": db}

_pool_kwargs = _parse_db_url()

@contextmanager
def _conn():
    # PlanetScale/TiDB requires SSL
    ssl_config = {"ca": "/etc/ssl/certs/ca-certificates.crt"} if os.path.exists("/etc/ssl/certs/ca-certificates.crt") else {"ca": "/etc/ssl/cert.pem"} if os.path.exists("/etc/ssl/cert.pem") else None
    conn = pymysql.connect(
        host=_pool_kwargs["host"],
        port=_pool_kwargs["port"],
        user=_pool_kwargs["user"],
        password=_pool_kwargs["password"],
        database=_pool_kwargs["database"],
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
        ssl=ssl_config,
        connect_timeout=10,
        read_timeout=10,
        write_timeout=10,
    )
    try:
        yield conn
    finally:
        conn.close()

# ── ACCOUNT CONFIG ──────────────────────────────────────────────

def _decrypt_secret(value):
    """Decrypt AES-256-GCM values from the Node API; allow legacy plaintext during migration."""
    if not value or not value.startswith("enc:v1:"):
        return value or ""
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    key_hex = os.environ.get("CREDENTIALS_ENCRYPTION_KEY", "")
    if len(key_hex) != 64:
        raise RuntimeError("CREDENTIALS_ENCRYPTION_KEY must be a 32-byte hex key")
    try:
        _, version, iv_hex, tag_hex, ciphertext_hex = value.split(":", 4)
        if version != "v1":
            raise ValueError("Unsupported credential encryption version")
        aes = AESGCM(bytes.fromhex(key_hex))
        encrypted = bytes.fromhex(ciphertext_hex) + bytes.fromhex(tag_hex)
        return aes.decrypt(bytes.fromhex(iv_hex), encrypted, None).decode("utf-8")
    except Exception as exc:
        raise RuntimeError("Unable to decrypt broker credential; verify the shared encryption key") from exc

def get_active_accounts() -> List[Dict]:
    """Load only active, fully linked trading accounts and decrypt secrets in memory."""
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    a.id AS accountId, a.userId, a.brokerName, a.accountNumber,
                    a.accountType, a.initialCapital, a.currentBalance,
                    a.dailyLimitPct, 10.0 AS weeklyLimitPct,
                    20.0 AS monthlyLimitPct,
                    a.trailingEnabled, a.trailingActivationPct, a.trailingProtectionPct,
                    a.isActive, ac.igApiKey, ac.igIdentifier, ac.igPassword, ac.derivApiToken
                FROM accounts a
                INNER JOIN account_credentials ac ON ac.accountId = a.id
                WHERE a.isActive = 1
            """)
            rows = cur.fetchall()
    for row in rows:
        for field in ("igApiKey", "igPassword", "derivApiToken"):
            row[field] = _decrypt_secret(row.get(field))
    return rows

# ── CREDENTIALS TABLE (must exist) ──────────────────────────────

def ensure_credentials_table():
    """Create table if not exists for broker API credentials."""
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS account_credentials (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    accountId BIGINT UNSIGNED NOT NULL,
                    igApiKey TEXT,
                    igIdentifier VARCHAR(100),
                    igPassword TEXT,
                    derivApiToken TEXT,
                    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY (accountId)
                )
            """)

# ── TRADE LOGGING ───────────────────────────────────────────────

def insert_trade(
    account_id: int,
    user_id: int,
    symbol: str,
    direction: str,
    lot_size: float,
    entry_price: float,
    exit_price: Optional[float],
    profit_loss: float,
    profit_loss_pct: float,
    result_type: str,
    status: str,
    opened_at: Optional[datetime],
    closed_at: Optional[datetime],
    protection_trigger: str,
    broker_trade_id: Optional[str],
    notes: str = "",
) -> int:
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO trades (
                    accountId, userId, symbol, direction, lotSize,
                    entryPrice, exitPrice, profitLoss, profitLossPct,
                    resultType, status, openedAt, closedAt,
                    protectionTrigger, brokerTradeId, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                account_id, user_id, symbol, direction, lot_size,
                entry_price, exit_price, profit_loss, profit_loss_pct,
                result_type, status, opened_at, closed_at,
                protection_trigger, broker_trade_id, notes,
            ))
            return cur.lastrowid

def update_trade_closed(
    trade_id: int,
    exit_price: float,
    profit_loss: float,
    profit_loss_pct: float,
    result_type: str,
    protection_trigger: str,
    notes: str = "",
) -> None:
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE trades SET
                    exitPrice = %s,
                    profitLoss = %s,
                    profitLossPct = %s,
                    resultType = %s,
                    status = 'closed',
                    closedAt = NOW(),
                    protectionTrigger = %s,
                    notes = %s,
                    updatedAt = NOW()
                WHERE id = %s
            """, (exit_price, profit_loss, profit_loss_pct, result_type, protection_trigger, notes, trade_id))


def get_closed_trades(account_id: int) -> List[Dict]:
    """Load the closed-trade ledger used to rebuild risk budgets after restart."""
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT profitLoss AS profit_loss, closedAt AS closed_at
                FROM trades
                WHERE accountId = %s AND status = 'closed' AND closedAt IS NOT NULL
            """, (account_id,))
            return cur.fetchall()

# ── PROTECTION LOGS ─────────────────────────────────────────────

def insert_protection_log(
    account_id: int,
    user_id: int,
    trigger_type: str,
    profit_loss_at_trigger: float,
    profit_loss_pct_at_trigger: float,
    protected_amount: float,
    notes: str = "",
) -> int:
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO protection_logs (
                    accountId, userId, triggerType,
                    profitLossAtTrigger, profitLossPctAtTrigger,
                    protectedAmount, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                account_id, user_id, trigger_type,
                profit_loss_at_trigger, profit_loss_pct_at_trigger,
                protected_amount, notes,
            ))
            return cur.lastrowid

# ── ACCOUNT BALANCE UPDATE ──────────────────────────────────────

def update_account_balance(account_id: int, balance: float) -> None:
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE accounts SET currentBalance = %s, updatedAt = NOW() WHERE id = %s",
                (balance, account_id),
            )

# ── NOTIFICATIONS ───────────────────────────────────────────────

def insert_notification(
    user_id: int,
    notif_type: str,
    title: str,
    message: str,
) -> int:
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO notifications (userId, type, title, message)
                VALUES (%s, %s, %s, %s)
            """, (user_id, notif_type, title, message))
            return cur.lastrowid


def ensure_risk_lockouts_table():
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS risk_lockouts (
                    accountId BIGINT UNSIGNED PRIMARY KEY,
                    dailyLockedUntil DATETIME NULL,
                    dailyBreachKey VARCHAR(10) NULL,
                    weeklyLockedUntil DATETIME NULL,
                    monthlyLockedUntil DATETIME NULL,
                    monthKey VARCHAR(7) NULL,
                    weeklyBreachWeeks TEXT NULL,
                    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            """)

def get_risk_lockout(account_id: int):
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM risk_lockouts WHERE accountId=%s LIMIT 1", (account_id,))
            return cur.fetchone()

def active_risk_lockout(account_id: int, now: Optional[datetime] = None) -> Optional[str]:
    now = now or datetime.utcnow()
    state = get_risk_lockout(account_id)
    if not state:
        return None
    for field, label in (
        ("monthlyLockedUntil", "monthly_limit"),
        ("weeklyLockedUntil", "weekly_limit"),
        ("dailyLockedUntil", "daily_limit"),
    ):
        until = state.get(field)
        if until and now < until:
            return label
    return None

def _end_of_trading_week(now: datetime) -> datetime:
    days = (6 - now.weekday()) % 7
    target = (now + timedelta(days=days)).replace(hour=22, minute=0, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=7)
    return target

def _end_of_trading_month(now: datetime) -> datetime:
    year, month = now.year, now.month + 1
    if month == 13:
        year, month = year + 1, 1
    return datetime(year, month, 1, 22, 0, 0)

def record_risk_breach(account_id: int, trigger: str, now: Optional[datetime] = None) -> str:
    from engine.risk import get_trading_day_key, get_trading_month_key, get_trading_week_key
    now = now or datetime.utcnow()
    ensure_risk_lockouts_table()
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM risk_lockouts WHERE accountId=%s LIMIT 1", (account_id,))
            state = cur.fetchone() or {}
            daily_until = state.get("dailyLockedUntil")
            daily_breach_key = state.get("dailyBreachKey")
            weekly_until = state.get("weeklyLockedUntil")
            monthly_until = state.get("monthlyLockedUntil")
            month_key = get_trading_month_key(now)
            stored_month = state.get("monthKey")
            weeks = [] if stored_month != month_key else [
                item for item in (state.get("weeklyBreachWeeks") or "").split(",") if item
            ]

            result = trigger
            if trigger == "daily_limit":
                # Permit one 12-hour cooldown per trading day, then allow resume.
                current_day = get_trading_day_key(now)
                if daily_breach_key == current_day:
                    return "daily_limit"
                daily_breach_key = current_day
                daily_until = now + timedelta(hours=12)
            elif trigger == "weekly_limit":
                week_key = get_trading_week_key(now)
                if week_key not in weeks:
                    weeks.append(week_key)
                if len(weeks) >= 2:
                    monthly_until = _end_of_trading_month(now)
                    result = "monthly_limit"
                else:
                    weekly_until = _end_of_trading_week(now)
            elif trigger == "monthly_limit":
                monthly_until = _end_of_trading_month(now)

            cur.execute("""
                INSERT INTO risk_lockouts
                    (accountId, dailyLockedUntil, dailyBreachKey, weeklyLockedUntil, monthlyLockedUntil, monthKey, weeklyBreachWeeks)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    dailyLockedUntil=VALUES(dailyLockedUntil),
                    dailyBreachKey=VALUES(dailyBreachKey),
                    weeklyLockedUntil=VALUES(weeklyLockedUntil),
                    monthlyLockedUntil=VALUES(monthlyLockedUntil),
                    monthKey=VALUES(monthKey),
                    weeklyBreachWeeks=VALUES(weeklyBreachWeeks)
            """, (account_id, daily_until, daily_breach_key, weekly_until, monthly_until, month_key, ",".join(weeks)))
    return result

# ── RUNTIME STATE (in-memory table for engine heartbeat) ────────

def ensure_state_table():
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS engine_state (
                    id INT PRIMARY KEY DEFAULT 1,
                    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    status VARCHAR(50) DEFAULT 'running',
                    message TEXT
                )
            """)
            cur.execute("""
                INSERT INTO engine_state (id, last_heartbeat, status)
                VALUES (1, NOW(), 'running')
                ON DUPLICATE KEY UPDATE last_heartbeat = NOW(), status = 'running'
            """)

def update_heartbeat(message: str = ""):
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE engine_state SET last_heartbeat = NOW(), message = %s WHERE id = 1",
                (message,),
            )
