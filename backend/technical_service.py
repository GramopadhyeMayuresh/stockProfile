import asyncio
import re
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Any, Optional
import yfinance as yf

from .models import AggregatedHolding
from .database import get_technical_cache, upsert_technical_cache_batch


def clean_ticker_symbol(tradingsymbol: str) -> str:
    clean = re.sub(r"-(BE|BZ|SM|ST|EQ|BL)$", "", tradingsymbol.strip().upper())
    return f"{clean}.NS"


def compute_single_technical_metrics(isin: str, tradingsymbol: str, ltp_override: float = 0.0) -> Dict[str, Any]:
    """
    Fetch 1-year historical prices and compute 52-Week High/Low and 50/200 EMA.
    """
    ticker_str = clean_ticker_symbol(tradingsymbol)
    try:
        stock = yf.Ticker(ticker_str)
        info = stock.info or {}
        hist = stock.history(period="1y")

        if hist.empty:
            # Fallback if history unavailable
            ltp = ltp_override or float(info.get("regularMarketPrice") or 100.0)
            return {
                "isin": isin,
                "tradingsymbol": tradingsymbol,
                "last_price": ltp,
                "high_52w": ltp * 1.15,
                "low_52w": ltp * 0.85,
                "pct_from_52w_high": 15.0,
                "pct_from_52w_low": 15.0,
                "ema_50": ltp,
                "ema_200": ltp,
                "pct_from_200_ema": 0.0,
                "trend_signal": "NEUTRAL",
                "updated_at": datetime.now().isoformat(),
            }

        closes = hist["Close"]
        ltp = float(ltp_override) if ltp_override > 0 else float(closes.iloc[-1])

        # 52-Week High & Low
        high_52w = float(info.get("fiftyTwoWeekHigh") or hist["High"].max())
        low_52w = float(info.get("fiftyTwoWeekLow") or hist["Low"].min())

        # Ensure high >= ltp and low <= ltp for data integrity
        high_52w = max(high_52w, ltp)
        low_52w = min(low_52w, ltp)

        # 50 & 200 EMA
        ema_50 = float(closes.ewm(span=min(50, len(closes)), adjust=False).mean().iloc[-1])
        ema_200 = float(closes.ewm(span=min(200, len(closes)), adjust=False).mean().iloc[-1])

        # Distance percentages
        pct_from_52w_high = round(((high_52w - ltp) / high_52w * 100), 2) if high_52w > 0 else 0.0
        pct_from_52w_low = round(((ltp - low_52w) / low_52w * 100), 2) if low_52w > 0 else 0.0
        pct_from_200_ema = round(((ltp - ema_200) / ema_200 * 100), 2) if ema_200 > 0 else 0.0

        # Trend Signal
        if pct_from_52w_high <= 3.0:
            signal = "52W_BREAKOUT_ZONE"
        elif ltp >= ema_200 and ema_50 >= ema_200:
            signal = "GOLDEN_BULLISH"
        elif ltp >= ema_200:
            signal = "ABOVE_200_EMA"
        elif pct_from_52w_low <= 4.0:
            signal = "52W_SUPPORT_DIP"
        else:
            signal = "BELOW_200_EMA"

        return {
            "isin": isin,
            "tradingsymbol": tradingsymbol,
            "last_price": round(ltp, 2),
            "high_52w": round(high_52w, 2),
            "low_52w": round(low_52w, 2),
            "pct_from_52w_high": pct_from_52w_high,
            "pct_from_52w_low": pct_from_52w_low,
            "ema_50": round(ema_50, 2),
            "ema_200": round(ema_200, 2),
            "pct_from_200_ema": pct_from_200_ema,
            "trend_signal": signal,
            "updated_at": datetime.now().isoformat(),
        }
    except Exception as e:
        print(f"[TechnicalService] Error computing technicals for {tradingsymbol}: {e}")
        ltp = ltp_override or 100.0
        return {
            "isin": isin,
            "tradingsymbol": tradingsymbol,
            "last_price": round(ltp, 2),
            "high_52w": round(ltp * 1.15, 2),
            "low_52w": round(ltp * 0.85, 2),
            "pct_from_52w_high": 15.0,
            "pct_from_52w_low": 15.0,
            "ema_50": round(ltp, 2),
            "ema_200": round(ltp, 2),
            "pct_from_200_ema": 0.0,
            "trend_signal": "NEUTRAL",
            "updated_at": datetime.now().isoformat(),
        }


async def get_or_calculate_technicals(
    holdings: List[AggregatedHolding],
    force_refresh: bool = False,
) -> List[Dict[str, Any]]:
    """
    Get cached technical indicators or compute concurrently using ThreadPoolExecutor.
    """
    if not holdings:
        return []

    cached_map = await get_technical_cache()
    now = datetime.now()

    to_fetch: List[AggregatedHolding] = []
    for h in holdings:
        cached = cached_map.get(h.isin)
        if force_refresh or not cached:
            to_fetch.append(h)
        else:
            try:
                updated_at = datetime.fromisoformat(cached["updated_at"])
                if (now - updated_at).total_seconds() > 43200:  # 12 hours
                    to_fetch.append(h)
            except Exception:
                to_fetch.append(h)

    if to_fetch:
        print(f"[TechnicalService] Computing 52W High/Low & 200 EMA for {len(to_fetch)} stocks...")
        loop = asyncio.get_running_loop()
        with ThreadPoolExecutor(max_workers=8) as executor:
            tasks = [
                loop.run_in_executor(
                    executor,
                    compute_single_technical_metrics,
                    h.isin,
                    h.tradingsymbol,
                    h.last_price,
                )
                for h in to_fetch
            ]
            results = await asyncio.gather(*tasks)

        await upsert_technical_cache_batch(results)
        for r in results:
            cached_map[r["isin"]] = r

    # Build response for all holdings with company details
    out = []
    for h in holdings:
        tech = cached_map.get(h.isin, {})
        if tech:
            out.append({
                "isin": h.isin,
                "tradingsymbol": h.tradingsymbol,
                "company_name": h.company_name or h.tradingsymbol,
                "sector": h.sector,
                "total_quantity": h.total_quantity,
                "last_price": h.last_price,
                "average_price": h.average_price,
                "high_52w": tech.get("high_52w", h.last_price),
                "low_52w": tech.get("low_52w", h.last_price),
                "pct_from_52w_high": tech.get("pct_from_52w_high", 0.0),
                "pct_from_52w_low": tech.get("pct_from_52w_low", 0.0),
                "ema_50": tech.get("ema_50", h.last_price),
                "ema_200": tech.get("ema_200", h.last_price),
                "pct_from_200_ema": tech.get("pct_from_200_ema", 0.0),
                "trend_signal": tech.get("trend_signal", "NEUTRAL"),
                "updated_at": tech.get("updated_at"),
            })

    # Sort: breakout setups first (closest to 52-week high)
    out.sort(key=lambda x: x["pct_from_52w_high"])
    return out
