import keyring
import json
from typing import List, Dict, Any, Optional
from kiteconnect import KiteConnect
from .mock_data import ZERODHA_MOCK_HOLDINGS

KEYRING_SERVICE = "StockProfile_Zerodha"


class ZerodhaAdapter:
    def __init__(self):
        self.api_key: Optional[str] = None
        self.access_token: Optional[str] = None
        self.kite: Optional[KiteConnect] = None
        self._load_cached_credentials()

    def _load_cached_credentials(self):
        try:
            stored = keyring.get_password(KEYRING_SERVICE, "credentials")
            if stored:
                data = json.loads(stored)
                self.api_key = data.get("api_key")
                self.access_token = data.get("access_token")
                if self.api_key:
                    self.kite = KiteConnect(api_key=self.api_key)
                    if self.access_token:
                        self.kite.set_access_token(self.access_token)
        except Exception as e:
            print(f"[ZerodhaAdapter] Error loading keyring credentials: {e}")

    def save_credentials(self, api_key: str, api_secret: str, access_token: Optional[str] = None):
        self.api_key = api_key
        self.access_token = access_token
        self.kite = KiteConnect(api_key=api_key)
        if access_token:
            self.kite.set_access_token(access_token)
        try:
            keyring.set_password(KEYRING_SERVICE, "credentials", json.dumps({
                "api_key": api_key,
                "api_secret": api_secret,
                "access_token": access_token
            }))
        except Exception as e:
            print(f"[ZerodhaAdapter] Warning: Keychain save failed: {e}")

    def get_login_url(self, api_key: Optional[str] = None) -> str:
        key = api_key or self.api_key
        if not key:
            raise ValueError("Zerodha API Key not configured")
        kite = KiteConnect(api_key=key)
        return kite.login_url()

    def generate_session(self, api_key: str, api_secret: str, request_token: str) -> Dict[str, Any]:
        kite = KiteConnect(api_key=api_key)
        data = kite.generate_session(request_token, api_secret=api_secret)
        self.access_token = data["access_token"]
        self.kite = kite
        self.save_credentials(api_key, api_secret, self.access_token)
        return data

    def fetch_holdings(self, use_mock: bool = False) -> List[Dict[str, Any]]:
        """
        Fetch real holdings from Kite Connect, or fallback to mock data if not logged in.
        """
        if not use_mock and self.kite and self.access_token:
            try:
                raw_holdings = self.kite.holdings()
                normalized = []
                for h in raw_holdings:
                    qty = int(h.get("quantity", 0)) + int(h.get("t1_quantity", 0))
                    if qty <= 0:
                        continue
                    last_price = float(h.get("last_price", 0.0))
                    close_price = float(h.get("close_price", last_price))
                    day_change = last_price - close_price
                    day_pct = (day_change / close_price * 100.0) if close_price > 0 else 0.0

                    normalized.append({
                        "tradingsymbol": h.get("tradingsymbol", ""),
                        "isin": h.get("isin", ""),
                        "exchange": h.get("exchange", "NSE"),
                        "quantity": qty,
                        "average_price": float(h.get("average_price", 0.0)),
                        "last_price": last_price,
                        "pnl": float(h.get("pnl", 0.0)),
                        "day_change": round(day_change, 2),
                        "day_change_percent": round(day_pct, 2),
                    })
                return normalized
            except Exception as e:
                print(f"[ZerodhaAdapter] Failed to fetch live holdings ({e}). Falling back.")

        return ZERODHA_MOCK_HOLDINGS

    def place_gtt(self, tradingsymbol: str, exchange: str, trigger_type: str, trigger_price: float, limit_price: float, quantity: int):
        if not self.kite or not self.access_token:
            print("[ZerodhaAdapter] Mock GTT placed (broker not connected)")
            return {"status": "success", "mock": True, "message": f"Simulated Zerodha GTT at ₹{trigger_price}"}

        condition = {
            "exchange": exchange,
            "tradingsymbol": tradingsymbol,
            "trigger_values": [trigger_price],
            "last_price": limit_price
        }
        orders = [{
            "transaction_type": self.kite.TRANSACTION_TYPE_SELL,
            "quantity": quantity,
            "order_type": self.kite.ORDER_TYPE_LIMIT,
            "product": self.kite.PRODUCT_CNC,
            "price": limit_price
        }]
        return self.kite.place_gtt(
            trigger_type=self.kite.GTT_TYPE_SINGLE,
            tradingsymbol=tradingsymbol,
            exchange=exchange,
            trigger_values=[trigger_price],
            last_price=limit_price,
            orders=orders
        )
