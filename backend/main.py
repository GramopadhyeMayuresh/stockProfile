from contextlib import asynccontextmanager
import asyncio
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse
import yfinance as yf

from .database import (
    init_db, get_all_holdings, upsert_holdings, get_broker_accounts,
    update_broker_status, get_all_alerts, create_alert, update_alert_status,
    delete_alert, set_sector_override
)
from .models import (
    PortfolioSummary, AggregatedHolding, SectorAllocation, Alert,
    AlertCreate, ZerodhaAuthRequest, AngelOneAuthRequest, SectorOverrideRequest
)
from .portfolio_aggregator import aggregate_holdings
from .sector_data import KNOWN_INDIAN_STOCKS, SYMBOL_TO_ISIN
from .brokers.zerodha_adapter import ZerodhaAdapter
from .brokers.angelone_adapter import AngelOneAdapter
from .brokers.mock_data import ZERODHA_MOCK_HOLDINGS, ANGELONE_MOCK_HOLDINGS
from .alert_daemon import alert_daemon, send_macos_notification

zerodha = ZerodhaAdapter()
angelone = AngelOneAdapter()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    existing = await get_all_holdings()
    if not existing:
        print("[Main] Initializing demo holdings for Zerodha and Angel One...")
        await upsert_holdings("zerodha", ZERODHA_MOCK_HOLDINGS)
        await upsert_holdings("angelone", ANGELONE_MOCK_HOLDINGS)
        # Create an initial demo alert
        await create_alert({
            "isin": "INE318A01026",
            "tradingsymbol": "PIDILITIND",
            "exchange": "NSE",
            "condition_type": "PRICE_ABOVE",
            "target_value": 3150.0,
            "broker_sync": "LOCAL_ONLY",
            "note": "Pidilite target breakout level reached!"
        })
        await create_alert({
            "isin": "INE040A01034",
            "tradingsymbol": "HDFCBANK",
            "exchange": "NSE",
            "condition_type": "PRICE_BELOW",
            "target_value": 1700.0,
            "broker_sync": "LOCAL_ONLY",
            "note": "HDFC Bank dip buy alert"
        })

    alert_daemon.start()
    yield
    # Shutdown
    alert_daemon.stop()


app = FastAPI(title="StockProfile API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "StockProfile", "version": "1.0.0"}


@app.get("/api/portfolio/summary", response_model=PortfolioSummary)
async def get_summary():
    holdings = await get_all_holdings()
    _, _, summary = await aggregate_holdings(holdings)
    brokers = await get_broker_accounts()
    summary.brokers_status = brokers
    return summary


@app.get("/api/portfolio/holdings", response_model=List[AggregatedHolding])
async def get_holdings():
    holdings = await get_all_holdings()
    agg, _, _ = await aggregate_holdings(holdings)
    return agg


@app.get("/api/portfolio/sectors", response_model=List[SectorAllocation])
async def get_sectors():
    holdings = await get_all_holdings()
    _, sectors, _ = await aggregate_holdings(holdings)
    return sectors


@app.post("/api/portfolio/sync")
async def sync_portfolio():
    """
    Fetch updated holdings from both brokers (or mock data if not logged in).
    """
    z_holdings = zerodha.fetch_holdings()
    a_holdings = angelone.fetch_holdings()

    await upsert_holdings("zerodha", z_holdings)
    await upsert_holdings("angelone", a_holdings)

    # Broadcast sync event
    await alert_daemon.broadcast_event("sync_completed", {"status": "success"})
    return {"status": "success", "zerodha_count": len(z_holdings), "angelone_count": len(a_holdings)}


@app.post("/api/portfolio/seed-demo")
async def seed_demo():
    await upsert_holdings("zerodha", ZERODHA_MOCK_HOLDINGS)
    await upsert_holdings("angelone", ANGELONE_MOCK_HOLDINGS)
    return {"status": "success", "message": "Demo data refreshed successfully"}


@app.get("/api/brokers/status")
async def get_brokers():
    return await get_broker_accounts()


@app.get("/api/brokers/zerodha/auth-url")
async def get_zerodha_auth_url(api_key: Optional[str] = None):
    try:
        url = zerodha.get_login_url(api_key)
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/callback/zerodha")
async def zerodha_callback(request_token: str, status: Optional[str] = None):
    """
    OAuth redirect callback from Zerodha Kite Connect.
    """
    if zerodha.api_key:
        try:
            # We need api_secret stored in keyring
            import keyring, json
            stored = keyring.get_password("StockProfile_Zerodha", "credentials")
            if stored:
                data = json.loads(stored)
                api_secret = data.get("api_secret", "")
                if api_secret:
                    zerodha.generate_session(zerodha.api_key, api_secret, request_token)
                    await update_broker_status("zerodha", True)
                    return HTMLResponse("<h2>Zerodha authentication successful! You can close this tab and return to StockProfile.</h2>")
        except Exception as e:
            return HTMLResponse(f"<h2>Auth Error: {e}</h2>")
    return HTMLResponse(f"<h2>Received request token: {request_token}. Please save credentials in app.</h2>")


@app.post("/api/brokers/zerodha/save")
async def save_zerodha(req: ZerodhaAuthRequest):
    try:
        if req.request_token:
            data = zerodha.generate_session(req.api_key, req.api_secret, req.request_token)
            await update_broker_status("zerodha", True, data.get("user_id"))
        else:
            zerodha.save_credentials(req.api_key, req.api_secret)
            await update_broker_status("zerodha", False)
        return {"status": "success", "message": "Zerodha credentials saved"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/brokers/angelone/login")
async def login_angelone(req: AngelOneAuthRequest):
    res = angelone.login_with_totp(
        client_id=req.client_id,
        password_pin=req.password_pin,
        api_key=req.api_key,
        totp_secret=req.totp_secret
    )
    if res.get("status"):
        await update_broker_status("angelone", True, req.client_id)
        return res
    raise HTTPException(status_code=400, detail=res.get("message", "Login failed"))


@app.get("/api/alerts")
async def list_alerts():
    return await get_all_alerts()


@app.post("/api/alerts")
async def add_alert(alert: AlertCreate):
    isin = alert.isin
    if not isin:
        isin = SYMBOL_TO_ISIN.get(alert.tradingsymbol.upper(), f"SYM_{alert.tradingsymbol.upper()}")

    alert_id = await create_alert({
        "isin": isin,
        "tradingsymbol": alert.tradingsymbol.upper(),
        "exchange": alert.exchange,
        "condition_type": alert.condition_type,
        "target_value": alert.target_value,
        "broker_sync": alert.broker_sync,
        "note": alert.note or ""
    })

    # If broker sync is enabled, optionally place GTT
    if alert.broker_sync == "ZERODHA_GTT":
        zerodha.place_gtt(
            tradingsymbol=alert.tradingsymbol.upper(),
            exchange=alert.exchange,
            trigger_type="SINGLE",
            trigger_price=alert.target_value,
            limit_price=alert.target_value,
            quantity=1
        )
    elif alert.broker_sync == "ANGEL_RULE":
        angelone.create_gtt_rule(
            tradingsymbol=alert.tradingsymbol.upper(),
            symboltoken="",
            exchange=alert.exchange,
            trigger_price=alert.target_value,
            price=alert.target_value,
            qty=1
        )

    return {"status": "success", "id": alert_id}


@app.delete("/api/alerts/{alert_id}")
async def remove_alert(alert_id: int):
    await delete_alert(alert_id)
    return {"status": "success"}


@app.post("/api/alerts/{alert_id}/toggle")
async def toggle_alert(alert_id: int, status: str = "DISABLED"):
    await update_alert_status(alert_id, status)
    return {"status": "success"}


@app.post("/api/alerts/test-trigger/{alert_id}")
async def test_trigger_alert(alert_id: int):
    """
    Manually triggers an alert to test macOS banner notification with sound.
    """
    alerts = await get_all_alerts()
    matched = [a for a in alerts if a["id"] == alert_id]
    if not matched:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert = matched[0]
    sym = alert["tradingsymbol"]
    target = alert["target_value"]
    note = alert.get("note") or "Test trigger fired"
    msg = f"{sym} reached target ₹{target:,.2f}"

    await update_alert_status(alert_id, "TRIGGERED", target)
    send_macos_notification(
        title=f"🚨 Stock Alert: {sym}",
        subtitle=msg,
        message=note,
        sound="Glass"
    )
    await alert_daemon.broadcast_event("alert_triggered", {
        "alert_id": alert_id,
        "symbol": sym,
        "price": target,
        "message": msg,
        "note": note
    })
    return {"status": "success", "message": "Notification dispatched"}


@app.post("/api/sectors/override")
async def override_sector(req: SectorOverrideRequest):
    await set_sector_override(req.isin, req.sector)
    return {"status": "success", "isin": req.isin, "sector": req.sector}


@app.get("/api/quote/{symbol}")
async def get_quote(symbol: str):
    """
    Get live quote details for any NSE stock.
    """
    sym = symbol.upper()
    try:
        loop = asyncio.get_event_loop()
        def fetch():
            t = yf.Ticker(f"{sym}.NS")
            fast = t.fast_info
            return {
                "symbol": sym,
                "last_price": float(fast.last_price or 0.0),
                "previous_close": float(fast.previous_close or 0.0),
                "open": float(fast.open or 0.0),
                "day_high": float(fast.day_high or 0.0),
                "day_low": float(fast.day_low or 0.0),
                "year_high": float(fast.year_high or 0.0),
                "year_low": float(fast.year_low or 0.0),
            }
        data = await loop.run_in_executor(None, fetch)
        if data["previous_close"] > 0:
            change = data["last_price"] - data["previous_close"]
            pct = (change / data["previous_close"]) * 100.0
            data["change"] = round(change, 2)
            data["change_percent"] = round(pct, 2)
        return data
    except Exception as e:
        # Fallback to known mock stock price
        return {"symbol": sym, "last_price": 1000.0, "change": 0.0, "change_percent": 0.0}


@app.get("/api/events")
async def sse_events(request: Request):
    """
    Server-Sent Events endpoint to stream real-time updates to UI.
    """
    queue = await alert_daemon.subscribe()

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield f"data: {data}\n\n"
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat
                    yield ": ping\n\n"
        finally:
            alert_daemon.unsubscribe(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

