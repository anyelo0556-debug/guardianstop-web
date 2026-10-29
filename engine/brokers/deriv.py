"""
Deriv WebSocket API Connector for Risk Engine
Handles: auth, fetch positions/balance, close positions.
"""
import websocket
import json
import time
import threading
from typing import List, Dict, Optional, Tuple, Callable

DERIV_WS = "wss://ws.derivws.com/websockets/v3"

class DerivClient:
    def __init__(self, api_token: str):
        self.api_token = api_token
        self.ws: Optional[websocket.WebSocketApp] = None
        self.authenticated = False
        self.req_id = 1
        self.balance: Optional[float] = None
        self.positions: List[Dict] = []
        self._callbacks: Dict[int, Callable] = {}
        self._lock = threading.Lock()
        self._connected_event = threading.Event()
        self._message_buffer: List[Dict] = []
        self._poll_thread: Optional[threading.Thread] = None

    def _next_req_id(self) -> int:
        self.req_id += 1
        return self.req_id

    def _send(self, payload: Dict) -> None:
        if self.ws and self.ws.sock and self.ws.sock.connected:
            self.ws.send(json.dumps(payload))
        else:
            raise ConnectionError("WebSocket not connected")

    def _on_open(self, ws):
        print("[DERIV] WS connected")
        # Authorize
        req_id = self._next_req_id()
        self._send({
            "authorize": self.api_token,
            "req_id": req_id,
        })

    def _on_message(self, ws, message):
        try:
            data = json.loads(message)
            msg_type = list(data.keys())[0] if data else ""

            if msg_type == "authorize":
                if data.get("authorize"):
                    self.authenticated = True
                    print("[DERIV] Authorized OK")
                    self._connected_event.set()
                else:
                    print(f"[DERIV] Auth failed: {data.get('error', {}).get('message', 'unknown')}")

            elif msg_type == "balance":
                bal_data = data.get("balance", {})
                self.balance = bal_data.get("balance", 0)

            elif msg_type == "portfolio":
                port = data.get("portfolio", {})
                contracts = port.get("contracts", [])
                with self._lock:
                    self.positions = []
                    for c in contracts:
                        self.positions.append({
                            "id": c.get("contract_id"),
                            "symbol": c.get("symbol", ""),
                            "direction": c.get("contract_type", ""),
                            "buy_price": c.get("buy_price", 0),
                            "bid_price": c.get("bid_price", 0),
                            "profit": c.get("profit", 0),
                            "purchase_time": c.get("purchase_time"),
                        })

            elif msg_type == "proposal_open_contract":
                pass  # Could use for detailed position data

            elif msg_type == "buy":
                pass

            elif msg_type == "sell":
                contract_id = data.get("sell", {}).get("contract_id")
                sold_for = data.get("sell", {}).get("sold_for")
                print(f"[DERIV] Sold contract {contract_id} for {sold_for}")

            elif "error" in data:
                print(f"[DERIV] Error: {data['error']}")

            self._message_buffer.append(data)
        except Exception as e:
            print(f"[DERIV] Message parse error: {e}")

    def _on_error(self, ws, error):
        print(f"[DERIV] WS error: {error}")
        self.authenticated = False

    def _on_close(self, ws, close_status_code, close_msg):
        print(f"[DERIV] WS closed: {close_status_code} {close_msg}")
        self.authenticated = False
        self._connected_event.clear()

    def connect(self, timeout: int = 10) -> bool:
        """Connect and authenticate to Deriv WebSocket."""
        self.ws = websocket.WebSocketApp(
            DERIV_WS,
            on_open=self._on_open,
            on_message=self._on_message,
            on_error=self._on_error,
            on_close=self._on_close,
        )
        self._poll_thread = threading.Thread(target=self.ws.run_forever, daemon=True)
        self._poll_thread.start()
        return self._connected_event.wait(timeout=timeout)

    def disconnect(self) -> None:
        if self.ws:
            self.ws.close()
        self.authenticated = False

    def get_balance(self) -> Optional[float]:
        if not self.authenticated:
            return None
        try:
            self._send({
                "balance": 1,
                "req_id": self._next_req_id(),
            })
            time.sleep(1)
            return self.balance
        except Exception as e:
            print(f"[DERIV] Balance error: {e}")
            return None

    def get_positions(self) -> List[Dict]:
        if not self.authenticated:
            return []
        try:
            self._send({
                "portfolio": 1,
                "req_id": self._next_req_id(),
            })
            time.sleep(1)
            with self._lock:
                return list(self.positions)
        except Exception as e:
            print(f"[DERIV] Positions error: {e}")
            return []

    def close_position(self, contract_id: int) -> Tuple[bool, str]:
        if not self.authenticated:
            return False, "Not authenticated"
        try:
            self._send({
                "sell": contract_id,
                "price": 0,
                "req_id": self._next_req_id(),
            })
            time.sleep(1.5)
            return True, f"Sell order sent for {contract_id}"
        except Exception as e:
            return False, str(e)

    def close_all(self, positions: List[Dict]) -> Tuple[int, int]:
        closed = 0
        failed = 0
        for pos in positions:
            cid = pos.get("id")
            if cid:
                ok, _ = self.close_position(cid)
                if ok:
                    closed += 1
                else:
                    failed += 1
                time.sleep(0.5)
        return closed, failed
