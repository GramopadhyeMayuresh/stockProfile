import asyncio
import subprocess
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
import yfinance as yf
from .database import get_all_alerts, update_alert_status, get_all_holdings


def send_macos_notification(title: str, subtitle: str, message: str, sound: str = "Glass"):
    """
    Trigger native macOS banner notification with sound via AppleScript (osascript).
    Survives even when the Tauri app window is hidden or minimized.
    """
    try:
        script = f'display notification "{message}" with title "{title}" subtitle "{subtitle}" sound name "{sound}"'
        subprocess.run(["osascript", "-e", script], check=False)
    except Exception as e:
        print(f"[AlertDaemon] Notification error: {e}")


class AlertDaemon:
    def __init__(self):
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        self.latest_prices: Dict[str, float] = {}
        self.subscribers: List[asyncio.Queue] = []

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._run_loop())
            print("[AlertDaemon] Background alert evaluation daemon started.")

    def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            print("[AlertDaemon] Background alert daemon stopped.")

    async def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self.subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self.subscribers:
            self.subscribers.remove(q)

    async def broadcast_event(self, event_type: str, data: Any):
        msg = json.dumps({"event": event_type, "data": data})
        for q in list(self.subscribers):
            try:
                await q.put(msg)
            except Exception:
                pass

    async def _fetch_current_quotes(self, symbols: List[str]) -> Dict[str, Dict[str, float]]:
        """
        Fetch latest prices and day change for symbols.
        Uses cached holdings or yfinance in batch.
        """
        results: Dict[str, Dict[str, float]] = {}
        if not symbols:
            return results

        # First check DB holdings for quick cached price
        holdings = await get_all_holdings()
        for h in holdings:
            sym = h["tradingsymbol"].upper()
            if sym in symbols:
                results[sym] = {
                    "price": float(h["last_price"]),
                    "day_change": float(h.get("day_change", 0.0)),
                    "day_change_percent": float(h.get("day_change_percent", 0.0)),
                }

        # Any remaining symbols not in holdings or needing fresh check
        missing = [s for s in symbols if s not in results]
        if missing:
            loop = asyncio.get_event_loop()
            def fetch_yf_batch():
                res = {}
                tickers = " ".join([f"{s}.NS" for s in missing])
                try:
                    data = yf.download(tickers, period="1d", interval="1m", progress=False)
                    if not data.empty and "Close" in data:
                        close_data = data["Close"]
                        for s in missing:
                            col = f"{s}.NS"
                            if col in close_data:
                                val = float(close_data[col].dropna().iloc[-1])
                                res[s] = {"price": val, "day_change": 0.0, "day_change_percent": 0.0}
                except Exception as e:
                    print(f"[AlertDaemon] Batch price fetch warning: {e}")
                return res

            fresh = await loop.run_in_executor(None, fetch_yf_batch)
            results.update(fresh)

        return results

    async def _run_loop(self):
        while self.is_running:
            try:
                alerts = await get_all_alerts(active_only=True)
                if alerts:
                    symbols = list(set([a["tradingsymbol"].upper() for a in alerts]))
                    quotes = await self._fetch_current_quotes(symbols)

                    for alert in alerts:
                        sym = alert["tradingsymbol"].upper()
                        quote = quotes.get(sym)
                        if not quote:
                            continue

                        current_price = quote["price"]
                        day_pct = quote["day_change_percent"]
                        cond = alert["condition_type"]
                        target = float(alert["target_value"])
                        triggered = False
                        msg = ""

                        if cond == "PRICE_ABOVE" and current_price >= target:
                            triggered = True
                            msg = f"{sym} crossed ABOVE ₹{target:,.2f} (LTP: ₹{current_price:,.2f})"
                        elif cond == "PRICE_BELOW" and current_price <= target:
                            triggered = True
                            msg = f"{sym} fell BELOW ₹{target:,.2f} (LTP: ₹{current_price:,.2f})"
                        elif cond == "PCT_CHANGE_UP" and day_pct >= target:
                            triggered = True
                            msg = f"{sym} gained +{day_pct:.2f}% (Target: +{target:.2f}%)"
                        elif cond == "PCT_CHANGE_DOWN" and day_pct <= -target:
                            triggered = True
                            msg = f"{sym} dropped {day_pct:.2f}% (Target: -{target:.2f}%)"

                        if triggered:
                            note = alert.get("note") or "Target condition met!"
                            print(f"[AlertDaemon] 🚨 ALERT TRIGGERED: {msg}")
                            await update_alert_status(alert["id"], "TRIGGERED", current_price)

                            # Trigger native macOS banner notification with sound
                            send_macos_notification(
                                title=f"🚨 Stock Alert: {sym}",
                                subtitle=msg,
                                message=note,
                                sound="Glass"
                            )

                            # Broadcast to UI
                            await self.broadcast_event("alert_triggered", {
                                "alert_id": alert["id"],
                                "symbol": sym,
                                "price": current_price,
                                "message": msg,
                                "note": note,
                                "triggered_at": datetime.now().isoformat()
                            })
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[AlertDaemon] Loop error: {e}")

            # Sleep between evaluation cycles (10s default)
            await asyncio.sleep(10)


alert_daemon = AlertDaemon()

