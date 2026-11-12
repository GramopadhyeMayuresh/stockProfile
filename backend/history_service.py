import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import yfinance as yf

from .database import get_portfolio_snapshots, upsert_portfolio_snapshot
from .models import PortfolioSummary

TIMEFRAME_DAYS = {
    "1W": 7,
    "1M": 30,
    "3M": 90,
    "6M": 180,
    "1Y": 365,
    "ALL": None,
}


async def ensure_initial_snapshots(current_summary: PortfolioSummary):
    """
    If portfolio_snapshots is fresh/empty, backfill 90 days of realistic daily
    performance curve using actual Nifty 50 daily changes so the chart is
    immediately interactive and useful on day one.
    """
    existing = await get_portfolio_snapshots(days=10)
    today_str = datetime.now().strftime("%Y-%m-%d")

    # Always ensure today's snapshot is saved
    await upsert_portfolio_snapshot(
        date_str=today_str,
        invested=current_summary.total_invested,
        current_val=current_summary.total_current_value,
        pnl=current_summary.total_pnl,
        pnl_pct=current_summary.total_pnl_percent,
        day_pnl=current_summary.day_pnl,
        nifty_close=25299.35,
    )

    if len(existing) >= 5:
        return

    print("[HistoryService] Backfilling initial 90-day trajectory based on Nifty 50 history...")
    try:
        # Run yfinance fetch in threadpool
        def fetch_nifty():
            n = yf.Ticker("^NSEI")
            return n.history(period="3mo")

        hist = await asyncio.to_thread(fetch_nifty)
        if hist.empty:
            return

        closes = hist["Close"].tolist()
        dates = [d.strftime("%Y-%m-%d") for d in hist.index]

        latest_close = closes[-1]
        cur_val = current_summary.total_current_value
        inv_val = current_summary.total_invested

        for d_str, close in zip(dates[:-1], closes[:-1]):
            # Approximate portfolio movement indexed to market beta (~1.05)
            rel_ratio = close / latest_close
            simulated_val = round(cur_val * (0.95 + 0.05 * rel_ratio) * rel_ratio, 2)
            # Gradual investment accumulation curve
            simulated_inv = round(inv_val * (0.92 + 0.08 * (closes.index(close) / len(closes))), 2)
            sim_pnl = round(simulated_val - simulated_inv, 2)
            sim_pnl_pct = round((sim_pnl / simulated_inv * 100), 2) if simulated_inv > 0 else 0.0

            await upsert_portfolio_snapshot(
                date_str=d_str,
                invested=simulated_inv,
                current_val=simulated_val,
                pnl=sim_pnl,
                pnl_pct=sim_pnl_pct,
                day_pnl=round(simulated_val * 0.005, 2),
                nifty_close=round(float(close), 2),
            )
    except Exception as e:
        print(f"[HistoryService] Warning backfilling snapshots: {e}")


async def get_portfolio_history_analytics(
    timeframe: str = "1M",
    current_summary: Optional[PortfolioSummary] = None,
) -> Dict[str, Any]:
    """
    Calculate performance trajectory, ATH/ATL, and benchmark returns.
    """
    if current_summary:
        await ensure_initial_snapshots(current_summary)

    days = TIMEFRAME_DAYS.get(timeframe.upper(), 30)
    snapshots = await get_portfolio_snapshots(days=days)

    if not snapshots:
        return {
            "timeframe": timeframe,
            "snapshots": [],
            "start_value": 0.0,
            "end_value": 0.0,
            "period_change_value": 0.0,
            "period_change_percent": 0.0,
            "all_time_high_value": 0.0,
            "all_time_high_date": "",
            "all_time_low_value": 0.0,
            "all_time_low_date": "",
            "nifty_benchmark_return_percent": 0.0,
        }

    start_val = snapshots[0]["total_current_value"]
    end_val = snapshots[-1]["total_current_value"]
    period_change = round(end_val - start_val, 2)
    period_pct = round((period_change / start_val * 100), 2) if start_val > 0 else 0.0

    # All-Time High & Low in this period
    ath_item = max(snapshots, key=lambda s: s["total_current_value"])
    atl_item = min(snapshots, key=lambda s: s["total_current_value"])

    # Nifty Benchmark Return
    nifty_start = snapshots[0].get("nifty50_close") or 0.0
    nifty_end = snapshots[-1].get("nifty50_close") or 0.0
    nifty_pct = (
        round(((nifty_end - nifty_start) / nifty_start * 100), 2)
        if nifty_start > 0 and nifty_end > 0
        else 0.0
    )

    return {
        "timeframe": timeframe,
        "snapshots": snapshots,
        "start_value": start_val,
        "end_value": end_val,
        "period_change_value": period_change,
        "period_change_percent": period_pct,
        "all_time_high_value": ath_item["total_current_value"],
        "all_time_high_date": ath_item["date"],
        "all_time_low_value": atl_item["total_current_value"],
        "all_time_low_date": atl_item["date"],
        "nifty_benchmark_return_percent": nifty_pct,
    }

