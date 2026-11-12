import keyring
import json
import pyotp
from typing import List, Dict, Any, Optional
from SmartApi import SmartConnect
from .mock_data import ANGELONE_MOCK_HOLDINGS

KEYRING_SERVICE = "StockProfile_AngelOne"


class AngelOneAdapter:
    def __init__(self):
        self.client_id: Optional[str] = None
        self.api_key: Optional[str] = None
        self.jwt_token: Optional[str] = None
        self.feed_token: Optional[str] = None
        self.smart_api: Optional[SmartConnect] = None
        self._load_cached_credentials()

    def _load_cached_credentials(self):
        try:
            stored = keyring.get_password(KEYRING_SERVICE, "credentials")
            if stored:
                data = json.loads(stored)
                self.client_id = data.get("client_id")
                self.api_key = data.get("api_key")
                self.jwt_token = data.get("jwt_token")
                self.feed_token = data.get("feed_token")
                if self.api_key:
                    self.smart_api = SmartConnect(api_key=self.api_key)
                    if self.jwt_token:
                        self.smart_api.setAccessToken(self.jwt_token)
        except Exception as e:
            print(f"[AngelOneAdapter] Error loading keyring credentials: {e}")

    def save_credentials(self, client_id: str, api_key: str, password_pin: str, totp_secret: str, jwt_token: Optional[str] = None, feed_token: Optional[str] = None):
        self.client_id = client_id
        self.api_key = api_key
        self.jwt_token = jwt_token
        self.feed_token = feed_token
        try:
            keyring.set_password(KEYRING_SERVICE, "credentials", json.dumps({
                "client_id": client_id,
                "api_key": api_key,
                "password_pin": password_pin,
                "totp_secret": totp_secret,
                "jwt_token": jwt_token,
                "feed_token": feed_token
            }))
        except Exception as e:
            print(f"[AngelOneAdapter] Warning: Keychain save failed: {e}")

    def login_with_totp(self, client_id: str, password_pin: str, api_key: str, totp_secret: str) -> Dict[str, Any]:
        """
        Automated Angel One login generating dynamic TOTP via pyotp.
        """
        try:
            clean_client_id = client_id.strip().upper()
            clean_pin = password_pin.strip()
            clean_api_key = api_key.strip()
            clean_secret = totp_secret.replace(" ", "").strip().upper()

            totp = pyotp.TOTP(clean_secret)
            totp_code = totp.now()

            smart_api = SmartConnect(api_key=clean_api_key)
            login_data = smart_api.generateSession(clean_client_id, clean_pin, totp_code)

            if login_data.get("status"):
                data = login_data.get("data", {})
                self.jwt_token = data.get("jwtToken")
                self.feed_token = data.get("feedToken")
                self.smart_api = smart_api
                self.client_id = clean_client_id
                self.api_key = clean_api_key
                self.save_credentials(clean_client_id, clean_api_key, clean_pin, clean_secret, self.jwt_token, self.feed_token)
                return {"status": True, "message": "Login successful", "data": data}
            else:
                return {"status": False, "message": login_data.get("message", "Login failed")}
        except Exception as e:
            return {"status": False, "message": f"Exception during Angel One login: {str(e)}"}

    def auto_refresh_token(self) -> bool:
        """
        Silently refresh the daily session token using stored TOTP credentials.
        """
        try:
            stored = keyring.get_password(KEYRING_SERVICE, "credentials")
            if not stored:
                return False
            creds = json.loads(stored)
            res = self.login_with_totp(
                client_id=creds["client_id"],
                password_pin=creds["password_pin"],
                api_key=creds["api_key"],
                totp_secret=creds["totp_secret"]
            )
            return res.get("status", False)
        except Exception as e:
            print(f"[AngelOneAdapter] Silent token refresh failed: {e}")
            return False

    def fetch_holdings(self, use_mock: bool = False) -> List[Dict[str, Any]]:
        """
        Fetch equity holdings via smartApi.getHolding() or return mock data.
        """
        if not use_mock and self.smart_api and self.jwt_token:
            try:
                res = self.smart_api.getHolding()
                if res.get("status") and res.get("data"):
                    raw_data = res["data"]
                    normalized = []
                    for h in raw_data:
                        qty = int(h.get("quantity", 0))
                        if qty <= 0:
                            continue
                        last_price = float(h.get("ltp", 0.0))
                        close_price = float(h.get("close", last_price))
                        day_change = last_price - close_price
                        day_pct = (day_change / close_price * 100.0) if close_price > 0 else 0.0
                        avg_price = float(h.get("averageprice", 0.0))
                        invested = qty * avg_price
                        pnl = float(h.get("profitandloss", (qty * last_price) - invested))

                        normalized.append({
                            "tradingsymbol": h.get("tradingsymbol", ""),
                            "isin": h.get("isin", ""),
                            "exchange": h.get("exchange", "NSE"),
                            "quantity": qty,
                            "average_price": avg_price,
                            "last_price": last_price,
                            "pnl": pnl,
                            "day_change": round(day_change, 2),
                            "day_change_percent": round(day_pct, 2),
                        })
                    return normalized
            except Exception as e:
                print(f"[AngelOneAdapter] Live holdings fetch failed ({e}). Falling back.")

        return ANGELONE_MOCK_HOLDINGS

    def create_gtt_rule(self, tradingsymbol: str, symboltoken: str, exchange: str, trigger_price: float, price: float, qty: int):
        if not self.smart_api or not self.jwt_token:
            print("[AngelOneAdapter] Mock GTT rule created (broker not connected)")
            return {"status": True, "mock": True, "message": f"Simulated Angel One GTT at ₹{trigger_price}"}

        params = {
            "tradingsymbol": tradingsymbol,
            "symboltoken": symboltoken,
            "exchange": exchange,
            "producttype": "DELIVERY",
            "transactiontype": "SELL",
            "price": price,
            "qty": qty,
            "triggerprice": trigger_price,
            "disclosedqty": qty,
            "timeperiod": 365
        }
        return self.smart_api.gttCreateRule(params)

