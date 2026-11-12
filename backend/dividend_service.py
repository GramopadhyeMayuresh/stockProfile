import re
import asyncio
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Any, Optional
import yfinance as yf

from .models import (
    AggregatedHolding,
    StockDividendInfo,
    MonthlyCashflow,
    DividendSummary,
    DividendPayout,
)
from .database import get_all_cached_dividends, upsert_dividend_cache_batch

MONTH_NAMES = [
    ("Jan", "January", 1),
    ("Feb", "February", 2),
    ("Mar", "March", 3),
    ("Apr", "April", 4),
    ("May", "May", 5),
    ("Jun", "June", 6),
    ("Jul", "July", 7),
    ("Aug", "August", 8),
    ("Sep", "September", 9),
    ("Oct", "October", 10),
    ("Nov", "November", 11),
    ("Dec", "December", 12),
]


def clean_ticker_symbol(tradingsymbol: str) -> str:
    """
    Remove NSE series suffixes like -BE, -BZ, -SM, -ST, -EQ, -BL
    so Yahoo Finance recognizes the symbol.
    """
    clean = re.sub(r"-(BE|BZ|SM|ST|EQ|BL)$", "", tradingsymbol.strip().upper())
    return f"{clean}.NS"


def fetch_single_stock_dividend(isin: str, tradingsymbol: str) -> Dict[str, Any]:
    """
    Synchronous worker querying Yahoo Finance for dividend metrics.
    """
    ticker_str = clean_ticker_symbol(tradingsymbol)
    try:
        stock = yf.Ticker(ticker_str)
        info = stock.info or {}

        # 1. Dividend Rate (Annual ₹ per share)
        raw_rate = info.get("dividendRate")
        div_rate = float(raw_rate) if raw_rate is not None else 0.0

        # 2. Historical Dividends
        payouts: List[Dict[str, Any]] = []
        try:
            divs = stock.dividends
            if divs is not None and not divs.empty:
                for dt, val in divs.tail(6).items():
                    try:
                        dt_str = dt.strftime("%Y-%m-%d")
                    except Exception:
                        dt_str = str(dt)[:10]
                    payouts.append({"date": dt_str, "amount": round(float(val), 2)})
        except Exception:
            pass

        # If dividendRate was missing but recent payouts exist, sum the last 12 months
        if div_rate == 0.0 and payouts:
            recent_year_sum = 0.0
            now = datetime.now()
            for p in payouts:
                try:
                    p_date = datetime.strptime(p["date"], "%Y-%m-%d")
                    if (now - p_date).days <= 400:
                        recent_year_sum += p["amount"]
                except Exception:
                    pass
            if recent_year_sum > 0:
                div_rate = round(recent_year_sum, 2)

        # 3. Dividend Yield %
        raw_yield = info.get("dividendYield")
        div_yield = 0.0
        if raw_yield is not None:
            # yfinance returns yield as e.g. 5.61 for 5.61%
            val = float(raw_yield)
            div_yield = round(val, 2)

        # 4. Ex-Dividend Date
        ex_date_str: Optional[str] = None
        raw_ex = info.get("exDividendDate")
        if raw_ex:
            try:
                if isinstance(raw_ex, (int, float)):
                    ex_date_str = datetime.fromtimestamp(raw_ex, tz=timezone.utc).strftime("%Y-%m-%d")
                else:
                    ex_date_str = str(raw_ex)[:10]
            except Exception:
                pass

        # Check calendar as secondary source for upcoming ex-dividend date
        if not ex_date_str:
            try:
                cal = stock.calendar
                if cal and isinstance(cal, dict) and "Ex-Dividend Date" in cal:
                    val = cal["Ex-Dividend Date"]
                    if val:
                        ex_date_str = str(val)[:10]
            except Exception:
                pass

        return {
            "isin": isin,
            "tradingsymbol": tradingsymbol,
            "dividend_rate": div_rate,
            "dividend_yield": div_yield,
            "ex_dividend_date": ex_date_str,
            "recent_payouts": payouts,
        }
    except Exception as e:
        print(f"[DividendService] Error fetching {tradingsymbol} ({ticker_str}): {e}")
        return {
            "isin": isin,
            "tradingsymbol": tradingsymbol,
            "dividend_rate": 0.0,
            "dividend_yield": 0.0,
            "ex_dividend_date": None,
            "recent_payouts": [],
        }


async def calculate_portfolio_dividends(
    holdings: List[AggregatedHolding],
    force_refresh: bool = False,
) -> DividendSummary:
    """
    Calculate full dividend calendar, annual cashflow, monthly distribution,
    and portfolio yields using cached data with background refresh.
    """
    if not holdings:
        return DividendSummary(
            total_annual_cashflow=0.0,
            average_monthly_cashflow=0.0,
            portfolio_dividend_yield=0.0,
            portfolio_yield_on_cost=0.0,
            dividend_paying_stocks_count=0,
            total_stocks_count=0,
            monthly_cashflow=[],
            stocks=[],
            upcoming_events=[],
            last_updated=datetime.now().isoformat(),
        )

    cached_map = await get_all_cached_dividends()
    now = datetime.now()

    # Identify items needing refresh (not in cache, force_refresh, or older than 24h)
    to_fetch: List[AggregatedHolding] = []
    for h in holdings:
        cached = cached_map.get(h.isin)
        if force_refresh or not cached:
            to_fetch.append(h)
        else:
            try:
                updated_at = datetime.fromisoformat(cached["updated_at"])
                if (now - updated_at).total_seconds() > 86400:  # 24 hours
                    to_fetch.append(h)
            except Exception:
                to_fetch.append(h)

    # Concurrently fetch stale/missing items
    if to_fetch:
        print(f"[DividendService] Fetching fresh dividend metrics for {len(to_fetch)} stocks...")
        loop = asyncio.get_running_loop()
        with ThreadPoolExecutor(max_workers=8) as executor:
            tasks = [
                loop.run_in_executor(executor, fetch_single_stock_dividend, h.isin, h.tradingsymbol)
                for h in to_fetch
            ]
            fetched_results = await asyncio.gather(*tasks)

        # Upsert into SQLite
        await upsert_dividend_cache_batch(fetched_results)
        # Update local cached map
        for res in fetched_results:
            cached_map[res["isin"]] = {
                "isin": res["isin"],
                "tradingsymbol": res["tradingsymbol"],
                "dividend_rate": res["dividend_rate"],
                "dividend_yield": res["dividend_yield"],
                "ex_dividend_date": res["ex_dividend_date"],
                "recent_payouts": res["recent_payouts"],
                "updated_at": datetime.now().isoformat(),
            }

    # Process and aggregate metrics
    stocks_info: List[StockDividendInfo] = []
    total_annual_cashflow = 0.0
    total_current_val = 0.0
    total_invested_val = 0.0
    dividend_paying_count = 0

    # Monthly cashflow buckets (1 to 12)
    monthly_totals: Dict[int, float] = {m[2]: 0.0 for m in MONTH_NAMES}
    monthly_stocks: Dict[int, List[str]] = {m[2]: [] for m in MONTH_NAMES}

    upcoming_events: List[Dict[str, Any]] = []

    for h in holdings:
        c = cached_map.get(h.isin, {})
        div_rate = float(c.get("dividend_rate") or 0.0)
        payouts_raw = c.get("recent_payouts") or []
        payouts = [DividendPayout(**p) for p in payouts_raw]
        ex_date = c.get("ex_dividend_date")

        total_current_val += h.current_value
        total_invested_val += h.invested_value

        annual_cashflow = round(h.total_quantity * div_rate, 2)
        if annual_cashflow > 0:
            dividend_paying_count += 1
            total_annual_cashflow += annual_cashflow

        # Calculate current yield and yield-on-cost
        curr_yield = round((div_rate / h.last_price * 100), 2) if h.last_price > 0 else 0.0
        yoc = round((div_rate / h.average_price * 100), 2) if h.average_price > 0 else 0.0

        stock_info = StockDividendInfo(
            isin=h.isin,
            tradingsymbol=h.tradingsymbol,
            company_name=h.company_name or h.tradingsymbol,
            total_quantity=h.total_quantity,
            last_price=h.last_price,
            average_price=h.average_price,
            current_value=h.current_value,
            invested_value=h.invested_value,
            dividend_rate=div_rate,
            dividend_yield=curr_yield,
            yield_on_cost=yoc,
            annual_cashflow=annual_cashflow,
            ex_dividend_date=ex_date,
            recent_payouts=payouts,
        )
        stocks_info.append(stock_info)

        # Distribute projected cashflow into monthly buckets based on historical payouts
        if annual_cashflow > 0:
            # Check historical months in recent payouts
            payout_months: List[int] = []
            for p in payouts:
                try:
                    m = int(p.date.split("-")[1])
                    if m not in payout_months:
                        payout_months.append(m)
                except Exception:
                    pass

            # If no historical payouts, try ex-dividend date month
            if not payout_months and ex_date:
                try:
                    m = int(ex_date.split("-")[1])
                    payout_months.append(m)
                except Exception:
                    pass

            # Default fallback for dividend paying stocks with no date: allocate to May & Aug (Indian peak seasons)
            if not payout_months:
                payout_months = [5, 8]

            share_per_month = annual_cashflow / len(payout_months)
            for m in payout_months:
                monthly_totals[m] += share_per_month
                if h.tradingsymbol not in monthly_stocks[m]:
                    monthly_stocks[m].append(h.tradingsymbol)

        # Record upcoming/recent ex-date events
        if ex_date and div_rate > 0:
            upcoming_events.append({
                "tradingsymbol": h.tradingsymbol,
                "company_name": h.company_name or h.tradingsymbol,
                "ex_dividend_date": ex_date,
                "dividend_rate": div_rate,
                "total_quantity": h.total_quantity,
                "estimated_payout": annual_cashflow,
                "dividend_yield": curr_yield,
            })

    # Sort stocks by annual cashflow descending (top dividend contributors first)
    stocks_info.sort(key=lambda s: s.annual_cashflow, reverse=True)

    # Sort upcoming events by ex_dividend_date
    upcoming_events.sort(key=lambda e: e["ex_dividend_date"], reverse=True)

    # Format monthly cashflow
    monthly_cashflow: List[MonthlyCashflow] = []
    for abbr, full_name, idx in MONTH_NAMES:
        monthly_cashflow.append(
            MonthlyCashflow(
                month=abbr,
                month_name=full_name,
                month_index=idx,
                projected_amount=round(monthly_totals[idx], 2),
                stocks=monthly_stocks[idx],
            )
        )

    # Portfolio yields
    port_yield = (
        round((total_annual_cashflow / total_current_val * 100), 2)
        if total_current_val > 0
        else 0.0
    )
    port_yoc = (
        round((total_annual_cashflow / total_invested_val * 100), 2)
        if total_invested_val > 0
        else 0.0
    )

    return DividendSummary(
        total_annual_cashflow=round(total_annual_cashflow, 2),
        average_monthly_cashflow=round(total_annual_cashflow / 12, 2),
        portfolio_dividend_yield=port_yield,
        portfolio_yield_on_cost=port_yoc,
        dividend_paying_stocks_count=dividend_paying_count,
        total_stocks_count=len(holdings),
        monthly_cashflow=monthly_cashflow,
        stocks=stocks_info,
        upcoming_events=upcoming_events[:10],
        last_updated=datetime.now().isoformat(),
    )

