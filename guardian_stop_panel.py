"""
╔══════════════════════════════════════════════════════════════════════════════╗
║           GUARDIAN STOP — PANEL DE CONTROL VISUAL (PYTHON)                  ║
║                                                                              ║
║  Interfaz gráfica profesional. Conecta IG. Monitorea. Cierra. Guarda.       ║
║  NO necesita Render ni base de datos. Historial en archivo JSON local.      ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import requests
import time
import sys
import json
import os
import threading
from datetime import datetime

try:
    import tkinter as tk
    from tkinter import ttk, messagebox, scrolledtext
except ImportError:
    print("ERROR: tkinter no está disponible. Instala Python con TCL/TK.")
    sys.exit(1)

# ══════════════════════════════════════════════════════════════════════════════
# CREDENCIALES IG — Edita aquí
# ══════════════════════════════════════════════════════════════════════════════
IG_API_KEY  = "37f75d11dece9df84f62be9829e5e41a794ff42a"
IG_USERNAME = "angel0556d"
IG_PASSWORD = "7@95W46vcvHsr7a"
IG_DEMO     = True

# CONFIGURACIÓN
DAILY_LIMIT_PCT    = 1.0
TRAILING_ENABLED   = True
TRAILING_PROTECTION_PCT = 30.0
POLL_INTERVAL      = 3  # segundos

# ARCHIVO DE HISTORIAL LOCAL
HISTORY_FILE = "guardian_stop_history.json"

BASE_URL = "https://demo-api.ig.com/gateway/deal" if IG_DEMO else "https://api.ig.com/gateway/deal"

# ══════════════════════════════════════════════════════════════════════════════
# COLORES
# ══════════════════════════════════════════════════════════════════════════════
BG_MAIN    = "#0a0e17"
BG_PANEL   = "#111827"
BG_CELL    = "#1a2236"
FG_GREEN   = "#22c55e"
FG_RED     = "#ef4444"
FG_YELLOW  = "#eab308"
FG_CYAN    = "#06b6d4"
FG_WHITE   = "#f8fafc"
FG_GRAY    = "#94a3b8"
ACCENT     = "#f59e0b"

# ══════════════════════════════════════════════════════════════════════════════
# MOTOR DE RIESGO
# ══════════════════════════════════════════════════════════════════════════════
class RiskEngine:
    def __init__(self):
        self.cst = None
        self.xst = None
        self.account_id = None
        self.initial_balance = 0.0
        self.peak_pnl = 0.0
        self.trailing_fired = False
        self.realized_loss = 0.0
        self.closed_ids = set()
        self.daily_limit = 0.0
        self.session_active = False
        self.positions = []
        self.balance_data = {}
        self.protection_mode = "NORMAL"  # NORMAL → PROTECTED (después del 1er cierre)
        self.last_close_reason = ""

    def headers(self):
        h = {"X-IG-API-KEY": IG_API_KEY, "Content-Type": "application/json", "Accept": "application/json"}
        if self.cst: h["CST"] = self.cst
        if self.xst: h["X-SECURITY-TOKEN"] = self.xst
        return h

    def login(self):
        try:
            r = requests.post(f"{BASE_URL}/session", headers=self.headers(),
                              json={"identifier": IG_USERNAME, "password": IG_PASSWORD},
                              params={"fetchSessionTokens": "true"}, timeout=15)
            if r.status_code == 200:
                self.cst = r.headers.get("CST")
                self.xst = r.headers.get("X-SECURITY-TOKEN")
                accs = r.json().get("accounts", [])
                if accs:
                    spread = next((a for a in accs if a.get("accountType") == "SPREADBET"), None)
                    cfd = next((a for a in accs if a.get("accountType") == "CFD"), None)
                    self.account_id = spread["accountId"] if spread else (cfd["accountId"] if cfd else accs[0]["accountId"])
                return True, f"Login OK | Cuenta: {self.account_id}"
            return False, f"Login FALLÓ: {r.status_code}"
        except Exception as e:
            return False, f"Login ERROR: {e}"

    def fetch_balance(self):
        try:
            r = requests.get(f"{BASE_URL}/accounts", headers=self.headers(), timeout=15)
            if r.status_code == 401:
                if not self.login()[0]: return None
                r = requests.get(f"{BASE_URL}/accounts", headers=self.headers(), timeout=15)
            if r.status_code == 200:
                for a in r.json().get("accounts", []):
                    if a.get("accountId") == self.account_id:
                        return {
                            "balance": float(a["balance"]["balance"]),
                            "available": float(a["balance"]["available"]),
                            "pnl": float(a["balance"]["profitLoss"]),
                            "margin": float(a["balance"].get("deposit", 0)),
                        }
            return None
        except Exception as e:
            return None

    def fetch_positions(self):
        try:
            r = requests.get(f"{BASE_URL}/positions", headers=self.headers(), timeout=15)
            if r.status_code == 401:
                if not self.login()[0]: return []
                r = requests.get(f"{BASE_URL}/positions", headers=self.headers(), timeout=15)
            if r.status_code == 200:
                out = []
                data = r.json()
                # Guardar respuesta cruda para debug
                with open("_last_positions.json", "w") as f:
                    json.dump(data, f, indent=2, default=str)
                for p in data.get("positions", []):
                    m = p.get("market", {})
                    pos = p.get("position", {})
                    size = float(pos.get("dealSize", pos.get("size", 0)))
                    # IG puede tener el P&L en varios campos
                    profit = 0.0
                    for field in ["unrealisedProfit", "unrealisedProfitLoss", "profit", "upl", "unrealisedPnl"]:
                        val = p.get(field, pos.get(field))
                        if val is not None:
                            try:
                                profit = float(val)
                                break
                            except:
                                continue
                    deal_id = pos.get("dealId", "") or pos.get("dealReference", "")
                    out.append({
                        "id": deal_id,
                        "epic": m.get("epic", ""),
                        "name": m.get("instrumentName", pos.get("instrumentName", "Unknown")),
                        "dir": pos.get("direction", ""),
                        "size": size,
                        "open": float(pos.get("openLevel", 0)),
                        "profit": profit,
                    })
                return out
            return []
        except Exception as e:
            print(f"[ERROR fetch_positions] {e}")
            return []

    def close_position(self, pos):
        deal = pos.get("id", "")
        epic = pos.get("epic", "")
        direction = pos.get("dir", "")
        size = pos.get("size", 0)
        name = pos.get("name", "Unknown")
        if size <= 0:
            return False, f"Size=0, no se puede cerrar {name}"
        close_dir = "SELL" if direction == "BUY" else "BUY"

        # IG requiere header Version para cierre
        h = self.headers()
        h["Version"] = "1"

        # Intento 1: con dealId
        if deal:
            body = {
                "dealId": deal,
                "direction": close_dir,
                "size": size,
                "orderType": "MARKET",
                "timeInForce": "EXECUTE_AND_ELIMINATE",
            }
            try:
                print(f"[CLOSE] Intentando dealId={deal[:20]}... {close_dir} x{size}")
                r = requests.delete(f"{BASE_URL}/positions/otc", headers=h, json=body, timeout=15)
                print(f"[CLOSE] dealId status: {r.status_code} | {r.text[:100]}")
                if r.status_code in (200, 202):
                    return True, f"Cerrado: {name} {close_dir} x{size}"
            except Exception as e:
                print(f"[CLOSE] dealId error: {e}")

        # Intento 2: con epic+expiry
        if epic:
            body = {
                "epic": epic,
                "expiry": "-",
                "direction": close_dir,
                "size": size,
                "orderType": "MARKET",
                "timeInForce": "EXECUTE_AND_ELIMINATE",
            }
            try:
                print(f"[CLOSE] Intentando epic={epic} fallback...")
                r = requests.delete(f"{BASE_URL}/positions/otc", headers=h, json=body, timeout=15)
                print(f"[CLOSE] epic status: {r.status_code} | {r.text[:100]}")
                if r.status_code in (200, 202):
                    return True, f"Cerrado: {name} {close_dir} x{size} (epic)"
            except Exception as e:
                print(f"[CLOSE] epic error: {e}")

        return False, f"Falló cerrar {name}: no dealId ni epic válidos"

    def close_all(self, reason):
        results = []
        for pos in self.positions:
            ok, msg = self.close_position(pos)
            results.append((ok, msg, pos))
            if ok and pos["id"] and pos["id"] not in self.closed_ids:
                self.closed_ids.add(pos["id"])
                if pos["profit"] < 0:
                    self.realized_loss += abs(pos["profit"])
                # GUARDAR EN HISTORIAL
                save_trade_to_history(pos, reason, datetime.now().isoformat())
            time.sleep(0.5)
        # Cambiar a modo PROTECTED después del primer cierre por límite
        if "LÍMITE" in reason.upper() and self.protection_mode == "NORMAL":
            self.protection_mode = "PROTECTED"
        self.last_close_reason = reason
        return results

    def check_protection(self, bal, positions):
        if not bal or len(positions) == 0:
            return None

        pnl = bal.get("pnl", 0)
        current = bal.get("balance", 0)
        eff = current + pnl

        # Actualizar peak
        if pnl > self.peak_pnl:
            self.peak_pnl = pnl

        # 1. DAILY LIMIT
        if self.realized_loss >= self.daily_limit:
            return "LÍMITE DIARIO ALCANZADO"

        # 2. TRAILING STOP
        # En modo PROTECTED, el trailing está siempre activo desde el inicio
        if TRAILING_ENABLED:
            activation = self.initial_balance * (TRAILING_ACTIVATION_PCT / 100)
            if self.protection_mode == "PROTECTED":
                # En modo protegido, trailing activo desde el primer centavo de ganancia
                if self.peak_pnl > 0:
                    stop_level = self.peak_pnl * (TRAILING_PROTECTION_PCT / 100)
                    if pnl <= stop_level and pnl < self.peak_pnl:
                        self.trailing_fired = True
                        return f"TRAILING STOP PROTEGIDO (peak {self.peak_pnl:.2f} → {pnl:.2f})"
            else:
                # Modo normal: trailing se activa tras ganar activation%
                if pnl >= activation and self.peak_pnl > 0:
                    stop_level = self.peak_pnl * (TRAILING_PROTECTION_PCT / 100)
                    if pnl <= stop_level:
                        self.trailing_fired = True
                        return f"TRAILING STOP (peak {self.peak_pnl:.2f} → {pnl:.2f})"

        return None

# ══════════════════════════════════════════════════════════════════════════════
# HISTORIAL LOCAL (JSON)
# ══════════════════════════════════════════════════════════════════════════════
def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return []
    return []

def save_trade_to_history(pos, reason, timestamp):
    entry = {
        "timestamp": timestamp,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "time": datetime.now().strftime("%H:%M:%S"),
        "instrument": pos.get("name", ""),
        "epic": pos.get("epic", ""),
        "direction": pos.get("dir", ""),
        "size": pos.get("size", 0),
        "profit": pos.get("profit", 0),
        "open_level": pos.get("open", 0),
        "close_reason": reason,
    }
    history = load_history()
    history.append(entry)
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2, ensure_ascii=False)

# ══════════════════════════════════════════════════════════════════════════════
# PANEL VISUAL (TKINTER)
# ══════════════════════════════════════════════════════════════════════════════
class GuardianPanel:
    def __init__(self, root):
        self.root = root
        self.root.title("Guardian Stop — Panel de Control")
        self.root.configure(bg=BG_MAIN)
        self.root.geometry("900x700")
        self.root.minsize(800, 600)

        self.engine = RiskEngine()
        self.running = False
        self.monitor_thread = None
        self.last_history_count = 0

        self.build_ui()
        self.update_history_view()

    def build_ui(self):
        # Header
        header = tk.Frame(self.root, bg=BG_MAIN, height=60)
        header.pack(fill="x", padx=20, pady=(20, 10))
        tk.Label(header, text="GUARDIAN STOP", font=("Segoe UI", 24, "bold"),
                 bg=BG_MAIN, fg=FG_WHITE).pack(side="left")
        tk.Label(header, text="Motor de Protección de Riesgo", font=("Segoe UI", 12),
                 bg=BG_MAIN, fg=FG_GRAY).pack(side="left", padx=(10, 0), pady=8)

        self.status_label = tk.Label(header, text="● DESCONECTADO", font=("Segoe UI", 11, "bold"),
                                     bg=BG_MAIN, fg=FG_RED)
        self.status_label.pack(side="right")

        # ═══ PANEL PRINCIPAL ═══
        main = tk.Frame(self.root, bg=BG_MAIN)
        main.pack(fill="both", expand=True, padx=20, pady=10)

        # ── CELDAS SUPERIORES ──
        cells_frame = tk.Frame(main, bg=BG_MAIN)
        cells_frame.pack(fill="x", pady=(0, 15))

        self.cells = {}
        cell_defs = [
            ("balance", "BALANCE", "$0.00", FG_WHITE),
            ("equity", "EQUITY", "$0.00", FG_CYAN),
            ("pnl", "P&L", "+$0.00", FG_GREEN),
            ("dd", "DRAWDOWN", "0.00%", FG_GRAY),
            ("daily", "LÍMITE DIARIO", "0% / 1%", FG_YELLOW),
        ]

        for i, (key, title, default, color) in enumerate(cell_defs):
            cell = tk.Frame(cells_frame, bg=BG_CELL, width=160, height=90)
            cell.pack(side="left", padx=(0, 10 if i < 4 else 0))
            cell.pack_propagate(False)

            tk.Label(cell, text=title, font=("Segoe UI", 9), bg=BG_CELL, fg=FG_GRAY).pack(pady=(10, 0))
            lbl = tk.Label(cell, text=default, font=("Segoe UI", 18, "bold"),
                           bg=BG_CELL, fg=color)
            lbl.pack(pady=(5, 0))
            self.cells[key] = lbl

        # ── BARRA DE PROGRESO (0 a 1%) ──
        progress_frame = tk.Frame(main, bg=BG_MAIN)
        progress_frame.pack(fill="x", pady=(0, 15))

        tk.Label(progress_frame, text="PROGRESO HACIA LÍMITE DIARIO (1%)",
                 font=("Segoe UI", 10, "bold"), bg=BG_MAIN, fg=FG_GRAY).pack(anchor="w")

        self.progress_var = tk.DoubleVar(value=0)
        self.progress_bar = ttk.Progressbar(progress_frame, variable=self.progress_var,
                                            maximum=100, length=400, mode="determinate")
        self.progress_bar.pack(fill="x", pady=(5, 0))
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("green.Horizontal.TProgressbar", troughcolor=BG_CELL, background=FG_GREEN)
        style.configure("yellow.Horizontal.TProgressbar", troughcolor=BG_CELL, background=FG_YELLOW)
        style.configure("red.Horizontal.TProgressbar", troughcolor=BG_CELL, background=FG_RED)
        self.progress_bar.configure(style="green.Horizontal.TProgressbar")

        self.progress_text = tk.Label(progress_frame, text="0% usado | 1% disponible",
                                      font=("Segoe UI", 10), bg=BG_MAIN, fg=FG_GRAY)
        self.progress_text.pack(anchor="w", pady=(3, 0))

        # ── ESTADO DE PROTECCIÓN ──
        self.protection_frame = tk.Frame(main, bg=BG_CELL, padx=15, pady=10)
        self.protection_frame.pack(fill="x", pady=(0, 15))

        self.protection_label = tk.Label(self.protection_frame, text="MODO: NORMAL",
                                         font=("Segoe UI", 12, "bold"), bg=BG_CELL, fg=FG_GREEN)
        self.protection_label.pack(side="left")

        self.trailing_label = tk.Label(self.protection_frame, text="Trailing: INACTIVO",
                                       font=("Segoe UI", 11), bg=BG_CELL, fg=FG_GRAY)
        self.trailing_label.pack(side="right")

        # ── POSICIONES ABIERTAS ──
        pos_frame = tk.LabelFrame(main, text=" POSICIONES ABIERTAS ",
                                  font=("Segoe UI", 10, "bold"),
                                  bg=BG_MAIN, fg=FG_GRAY, bd=1, relief="solid")
        pos_frame.pack(fill="x", pady=(0, 15))

        self.pos_tree = ttk.Treeview(pos_frame, columns=("instrument", "dir", "size", "profit"),
                                     show="headings", height=4)
        self.pos_tree.heading("instrument", text="Instrumento")
        self.pos_tree.heading("dir", text="Dir")
        self.pos_tree.heading("size", text="Tamaño")
        self.pos_tree.heading("profit", text="P&L")
        self.pos_tree.column("instrument", width=200)
        self.pos_tree.column("dir", width=60, anchor="center")
        self.pos_tree.column("size", width=80, anchor="center")
        self.pos_tree.column("profit", width=120, anchor="e")
        self.pos_tree.pack(fill="x", padx=5, pady=5)

        # Estilo del treeview
        style.configure("Treeview", background=BG_CELL, foreground=FG_WHITE,
                        fieldbackground=BG_CELL, font=("Segoe UI", 10))
        style.configure("Treeview.Heading", background=BG_PANEL, foreground=FG_WHITE,
                        font=("Segoe UI", 10, "bold"))

        # ── BOTONES DE CONTROL ──
        btn_frame = tk.Frame(main, bg=BG_MAIN)
        btn_frame.pack(fill="x", pady=(0, 15))

        self.btn_connect = tk.Button(btn_frame, text="CONECTAR", font=("Segoe UI", 11, "bold"),
                                     bg=FG_GREEN, fg="white", width=14, height=2,
                                     relief="flat", cursor="hand2", command=self.toggle_connection)
        self.btn_connect.pack(side="left", padx=(0, 10))

        self.btn_close = tk.Button(btn_frame, text="CERRAR TODO", font=("Segoe UI", 11, "bold"),
                                   bg=FG_RED, fg="white", width=14, height=2,
                                   relief="flat", cursor="hand2", command=self.manual_close,
                                   state="disabled")
        self.btn_close.pack(side="left", padx=(0, 10))

        self.btn_refresh = tk.Button(btn_frame, text="REFRESCAR", font=("Segoe UI", 11),
                                     bg=BG_CELL, fg=FG_WHITE, width=12, height=2,
                                     relief="flat", cursor="hand2", command=self.manual_refresh)
        self.btn_refresh.pack(side="left", padx=(0, 10))

        # ── HISTORIAL ──
        hist_frame = tk.LabelFrame(main, text=" HISTORIAL DE CIERRES ",
                                   font=("Segoe UI", 10, "bold"),
                                   bg=BG_MAIN, fg=FG_GRAY, bd=1, relief="solid")
        hist_frame.pack(fill="both", expand=True)

        self.hist_tree = ttk.Treeview(hist_frame,
                                      columns=("hora", "instrumento", "dir", "size", "profit", "razon"),
                                      show="headings", height=6)
        self.hist_tree.heading("hora", text="Hora")
        self.hist_tree.heading("instrumento", text="Instrumento")
        self.hist_tree.heading("dir", text="Dir")
        self.hist_tree.heading("size", text="Tamaño")
        self.hist_tree.heading("profit", text="P&L")
        self.hist_tree.heading("razon", text="Razón")
        self.hist_tree.column("hora", width=70)
        self.hist_tree.column("instrumento", width=180)
        self.hist_tree.column("dir", width=50, anchor="center")
        self.hist_tree.column("size", width=70, anchor="center")
        self.hist_tree.column("profit", width=100, anchor="e")
        self.hist_tree.column("razon", width=200)
        self.hist_tree.pack(fill="both", expand=True, padx=5, pady=5)

    def toggle_connection(self):
        if not self.running:
            ok, msg = self.engine.login()
            if not ok:
                messagebox.showerror("Error de conexión", msg)
                return

            bal = self.engine.fetch_balance()
            if not bal:
                messagebox.showerror("Error", "No se pudo obtener balance inicial")
                return

            self.engine.initial_balance = bal["balance"]
            self.engine.daily_limit = self.engine.initial_balance * (DAILY_LIMIT_PCT / 100)
            self.engine.session_active = True
            self.running = True

            self.btn_connect.config(text="DETENER", bg=FG_RED)
            self.btn_close.config(state="normal")
            self.status_label.config(text="● CONECTADO", fg=FG_GREEN)

            self.monitor_thread = threading.Thread(target=self.monitor_loop, daemon=True)
            self.monitor_thread.start()
        else:
            self.running = False
            self.engine.session_active = False
            self.btn_connect.config(text="CONECTAR", bg=FG_GREEN)
            self.btn_close.config(state="disabled")
            self.status_label.config(text="● DETENIDO", fg=FG_YELLOW)

    def manual_close(self):
        if not self.engine.positions:
            messagebox.showinfo("Info", "No hay posiciones abiertas")
            return
        if messagebox.askyesno("Confirmar", f"¿Cerrar {len(self.engine.positions)} posiciones?"):
            results = self.engine.close_all("CIERRE MANUAL")
            for ok, msg, pos in results:
                color = FG_GREEN if ok else FG_RED
                print(msg)
            self.update_display()
            self.update_history_view()

    def manual_refresh(self):
        self.update_display()
        self.update_history_view()

    def monitor_loop(self):
        while self.running:
            try:
                bal = self.engine.fetch_balance()
                positions = self.engine.fetch_positions()
                self.engine.positions = positions
                self.engine.balance_data = bal or {}

                # Verificar protección
                trigger = self.engine.check_protection(bal, positions)
                if trigger:
                    self.root.after(0, lambda t=trigger: self.auto_close(t))

                # Actualizar UI
                self.root.after(0, self.update_display)
                self.root.after(0, self.update_history_view)

                time.sleep(POLL_INTERVAL)
            except Exception as e:
                print(f"Monitor error: {e}")
                time.sleep(POLL_INTERVAL)

    def auto_close(self, reason):
        if not self.running:
            return
        results = self.engine.close_all(reason)
        self.update_display()
        self.update_history_view()
        messagebox.showwarning("PROTECCIÓN ACTIVADA",
                               f"{reason}\n\nSe cerraron las posiciones automáticamente.")

    def update_display(self):
        bal = self.engine.balance_data
        positions = self.engine.positions

        if not bal:
            return

        current = bal.get("balance", 0)
        pnl = bal.get("pnl", 0)
        equity = current + pnl
        dd = max(0, self.engine.initial_balance - equity)
        dd_pct = (dd / self.engine.initial_balance * 100) if self.engine.initial_balance > 0 else 0

        realized = self.engine.realized_loss
        daily_limit = self.engine.daily_limit
        daily_pct = min(100, (realized / daily_limit * 100)) if daily_limit > 0 else 0

        # Colores
        pnl_color = FG_GREEN if pnl >= 0 else FG_RED
        dd_color = FG_GRAY if dd == 0 else FG_YELLOW if dd_pct < 0.5 else FG_RED

        # Actualizar celdas
        self.cells["balance"].config(text=f"${current:,.2f}", fg=FG_WHITE)
        self.cells["equity"].config(text=f"${equity:,.2f}", fg=FG_CYAN)
        self.cells["pnl"].config(text=f"{pnl:+.2f}", fg=pnl_color)
        self.cells["dd"].config(text=f"{dd:.2f} ({dd_pct:.2f}%)", fg=dd_color)
        self.cells["daily"].config(text=f"{realized:.2f} / {daily_limit:.2f}", fg=FG_YELLOW)

        # Barra de progreso
        self.progress_var.set(daily_pct)
        self.progress_text.config(text=f"{daily_pct:.1f}% usado | {daily_limit - realized:.2f} restante")

        if daily_pct < 50:
            self.progress_bar.configure(style="green.Horizontal.TProgressbar")
        elif daily_pct < 90:
            self.progress_bar.configure(style="yellow.Horizontal.TProgressbar")
        else:
            self.progress_bar.configure(style="red.Horizontal.TProgressbar")

        # Modo de protección
        mode = self.engine.protection_mode
        if mode == "PROTECTED":
            self.protection_label.config(text="MODO: PROTEGIDO (Trailing Activo)", fg=FG_YELLOW)
        else:
            self.protection_label.config(text="MODO: NORMAL", fg=FG_GREEN)

        # Trailing
        if self.engine.trailing_fired:
            self.trailing_label.config(text="Trailing: DISPARADO", fg=FG_RED)
        elif self.engine.peak_pnl > 0:
            self.trailing_label.config(text=f"Trailing: ARMADO (peak {self.engine.peak_pnl:.2f})", fg=FG_YELLOW)
        else:
            self.trailing_label.config(text="Trailing: INACTIVO", fg=FG_GRAY)

        # Tabla de posiciones
        for item in self.pos_tree.get_children():
            self.pos_tree.delete(item)
        for pos in positions:
            profit = pos.get("profit", 0)
            tag = "green" if profit >= 0 else "red"
            self.pos_tree.insert("", "end", values=(
                pos.get("name", ""),
                pos.get("dir", ""),
                pos.get("size", 0),
                f"{profit:+.2f}"
            ), tags=(tag,))
        self.pos_tree.tag_configure("green", foreground=FG_GREEN)
        self.pos_tree.tag_configure("red", foreground=FG_RED)

    def update_history_view(self):
        history = load_history()
        if len(history) == self.last_history_count:
            return
        self.last_history_count = len(history)

        for item in self.hist_tree.get_children():
            self.hist_tree.delete(item)

        # Mostrar últimos 20, ordenados inversos
        for entry in reversed(history[-20:]):
            profit = entry.get("profit", 0)
            tag = "green" if profit >= 0 else "red"
            self.hist_tree.insert("", "end", values=(
                entry.get("time", ""),
                entry.get("instrument", ""),
                entry.get("direction", ""),
                entry.get("size", 0),
                f"{profit:+.2f}",
                entry.get("close_reason", ""),
            ), tags=(tag,))
        self.hist_tree.tag_configure("green", foreground=FG_GREEN)
        self.hist_tree.tag_configure("red", foreground=FG_RED)

# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    root = tk.Tk()
    app = GuardianPanel(root)
    root.mainloop()
