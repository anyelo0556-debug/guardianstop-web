"""Guardian Stop database client for the Python risk engine."""
import os
import pymysql
from datetime import datetime
from typing import List, Dict, Optional
from contextlib import contextmanager

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
    ssl_config = {"ca": "/etc/ssl/certs/ca-certificates.crt"} if os.path.exists("/etc/ssl/certs/ca-certificates.crt") else {"ca": "/etc/ssl/cert.pem"} if os.path.exists("/etc/ssl/cert.pem") else None
    conn = pymysql.connect(
        host=_pool_kwargs["host"], port=_pool_kwargs["port"], user=_pool_kwargs["user"],
        password=_pool_kwargs["password"], database=_pool_kwargs["database"],
        charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor, autocommit=True,
        ssl=ssl_config, connect_timeout=10, read_timeout=10, write_timeout=10,
    )
    try:
        yield conn
    finally:
        conn.close()

def _decrypt_secret(value):
    """Decrypt AES-256-GCM values written by the Node API; pass through legacy plaintext."""
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
        return aes.decrypt(bytes.fromhex(iv_hex), bytes.fromhex(ciphertext_hex) + bytes.fromhex(tag_hex), None).decode("utf-8")
    except Exception as exc:
        raise RuntimeError("Unable to decrypt broker credential; check encryption key") from exc

def get_active_accounts() -> List[Dict]:
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    a.id AS accountId, a.userId, a.brokerName, a.accountNumber,
                    a.accountType, a.initialCapital, a.currentBalance,
                    a.dailyLimitPct, a.weeklyLimitPct,
                    CASE WHEN a.monthlyLimitPct > 20 THEN 20 ELSE COALESCE(a.monthlyLimitPct, 20) END AS monthlyLimitPct,
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

def ensure_credentials_table():
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS account_credentials (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    accountId BIGINT UNSIGNED NOT NULL,
                    igApiKey VARCHAR(512), igIdentifier VARCHAR(100),
                    igPassword TEXT, derivApiToken VARCHAR(512),
                    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY (accountId)
                )
            """)

def insert_trade(account_id: int, user_id: int, symbol: str, direction: str, lot_size: float,
                 entry_price: float, exit_price: Optional[float], profit_loss: float,
                 profit_loss_pct: float, result_type: str, status: str,
                 opened_at: Optional[datetime], closed_at: Optional[datetime],
                 protection_trigger: str, broker_trade_id: Optional[str], notes: str = "") -> int:
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO trades (accountId, userId, symbol, direction, lotSize, entryPrice,
                    exitPrice, profitLoss, profitLossPct, resultType, status, openedAt,
                    closedAt, protectionTrigger, brokerTradeId, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (account_id, user_id, symbol, direction, lot_size, entry_price, exit_price,
                  profit_loss, profit_loss_pct, result_type, status, opened_at, closed_at,
                  protection_trigger, broker_trade_id, notes))
            return cur.lastrowid

def update_trade_closed(trade_id: int, exit_price: float, profit_loss: float, profit_loss_pct: float,
                        result_type: str, protection_trigger: str, notes: str = "") -> None:
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE trades SET exitPrice=%s, profitLoss=%s, profitLossPct=%s,
                    resultType=%s, status='closed', closedAt=NOW(), protectionTrigger=%s,
                    notes=%s, updatedAt=NOW() WHERE id=%s
            """, (exit_price, profit_loss, profit_loss_pct, result_type, protection_trigger, notes, trade_id))

def get_closed_trades(account_id: int) -> List[Dict]:
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT profitLoss AS profit_loss, closedAt AS closed_at
                FROM trades WHERE accountId=%s AND status='closed' AND closedAt IS NOT NULL
            """, (account_id,))
            return cur.fetchall()

def insert_protection_log(account_id: int, user_id: int, trigger_type: str,
                          profit_loss_at_trigger: float, profit_loss_pct_at_trigger: float,
                          protected_amount: float, notes: str = "") -> int:
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO protection_logs (accountId, userId, triggerType, profitLossAtTrigger,
                    profitLossPctAtTrigger, protectedAmount, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (account_id, user_id, trigger_type, profit_loss_at_trigger,
                  profit_loss_pct_at_trigger, protected_amount, notes))
            return cur.lastrowid

def update_account_balance(account_id: int, balance: float) -> None:
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE accounts SET currentBalance=%s, updatedAt=NOW() WHERE id=%s", (balance, account_id))

def insert_notification(user_id: int, notif_type: str, title: str, message: str) -> int:
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO notifications (userId, type, title, message) VALUES (%s, %s, %s, %s)",
                        (user_id, notif_type, title, message))
            return cur.lastrowid

def ensure_state_table():
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS engine_state (
                    id INT PRIMARY KEY DEFAULT 1,
                    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    status VARCHAR(50) DEFAULT 'running', message TEXT
                )
            """)
            cur.execute("""
                INSERT INTO engine_state (id, last_heartbeat, status) VALUES (1, NOW(), 'running')
                ON DUPLICATE KEY UPDATE last_heartbeat=NOW(), status='running'
            """)

def update_heartbeat(message: str = ""):
    with _conn() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE engine_state SET last_heartbeat=NOW(), message=%s WHERE id=1", (message,))
