import asyncio
import yfinance as yf
from typing import Optional
from .sector_data import KNOWN_INDIAN_STOCKS, SYMBOL_TO_ISIN
from .database import get_sector_for_isin, set_sector_override

# Normalize Yahoo Finance sectors to standard Indian portfolio categories
YAHOO_TO_INDIAN_SECTOR = {
    "Financial Services": "Financial Services",
    "Technology": "Information Technology",
    "Energy": "Energy & Power",
    "Consumer Defensive": "FMCG",
    "Consumer Cyclical": "Consumer Durables & Retail",
    "Healthcare": "Healthcare & Pharma",
    "Industrials": "Capital Goods & Infra",
    "Basic Materials": "Metals & Mining",
    "Communication Services": "Telecommunication",
    "Real Estate": "Real Estate",
    "Utilities": "Energy & Power",
}


async def resolve_sector(isin: str, symbol: str) -> str:
    """
    Resolve the sector for a stock:
    1. Check database cache / overrides.
    2. Check known Indian stock dictionary.
    3. Query yfinance asynchronously and persist to DB.
    """
    if not isin and symbol:
        isin = SYMBOL_TO_ISIN.get(symbol.upper(), "")

    # 1. DB Lookup
    db_sector = await get_sector_for_isin(isin, symbol)
    if db_sector:
        return db_sector

    # 2. Pre-known lookup
    if isin in KNOWN_INDIAN_STOCKS:
        sector = KNOWN_INDIAN_STOCKS[isin]["sector"]
        await set_sector_override(isin, sector, symbol)
        return sector

    # 3. YFinance fallback (run in thread pool to avoid blocking async event loop)
    try:
        loop = asyncio.get_event_loop()
        ticker_sym = f"{symbol.upper()}.NS"
        
        def fetch_yf():
            ticker = yf.Ticker(ticker_sym)
            info = ticker.info or {}
            raw_sector = info.get("sector", "")
            return YAHOO_TO_INDIAN_SECTOR.get(raw_sector, raw_sector or "Other")

        resolved = await loop.run_in_executor(None, fetch_yf)
        if resolved and resolved != "Other":
            await set_sector_override(isin or f"TMP_{symbol}", resolved, symbol)
            return resolved
    except Exception as e:
        print(f"[SectorService] Could not resolve sector for {symbol} via yfinance: {e}")

    return "Other"
