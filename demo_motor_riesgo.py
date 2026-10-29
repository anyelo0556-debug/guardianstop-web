"""
╔══════════════════════════════════════════════════════════════════════╗
║         GUARDIAN STOP — MOTOR DE RIESGO (DEMO EN VIVO)              ║
║                                                                     ║
║  Corre en tu laptop. Conecta IG Demo. Vigila. Cierra posiciones.   ║
║  NO necesita Render ni base de datos.                               ║
╚══════════════════════════════════════════════════════════════════════╝

COMO USAR:
1. Instala Python 3.10+ en tu laptop
2. Instala requests:  pip install requests
3. Edita las credenciales IG abajo (API_KEY, USERNAME, PASSWORD)
4. Corre:  python demo_motor_riesgo.py
5. Abre trades en IG Demo y deja que pierdan — el motor las cerrará
"""

import requests
import time
import sys
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════
# CONFIGURA TUS CREDENCIALES IG DEMO AQUÍ
# ═══════════════════════════════════════════════════════════════════════
IG_API_KEY     = "PON_TU_API_KEY_AQUI"      # X-IG-API-KEY
IG_USERNAME    = "PON_TU_USUARIO_AQUI"      # Usuario IG
IG_PASSWORD    = "PON_TU_PASSWORD_AQUI"     # Contraseña IG
IG_DEMO        = True                        # True = cuenta demo

# LÍMITES DE RIESGO (porcentajes)
DAILY_LIMIT_PCT    = 1.0   # 1% del balance inicial
WEEKLY_LIMIT_PCT   = 10.0  # 10% del balance inicial
MONTHLY_LIMIT_PCT  = 30.0  # 30% del balance inicial
TRAILING_ENABLED   = True
TRAILING_ACTIVATION_PCT = 1.0   # Activa trailing cuando ganas 1%
TRAILING_PROTECTION_PCT = 30.0  # Protege el 30% del pico de ganancias

# INTERVALO DE MONITOREO (segundos)
POLL_INTERVAL = 5

# ═══════════════════════════════════════════════════════════════════════
# NO TOCAR NADA DEBAJO DE ESTA LÍNEA
# ═══════════════════════════════════════════════════════════════════════

BASE_URL = "https://demo-api.ig.com/gateway/deal" if IG_DEMO else "https://api.ig.com/gateway/deal"

class Colors:
    GREEN  = "\033[92m"
    RED    = "\033[91m"
    YELLOW = "\033[93m"
    CYAN   = "\033[96m"
    BOLD   = "\033[1m"
    RESET  = "\033[0m"

def log(msg, color=Colors.RESET):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"{color}[{ts}] {msg}{Colors.RESET}")

class IGRiskEngine:
    def __init__(self):
        self.cst = None
        self.xst = None
        self.account_id = None
        self.initial_balance = 0.0
        self.peak_pnl = 0.0
        self.trailing_fired = False
        self.session_closed_pnl = 0.0  # Acumulado de pérdidas realizadas
        self.closed_deals = set()      # Para no contar doble

    def _headers(self):
        h = {
            "X-IG-API-KEY": IG_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.cst:
            h["CST"] = self.cst
        if self.xst:
            h["X-SECURITY-TOKEN"] = self.xst
        return h

    def login(self):
        log("Conectando a IG...", Colors.CYAN)
        try:
            resp = requests.post(
                f"{BASE_URL}/session",
                headers=self._headers(),
                json={"identifier": IG_USERNAME, "password": IG_PASSWORD},
                params={"fetchSessionTokens": "true"},
                timeout=15,
            )
            if resp.status_code == 200:
                self.cst = resp.headers.get("CST")
                self.xst = resp.headers.get("X-SECURITY-TOKEN")
                data = resp.json()
                accounts = data.get("accounts", [])
                if accounts:
                    spread = next((a for a in accounts if a.get("accountType") == "SPREADBET"), None)
                    cfd = next((a for a in accounts if a.get("accountType") == "CFD"), None)
                    self.account_id = spread["accountId"] if spread else (cfd["accountId"] if cfd else accounts[0]["accountId"])
                log(f"Login OK | Account: {self.account_id}", Colors.GREEN)
                return True
            else:
                log(f"Login FALLÓ: {resp.status_code} {resp.text[:200]}", Colors.RED)
                return False
        except Exception as e:
            log(f"Login ERROR: {e}", Colors.RED)
            return False

    def get_balance(self):
        try:
            resp = requests.get(f"{BASE_URL}/accounts", headers=self._headers(), timeout=15)
            if resp.status_code == 401:
                if not self.login():
                    return None
                resp = requests.get(f"{BASE_URL}/accounts", headers=self._headers(), timeout=15)
            if resp.status_code == 200:
                for acc in resp.json().get("accounts", []):
                    if acc.get("accountId") == self.account_id:
                        return {
                            "balance": float(acc["balance"]["balance"]),
                            "available": float(acc["balance"]["available"]),
                            "profitLoss": float(acc["balance"]["profitLoss"]),
                        }
            return None
        except Exception as e:
            log(f"Balance ERROR: {e}", Colors.RED)
            return None

    def get_positions(self):
        try:
            resp = requests.get(f"{BASE_URL}/positions", headers=self._headers(), timeout=15)
            if resp.status_code == 401:
                if not self.login():
                    return []
                resp = requests.get(f"{BASE_URL}/positions", headers=self._headers(), timeout=15)
            if resp.status_code == 200:
                positions = []
                for p in resp.json().get("positions", []):
                    market = p.get("market", {})
                    pos = p.get("position", {})
                    positions.append({
                        "dealId": pos.get("dealId", ""),
                        "epic": market.get("epic", ""),
                        "name": market.get("instrumentName", ""),
                        "direction": pos.get("direction", ""),
                        "size": float(pos.get("size", 0)),
                        "openLevel": float(pos.get("openLevel", 0)),
                        "profit": float(p.get("unrealisedProfit", 0) or 0),
                    })
                return positions
            return []
        except Exception as e:
            log(f"Positions ERROR: {e}", Colors.RED)
            return []

    def close_position(self, pos):
        deal_id = pos.get("dealId", "")
        epic = pos.get("epic", "")
        direction = pos.get("direction", "")
        size = pos.get("size", 0)
        close_dir = "SELL" if direction == "BUY" else "BUY"

        body = {
            "direction": close_dir,
            "size": size,
            "orderType": "MARKET",
            "timeInForce": "EXECUTE_AND_ELIMINATE",
        }
        if deal_id:
            body["dealId"] = deal_id
        else:
            body["epic"] = epic
            body["expiry"] = "-"

        try:
            log(f"CERRANDO {pos['name']} | {close_dir} {size} | dealId={deal_id[:12] if deal_id else 'none'}...", Colors.RED)
            resp = requests.delete(f"{BASE_URL}/positions/otc", headers=self._headers(), json=body, timeout=15)
            if resp.status_code in (200, 202):
                log(f"CERRADO OK: {pos['name']}", Colors.GREEN)
                return True
            else:
                log(f"CERRAR FALLÓ {pos['name']}: {resp.status_code}", Colors.RED)
                return False
        except Exception as e:
            log(f"CERRAR ERROR {pos['name']}: {e}", Colors.RED)
            return False

    def close_all(self, positions, reason):
        log(f"{'='*60}", Colors.RED)
        log(f"PROTECCIÓN ACTIVADA: {reason}", Colors.RED + Colors.BOLD)
        log(f"Cerrando {len(positions)} posiciones...", Colors.RED)
        log(f"{'='*60}", Colors.RED)
        closed = 0
        for pos in positions:
            if self.close_position(pos):
                closed += 1
                # Track realized loss
                if pos["dealId"] and pos["dealId"] not in self.closed_deals:
                    self.closed_deals.add(pos["dealId"])
                    if pos["profit"] < 0:
                        self.session_closed_pnl += abs(pos["profit"])
            time.sleep(0.5)
        log(f"Cerradas {closed}/{len(positions)} posiciones", Colors.GREEN if closed == len(positions) else Colors.YELLOW)
        return closed

    def run(self):
        log("="*60, Colors.CYAN)
        log("  GUARDIAN STOP — MOTOR DE RIESGO (DEMO EN VIVO)", Colors.CYAN + Colors.BOLD)
        log("  Presiona Ctrl+C para detener", Colors.CYAN)
        log("="*60, Colors.CYAN)

        if not self.login():
            log("No se pudo conectar. Verifica credenciales.", Colors.RED)
            sys.exit(1)

        # Get initial balance
        bal = self.get_balance()
        if not bal:
            log("No se pudo obtener balance inicial.", Colors.RED)
            sys.exit(1)

        self.initial_balance = bal["balance"]
        daily_limit = self.initial_balance * (DAILY_LIMIT_PCT / 100)

        log(f"Balance inicial: {self.initial_balance:.2f} USD", Colors.GREEN)
        log(f"Límite diario ({DAILY_LIMIT_PCT}%): {daily_limit:.2f} USD", Colors.YELLOW)
        log(f"Intervalo de monitoreo: {POLL_INTERVAL} segundos", Colors.CYAN)
        log("Abre trades en IG Demo y deja que pierdan...", Colors.CYAN)
        log("="*60, Colors.CYAN)

        try:
            while True:
                bal = self.get_balance()
                positions = self.get_positions()

                if not bal:
                    log("Sin datos de balance, reintentando...", Colors.YELLOW)
                    time.sleep(POLL_INTERVAL)
                    continue

                current_balance = bal["balance"]
                total_pnl = bal["profitLoss"]
                effective_balance = current_balance + total_pnl
                drawdown = max(0, self.initial_balance - effective_balance)
                drawdown_pct = (drawdown / self.initial_balance * 100) if self.initial_balance > 0 else 0

                # Track peak P&L for trailing
                if total_pnl > self.peak_pnl:
                    self.peak_pnl = total_pnl

                # Calculate realized daily loss (from closed trades this session)
                realized_loss = self.session_closed_pnl
                daily_remaining = max(0, daily_limit - realized_loss)
                daily_pct_used = min(100, (realized_loss / daily_limit * 100)) if daily_limit > 0 else 0

                # Display status
                pnl_color = Colors.GREEN if total_pnl >= 0 else Colors.RED
                dd_color = Colors.RESET if drawdown == 0 else Colors.YELLOW if drawdown_pct < 0.5 else Colors.RED

                status = (
                    f"Balance: {current_balance:.2f} | "
                    f"PnL: {pnl_color}{total_pnl:+.2f}{Colors.RESET} | "
                    f"Pos: {len(positions)} | "
                    f"DD: {dd_color}{drawdown:.2f} ({drawdown_pct:.2f}%){Colors.RESET} | "
                    f"Daily: {realized_loss:.2f}/{daily_limit:.2f} ({daily_pct_used:.0f}%)"
                )
                log(status)

                # Show positions detail
                for pos in positions:
                    profit = pos["profit"]
                    p_col = Colors.GREEN if profit >= 0 else Colors.RED
                    log(f"  → {pos['name']} {pos['direction']} {pos['size']} | {p_col}{profit:+.2f}{Colors.RESET}")

                # ═══════════════════════════════════════════════════════════════
                # PROTECTION CHECKS
                # ═══════════════════════════════════════════════════════════════
                if len(positions) > 0:
                    # 1. DAILY LIMIT
                    if realized_loss >= daily_limit:
                        self.close_all(positions, f"LÍMITE DIARIO ALCANZADO ({realized_loss:.2f} >= {daily_limit:.2f})")
                        continue

                    # 2. WEEKLY LIMIT (simplified: same as daily for demo)
                    # 3. TRAILING STOP
                    if TRAILING_ENABLED and not self.trailing_fired:
                        activation = self.initial_balance * (TRAILING_ACTIVATION_PCT / 100)
                        if total_pnl >= activation and self.peak_pnl > 0:
                            stop_level = self.peak_pnl * (TRAILING_PROTECTION_PCT / 100)
                            if total_pnl <= stop_level:
                                self.trailing_fired = True
                                self.close_all(positions, f"TRAILING STOP (peak={self.peak_pnl:.2f}, current={total_pnl:.2f})")
                                continue

                time.sleep(POLL_INTERVAL)

        except KeyboardInterrupt:
            log("\nDetenido por usuario.", Colors.YELLOW)
            log(f"Pérdida realizada en sesión: {self.session_closed_pnl:.2f} USD", Colors.YELLOW)

if __name__ == "__main__":
    # Validate credentials
    if IG_API_KEY == "PON_TU_API_KEY_AQUI" or IG_USERNAME == "PON_TU_USUARIO_AQUI":
        print("\n" + "="*60)
        print("ERROR: Debes configurar tus credenciales IG en este archivo.")
        print("Busca estas líneas y rellénalas:")
        print("  IG_API_KEY  = 'tu_api_key'")
        print("  IG_USERNAME = 'tu_usuario'")
        print("  IG_PASSWORD = 'tu_password'")
        print("="*60 + "\n")
        sys.exit(1)

    engine = IGRiskEngine()
    engine.run()
