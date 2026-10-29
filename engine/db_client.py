"""
Guardian Stop — Database Client for Risk Engine
Reads account configs and writes trade/protection logs.
"""
import os
import pymysql
from datetime import datetime
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

def get_active_accounts() -> List[Dict]:
    """Fetch all active trading accounts with broker credentials.
    Reads from account_credentials; if no linked account, uses defaults."""
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    ac.accountId,
                    COALESCE(a.userId, 1) AS userId,
                    COALESCE(a.brokerName, 'ig') AS brokerName,
                    COALESCE(a.accountNumber, '') AS accountNumber,
                    COALESCE(a.accountType, 'demo') AS accountType,
                    COALESCE(a.initialCapital, 10000) AS initialCapital,
                    COALESCE(a.currentBalance, 10000) AS currentBalance,
                    COALESCE(a.dailyLimitPct, 1.0) AS dailyLimitPct,
                    COALESCE(a.weeklyLimitPct, 10.0) AS weeklyLimitPct,
                    COALESCE(a.monthlyLimitPct, 30.0) AS monthlyLimitPct,
                    COALESCE(a.trailingEnabled, 0) AS trailingEnabled,
                    COALESCE(a.trailingActivationPct, 1.0) AS trailingActivationPct,
                    COALESCE(a.trailingProtectionPct, 30.0) AS trailingProtectionPct,
                    COALESCE(a.isActive, 1) AS isActive,
                    ac.igApiKey,
                    ac.igIdentifier,
                    ac.igPassword,
                    ac.derivApiToken
                FROM account_credentials ac
                LEFT JOIN accounts a ON a.id = ac.accountId
            """)
            return cur.fetchall()

# ── CREDENTIALS TABLE (must exist) ──────────────────────────────

def ensure_credentials_table():
    """Create table if not exists for broker API credentials."""
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS account_credentials (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    accountId BIGINT UNSIGNED NOT NULL,
                    igApiKey VARCHAR(255),
                    igIdentifier VARCHAR(100),
                    igPassword TEXT,
                    derivApiToken VARCHAR(255),
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
