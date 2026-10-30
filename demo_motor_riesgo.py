"""
╔══════════════════════════════════════════════════════════════════════╗
║         GUARDIAN STOP — MOTOR DE RIESGO (DEMO EN VIVO)              ║
║                                                                     ║
║  Corre en tu laptop. Conecta IG Demo. Vigila. Cierra posiciones.   ║
║  NO necesita Render ni base de datos.                               ║
╚══════════════════════════════════════════════════════════════════════╝

COMO USAR:
1. Edita las credenciales IG abajo
2. Corre:  python demo_motor_riesgo.py
3. Abre trades en IG Demo — el motor las cerrará al alcanzar el límite
"""

import requests
import time
import sys
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════
# CONFIGURA TUS CREDENCIALES IG DEMO AQUÍ
# ═══════════════════════════════════════════════════════════════════════
IG_API_KEY     = "37f75d11dece9df84f62be9829e5e41a794ff42a"
IG_USERNAME    = "angel0556d"
IG_PASSWORD    = "7@95W46vcvHsr7a"
IG_DEMO        = True

# LÍMITES DE RIESGO
DAILY_LIMIT_PCT    = 1.0
TRAILING_ENABLED   = True
TRAILING_ACTIVATION_PCT = 1.0
TRAILING_PROTECTION_PCT = 30.0

# INTERVALO DE MONITOREO (segundos)
POLL_INTERVAL = 5

# ═══════════════════════════════════════════════════════════════════════
# NO TOCAR NADA DEBAJO DE ESTA LÍNEA
# ═══════════════════════════════════════════════════════════════════════

BASE_URL = "https://demo-api.ig.com/gateway/deal" if IG_DEMO else "https://api.ig.com/gateway/deal"

class C:
    G = "\033[92m"   # Verde
    R = "\033[91m"   # Rojo
    Y = "\033[93m"   # Amarillo
    C = "\033[96m"   # Cyan
    B = "\033[1m"    # Bold
    X = "\033[0m"    # Reset

def ts():
    return datetime.now().strftime("%H:%M:%S")

class Engine:
    def __init__(self):
        self.cst = None
        self.xst = None
        self.acc = None
        self.initial_bal = 0.0
        self.peak = 0.0
        self.trailing_fired = False
        self.realized = 0.0
        self.closed_ids = set()
        self.last_pos_count = -1
        self.last_pos_detail = ""

    def hdr(self):
        h = {"X-IG-API-KEY": IG_API_KEY, "Content-Type": "application/json", "Accept": "application/json"}
        if self.cst: h["CST"] = self.cst
        if self.xst: h["X-SECURITY-TOKEN"] = self.xst
        return h

    def login(self):
        print(f"[{ts()}] {C.C}Conectando a IG...{C.X}")
        try:
            r = requests.post(f"{BASE_URL}/session", headers=self.hdr(),
                              json={"identifier": IG_USERNAME, "password": IG_PASSWORD},
                              params={"fetchSessionTokens": "true"}, timeout=15)
            if r.status_code == 200:
                self.cst = r.headers.get("CST")
                self.xst = r.headers.get("X-SECURITY-TOKEN")
                data = r.json()
                accs = data.get("accounts", [])
                if accs:
                    spread = next((a for a in accs if a.get("accountType") == "SPREADBET"), None)
                    cfd = next((a for a in accs if a.get("accountType") == "CFD"), None)
                    self.acc = spread["accountId"] if spread else (cfd["accountId"] if cfd else accs[0]["accountId"])
                print(f"[{ts()}] {C.G}Login OK | Cuenta: {self.acc}{C.X}")
                return True
            else:
                print(f"[{ts()}] {C.R}Login FALLÓ: {r.status_code}{C.X}")
                return False
        except Exception as e:
            print(f"[{ts()}] {C.R}Login ERROR: {e}{C.X}")
            return False

    def balance(self):
        try:
            r = requests.get(f"{BASE_URL}/accounts", headers=self.hdr(), timeout=15)
            if r.status_code == 401:
                if not self.login(): return None
                r = requests.get(f"{BASE_URL}/accounts", headers=self.hdr(), timeout=15)
            if r.status_code == 200:
                for a in r.json().get("accounts", []):
                    if a.get("accountId") == self.acc:
                        return {
                            "balance": float(a["balance"]["balance"]),
                            "available": float(a["balance"]["available"]),
                            "pnl": float(a["balance"]["profitLoss"]),
                        }
            return None
        except Exception as e:
            print(f"[{ts()}] {C.R}Balance ERROR: {e}{C.X}")
            return None

    def positions(self):
        try:
            r = requests.get(f"{BASE_URL}/positions", headers=self.hdr(), timeout=15)
            if r.status_code == 401:
                if not self.login(): return []
                r = requests.get(f"{BASE_URL}/positions", headers=self.hdr(), timeout=15)
            if r.status_code == 200:
                out = []
                for p in r.json().get("positions", []):
                    m = p.get("market", {})
                    pos = p.get("position", {})
                    # IG usa dealSize; fallback a size
                    size = float(pos.get("dealSize", pos.get("size", 0)))
                    out.append({
                        "id": pos.get("dealId", ""),
                        "epic": m.get("epic", ""),
                        "name": m.get("instrumentName", ""),
                        "dir": pos.get("direction", ""),
                        "size": size,
                        "profit": float(p.get("unrealisedProfit", 0) or 0),
                    })
                return out
            return []
        except Exception as e:
            print(f"[{ts()}] {C.R}Posiciones ERROR: {e}{C.X}")
            return []

    def close_one(self, pos):
        deal = pos.get("id", "")
        epic = pos.get("epic", "")
        direction = pos.get("dir", "")
        size = pos.get("size", 0)
        if size <= 0:
            print(f"[{ts()}] {C.R}ERROR: size=0, no se puede cerrar {pos['name']}{C.X}")
            return False
        close_dir = "SELL" if direction == "BUY" else "BUY"
        body = {"direction": close_dir, "size": size, "orderType": "MARKET", "timeInForce": "EXECUTE_AND_ELIMINATE"}
        if deal:
            body["dealId"] = deal
        else:
            body["epic"] = epic
            body["expiry"] = "-"
        try:
            print(f"[{ts()}] {C.R}CERRANDO {pos['name']} | {close_dir} {size} | dealId={deal[:12] if deal else 'none'}...{C.X}")
            r = requests.delete(f"{BASE_URL}/positions/otc", headers=self.hdr(), json=body, timeout=15)
            if r.status_code in (200, 202):
                print(f"[{ts()}] {C.G}CERRADO OK: {pos['name']}{C.X}")
                return True
            else:
                print(f"[{ts()}] {C.R}CERRAR FALLÓ {pos['name']}: {r.status_code}{C.X}")
                return False
        except Exception as e:
            print(f"[{ts()}] {C.R}CERRAR ERROR {pos['name']}: {e}{C.X}")
            return False

    def close_all(self, positions, reason):
        print(f"\n{C.R}{'='*60}{C.X}")
        print(f"{C.R}{C.B} PROTECCIÓN ACTIVADA: {reason}{C.X}")
        print(f"{C.R}{'='*60}{C.X}")
        closed = 0
        for pos in positions:
            if self.close_one(pos):
                closed += 1
                if pos["id"] and pos["id"] not in self.closed_ids:
                    self.closed_ids.add(pos["id"])
                    if pos["profit"] < 0:
                        self.realized += abs(pos["profit"])
            time.sleep(0.5)
        print(f"[{ts()}] {C.G if closed == len(positions) else C.Y}Cerradas {closed}/{len(positions)} posiciones{C.X}\n")
        return closed

    def run(self):
        print(f"\n{'='*60}")
        print(f"  GUARDIAN STOP — MOTOR DE RIESGO")
        print(f"  Presiona Ctrl+C para detener")
        print(f"{'='*60}\n")

        if not self.login():
            sys.exit(1)

        bal = self.balance()
        if not bal:
            print(f"[{ts()}] {C.R}No se pudo obtener balance.{C.X}")
            sys.exit(1)

        self.initial_bal = bal["balance"]
        daily_limit = self.initial_bal * (DAILY_LIMIT_PCT / 100)

        print(f"[{ts()}] {C.G}Balance inicial: {self.initial_bal:.2f} USD{C.X}")
        print(f"[{ts()}] {C.Y}Límite diario ({DAILY_LIMIT_PCT}%): {daily_limit:.2f} USD{C.X}")
        print(f"[{ts()}] {C.C}Intervalo: {POLL_INTERVAL}s | Esperando trades...{C.X}\n")

        try:
            while True:
                bal = self.balance()
                pos = self.positions()

                if not bal:
                    time.sleep(POLL_INTERVAL)
                    continue

                current = bal["balance"]
                pnl = bal["pnl"]
                eff = current + pnl
                dd = max(0, self.initial_bal - eff)
                dd_pct = (dd / self.initial_bal * 100) if self.initial_bal > 0 else 0

                if pnl > self.peak:
                    self.peak = pnl

                daily_used = min(100, (self.realized / daily_limit * 100)) if daily_limit > 0 else 0

                # Color del PnL
                pcol = C.G if pnl >= 0 else C.R
                # Color del drawdown
                dcol = C.X if dd == 0 else C.Y if dd_pct < 0.5 else C.R

                # Línea de estado compacta
                status = f"[{ts()}] Bal:{current:.0f} | PnL:{pcol}{pnl:+.2f}{C.X} | Pos:{len(pos)} | DD:{dcol}{dd:.2f} ({dd_pct:.2f}%){C.X} | Daily:{self.realized:.2f}/{daily_limit:.2f} ({daily_used:.0f}%)"
                print(status)

                # Mostrar detalle de posiciones SOLO si cambió
                pos_detail = " | ".join([f"{p['name']} {p['dir']} {p['size']} ({p['profit']:+.2f})" for p in pos])
                if pos_detail != self.last_pos_detail or len(pos) != self.last_pos_count:
                    if pos:
                        for p in pos:
                            pcol = C.G if p["profit"] >= 0 else C.R
                            print(f"         → {p['name']} {p['dir']} x{p['size']} | {pcol}{p['profit']:+.2f}{C.X}")
                    else:
                        print(f"         → Sin posiciones abiertas")
                    self.last_pos_detail = pos_detail
                    self.last_pos_count = len(pos)

                # PROTECCIÓN
                if len(pos) > 0:
                    if self.realized >= daily_limit:
                        self.close_all(pos, f"LÍMITE DIARIO ({self.realized:.2f} >= {daily_limit:.2f})")
                        continue

                    if TRAILING_ENABLED and not self.trailing_fired:
                        activation = self.initial_bal * (TRAILING_ACTIVATION_PCT / 100)
                        if pnl >= activation and self.peak > 0:
                            stop = self.peak * (TRAILING_PROTECTION_PCT / 100)
                            if pnl <= stop:
                                self.trailing_fired = True
                                self.close_all(pos, f"TRAILING STOP (peak={self.peak:.2f} → now={pnl:.2f})")
                                continue

                time.sleep(POLL_INTERVAL)

        except KeyboardInterrupt:
            print(f"\n[{ts()}] {C.Y}Detenido. Pérdida realizada: {self.realized:.2f} USD{C.X}")

if __name__ == "__main__":
    Engine().run()
