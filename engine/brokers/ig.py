"""
IG Group REST API Connector for Risk Engine
Handles: login, fetch positions/balance, close positions.
"""
import requests
import json
from typing import List, Dict, Optional, Tuple
from datetime import datetime

DEMO_URL = "https://demo-api.ig.com/gateway/deal"
LIVE_URL = "https://api.ig.com/gateway/deal"

class IGClient:
    def __init__(self, api_key: str, identifier: str, password: str, account_id: str = "", demo: bool = True):
        self.api_key = api_key
        self.identifier = identifier
        self.password = password
        self.account_id = account_id
        self.base_url = DEMO_URL if demo else LIVE_URL
        self.cst: Optional[str] = None
        self.xst: Optional[str] = None
        self.client_id: Optional[str] = None
        self.authenticated = False

    def _headers(self) -> Dict[str, str]:
        h = {
            "X-IG-API-KEY": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.cst:
            h["CST"] = self.cst
        if self.xst:
            h["X-SECURITY-TOKEN"] = self.xst
        return h

    def login(self) -> bool:
        """Authenticate with IG and obtain session tokens."""
        try:
            body = {
                "identifier": self.identifier,
                "password": self.password,
            }
            resp = requests.post(
                f"{self.base_url}/session",
                headers=self._headers(),
                json=body,
                params={"fetchSessionTokens": "true"},
                timeout=15,
            )
            if resp.status_code == 200:
                self.cst = resp.headers.get("CST")
                self.xst = resp.headers.get("X-SECURITY-TOKEN")
                data = resp.json()
                self.client_id = data.get("clientId")
                accounts = data.get("accounts", [])
                if not self.account_id and accounts:
                    # Prefer spreadbet account, else CFD, else first
                    spread = next((a for a in accounts if a.get("accountType") == "SPREADBET"), None)
                    cfd = next((a for a in accounts if a.get("accountType") == "CFD"), None)
                    self.account_id = spread["accountId"] if spread else (cfd["accountId"] if cfd else accounts[0]["accountId"])
                self.authenticated = bool(self.cst and self.xst)
                print(f"[IG] Login OK | CST={'yes' if self.cst else 'no'} | XST={'yes' if self.xst else 'no'} | Account={self.account_id}")
                return self.authenticated
            else:
                print(f"[IG] Login FAILED: {resp.status_code} {resp.text[:200]}")
                return False
        except Exception as e:
            print(f"[IG] Login ERROR: {e}")
            return False

    def get_balance(self) -> Optional[Dict]:
        """Fetch account balance."""
        if not self.authenticated:
            if not self.login():
                return None
        try:
            resp = requests.get(
                f"{self.base_url}/accounts",
                headers=self._headers(),
                timeout=15,
            )
            if resp.status_code == 401:
                # Re-auth
                if not self.login():
                    return None
                resp = requests.get(f"{self.base_url}/accounts", headers=self._headers(), timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                accounts = data.get("accounts", [])
                for acc in accounts:
                    if acc.get("accountId") == self.account_id:
                        return {
                            "balance": acc.get("balance", {}).get("balance", 0),
                            "available": acc.get("balance", {}).get("available", 0),
                            "profitLoss": acc.get("balance", {}).get("profitLoss", 0),
                            "deposit": acc.get("balance", {}).get("deposit", 0),
                        }
                return None
            else:
                print(f"[IG] Balance error: {resp.status_code}")
                return None
        except Exception as e:
            print(f"[IG] Balance ERROR: {e}")
            return None

    def get_positions(self) -> List[Dict]:
        """Fetch open positions."""
        if not self.authenticated:
            if not self.login():
                return []
        try:
            resp = requests.get(
                f"{self.base_url}/positions",
                headers=self._headers(),
                timeout=15,
            )
            if resp.status_code == 401:
                if not self.login():
                    return []
                resp = requests.get(f"{self.base_url}/positions", headers=self._headers(), timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                positions = data.get("positions", [])
                result = []
                for p in positions:
                    market = p.get("market", {})
                    pos = p.get("position", {})
                    result.append({
                        "dealId": pos.get("dealId", ""),
                        "dealReference": pos.get("dealReference", ""),
                        "epic": market.get("epic", ""),
                        "expiry": market.get("expiry", "-"),
                        "instrumentName": market.get("instrumentName", ""),
                        "direction": pos.get("direction", ""),  # BUY or SELL
                        "size": pos.get("size", 0),
                        "openLevel": pos.get("openLevel", 0),
                        "stopLevel": pos.get("stopLevel", None),
                        "limitLevel": pos.get("limitLevel", None),
                        "profit": p.get("unrealisedProfit", 0) or p.get("profit", 0) or 0,
                    })
                return result
            else:
                print(f"[IG] Positions error: {resp.status_code}")
                return []
        except Exception as e:
            print(f"[IG] Positions ERROR: {e}")
            return []

    def close_position(self, position: Dict) -> Tuple[bool, str]:
        """Close a single position. Returns (success, message)."""
        if not self.authenticated:
            if not self.login():
                return False, "Not authenticated"

        deal_id = position.get("dealId", "")
        epic = position.get("epic", "")
        direction = position.get("direction", "")
        size = position.get("size", 0)
        close_direction = "SELL" if direction == "BUY" else "BUY"

        body = {
            "direction": close_direction,
            "size": size,
            "orderType": "MARKET",
            "timeInForce": "EXECUTE_AND_ELIMINATE",
        }
        if deal_id:
            body["dealId"] = deal_id
        else:
            body["epic"] = epic
            body["expiry"] = position.get("expiry", "-")

        try:
            print(f"[IG CLOSE] {position.get('instrumentName', epic)} | {close_direction} {size} | dealId={deal_id[:12] if deal_id else 'none'}...")
            resp = requests.delete(
                f"{self.base_url}/positions/otc",
                headers=self._headers(),
                json=body,
                timeout=15,
            )
            if resp.status_code in (200, 202):
                data = resp.json()
                print(f"[IG CLOSE OK] dealReference={data.get('dealReference', 'n/a')}")
                return True, data.get("dealReference", "OK")
            elif resp.status_code == 401:
                # Re-auth and retry once
                if self.login():
                    resp = requests.delete(
                        f"{self.base_url}/positions/otc",
                        headers=self._headers(),
                        json=body,
                        timeout=15,
                    )
                    if resp.status_code in (200, 202):
                        data = resp.json()
                        return True, data.get("dealReference", "OK")
                return False, f"Auth failed after retry"
            else:
                err = resp.text[:300]
                print(f"[IG CLOSE FAIL] {resp.status_code}: {err}")
                # If dealId failed, try epic fallback
                if deal_id and resp.status_code == 400:
                    return self._close_with_epic(position)
                return False, f"HTTP {resp.status_code}: {err}"
        except Exception as e:
            print(f"[IG CLOSE ERROR] {e}")
            return False, str(e)

    def _close_with_epic(self, position: Dict) -> Tuple[bool, str]:
        """Fallback close using epic+expiry instead of dealId."""
        epic = position.get("epic", "")
        direction = position.get("direction", "")
        size = position.get("size", 0)
        close_direction = "SELL" if direction == "BUY" else "BUY"
        body = {
            "epic": epic,
            "expiry": position.get("expiry", "-"),
            "direction": close_direction,
            "size": size,
            "orderType": "MARKET",
            "timeInForce": "EXECUTE_AND_ELIMINATE",
        }
        try:
            print(f"[IG CLOSE FALLBACK] {epic} | {close_direction} {size}")
            resp = requests.delete(
                f"{self.base_url}/positions/otc",
                headers=self._headers(),
                json=body,
                timeout=15,
            )
            if resp.status_code in (200, 202):
                data = resp.json()
                return True, data.get("dealReference", "OK")
            else:
                return False, f"Fallback HTTP {resp.status_code}: {resp.text[:200]}"
        except Exception as e:
            return False, f"Fallback error: {e}"

    def close_all(self, positions: List[Dict]) -> Tuple[int, int]:
        """Close all positions. Returns (closed_count, failed_count)."""
        closed = 0
        failed = 0
        for pos in positions:
            ok, msg = self.close_position(pos)
            if ok:
                closed += 1
            else:
                failed += 1
            import time
            time.sleep(0.5)  # Rate limit protection
        return closed, failed
