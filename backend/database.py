import os
import sys
import shutil
import aiosqlite
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from .sector_data import KNOWN_INDIAN_STOCKS

from contextlib import asynccontextmanager

def resolve_db_path() -> str:
    # If running as bundled PyInstaller binary or in production
    app_support = os.path.expanduser("~/Library/Application Support/com.stockprofile.desktop")
    dev_db = os.path.join(os.path.dirname(__file__), "stockprofile.db")

    if getattr(sys, "frozen", False) or os.path.exists(app_support):
        os.makedirs(app_support, exist_ok=True)
        prod_db = os.path.join(app_support, "stockprofile.db")
        if not os.path.exists(prod_db) and os.path.exists(dev_db):
            try:
                shutil.copy2(dev_db, prod_db)
            except Exception:
                pass
        return prod_db
    return dev_db

DB_PATH = resolve_db_path()


@asynccontextmanager
async def get_db_connection():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def init_db():
    async with get_db_connection() as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS broker_accounts (
                id TEXT PRIMARY KEY,
                client_id TEXT,
                is_connected BOOLEAN DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                last_synced_at TEXT,
                credentials_json TEXT
            );
        """)

        # Migration for existing database
        try:
            await db.execute("ALTER TABLE broker_accounts ADD COLUMN is_active BOOLEAN DEFAULT 1")
        except Exception:
            pass

        await db.execute("""
            CREATE TABLE IF NOT EXISTS holdings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                broker TEXT NOT NULL,
                tradingsymbol TEXT NOT NULL,
                isin TEXT NOT NULL,
                exchange TEXT DEFAULT 'NSE',
                quantity INTEGER NOT NULL,
                average_price REAL NOT NULL,
                last_price REAL NOT NULL,
                current_value REAL NOT NULL,
                pnl REAL NOT NULL,
                pnl_percent REAL DEFAULT 0.0,
                sector TEXT DEFAULT 'Other',
                day_change REAL DEFAULT 0.0,
                day_change_percent REAL DEFAULT 0.0,
                updated_at TEXT,
                UNIQUE(broker, isin) ON CONFLICT REPLACE
            );
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                isin TEXT NOT NULL,
                tradingsymbol TEXT NOT NULL,
                exchange TEXT DEFAULT 'NSE',
                condition_type TEXT NOT NULL,
                target_value REAL NOT NULL,
                broker_sync TEXT DEFAULT 'LOCAL_ONLY',
                status TEXT DEFAULT 'ACTIVE',
                note TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                triggered_at TEXT,
                last_checked_price REAL
            );
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS sector_mappings (
                isin TEXT PRIMARY KEY,
                symbol TEXT NOT NULL,
                sector TEXT NOT NULL,
                custom_override BOOLEAN DEFAULT 0
            );
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS dividend_cache (
                isin TEXT PRIMARY KEY,
                tradingsymbol TEXT NOT NULL,
                dividend_rate REAL DEFAULT 0.0,
                dividend_yield REAL DEFAULT 0.0,
                ex_dividend_date TEXT,
                recent_payouts_json TEXT DEFAULT '[]',
                updated_at TEXT NOT NULL
            );
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS portfolio_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT UNIQUE NOT NULL,
                total_invested REAL NOT NULL,
                total_current_value REAL NOT NULL,
                total_pnl REAL NOT NULL,
                total_pnl_percent REAL NOT NULL,
                day_pnl REAL DEFAULT 0.0,
                nifty50_close REAL DEFAULT 0.0,
                created_at TEXT NOT NULL
            );
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS technical_cache (
                isin TEXT PRIMARY KEY,
                tradingsymbol TEXT NOT NULL,
                last_price REAL NOT NULL,
                high_52w REAL NOT NULL,
                low_52w REAL NOT NULL,
                pct_from_52w_high REAL NOT NULL,
                pct_from_52w_low REAL NOT NULL,
                ema_50 REAL NOT NULL,
                ema_200 REAL NOT NULL,
                pct_from_200_ema REAL NOT NULL,
                trend_signal TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)

        # Ensure broker_accounts rows exist
        await db.execute("INSERT OR IGNORE INTO broker_accounts (id, is_connected) VALUES ('zerodha', 0)")
        await db.execute("INSERT OR IGNORE INTO broker_accounts (id, is_connected) VALUES ('angelone', 0)")

        # Seed pre-known stocks into sector_mappings if not present
        for isin, data in KNOWN_INDIAN_STOCKS.items():
            await db.execute("""
                INSERT OR IGNORE INTO sector_mappings (isin, symbol, sector, custom_override)
                VALUES (?, ?, ?, 0)
            """, (isin, data["symbol"], data["sector"]))

        await db.commit()


async def get_sector_for_isin(isin: str, symbol: Optional[str] = None) -> Optional[str]:
    async with get_db_connection() as db:
        cursor = await db.execute("SELECT sector FROM sector_mappings WHERE isin = ?", (isin,))
        row = await cursor.fetchone()
        if row:
            return row["sector"]
        if symbol:
            cursor = await db.execute("SELECT sector FROM sector_mappings WHERE symbol = ?", (symbol.upper(),))
            row = await cursor.fetchone()
            if row:
                return row["sector"]
    return None


async def set_sector_override(isin: str, sector: str, symbol: str = ""):
    async with get_db_connection() as db:
        await db.execute("""
            INSERT INTO sector_mappings (isin, symbol, sector, custom_override)
            VALUES (?, ?, ?, 1)
            ON CONFLICT(isin) DO UPDATE SET sector = excluded.sector, custom_override = 1
        """, (isin, symbol, sector))
        # Also update in holdings table
        await db.execute("UPDATE holdings SET sector = ? WHERE isin = ?", (sector, isin))
        await db.commit()


async def get_all_holdings(active_brokers_only: bool = True) -> List[Dict[str, Any]]:
    async with get_db_connection() as db:
        if active_brokers_only:
            cursor = await db.execute("""
                SELECT h.* FROM holdings h
                JOIN broker_accounts b ON h.broker = b.id
                WHERE b.is_active = 1
                ORDER BY h.current_value DESC
            """)
        else:
            cursor = await db.execute("SELECT * FROM holdings ORDER BY current_value DESC")
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def upsert_holdings(broker: str, holdings_data: List[Dict[str, Any]]):
    now = datetime.now().isoformat()
    async with get_db_connection() as db:
        # Delete existing holdings for this broker
        await db.execute("DELETE FROM holdings WHERE broker = ?", (broker,))
        for h in holdings_data:
            current_val = float(h.get("quantity", 0)) * float(h.get("last_price", 0.0))
            invested = float(h.get("quantity", 0)) * float(h.get("average_price", 0.0))
            pnl = current_val - invested
            pnl_pct = (pnl / invested * 100.0) if invested > 0 else 0.0

            await db.execute("""
                INSERT INTO holdings (
                    broker, tradingsymbol, isin, exchange, quantity, average_price,
                    last_price, current_value, pnl, pnl_percent, sector, day_change,
                    day_change_percent, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                broker,
                h.get("tradingsymbol", ""),
                h.get("isin", ""),
                h.get("exchange", "NSE"),
                int(h.get("quantity", 0)),
                float(h.get("average_price", 0.0)),
                float(h.get("last_price", 0.0)),
                current_val,
                pnl,
                round(pnl_pct, 2),
                h.get("sector", "Other"),
                float(h.get("day_change", 0.0)),
                float(h.get("day_change_percent", 0.0)),
                now
            ))
        # Update last_synced_at
        await db.execute("""
            UPDATE broker_accounts
            SET last_synced_at = ?, is_connected = 1
            WHERE id = ?
        """, (now, broker))
        await db.commit()


async def get_broker_accounts() -> Dict[str, Dict[str, Any]]:
    async with get_db_connection() as db:
        cursor = await db.execute("SELECT * FROM broker_accounts")
        rows = await cursor.fetchall()
        res = {}
        for r in rows:
            is_act = bool(r["is_active"]) if "is_active" in r.keys() and r["is_active"] is not None else True
            res[r["id"]] = {
                "id": r["id"],
                "client_id": r["client_id"],
                "is_connected": bool(r["is_connected"]),
                "is_active": is_act,
                "last_synced_at": r["last_synced_at"],
            }
        return res


async def toggle_broker_active(broker: str, is_active: bool):
    async with get_db_connection() as db:
        await db.execute("""
            UPDATE broker_accounts
            SET is_active = ?
            WHERE id = ?
        """, (1 if is_active else 0, broker))
        await db.commit()


async def update_broker_status(broker: str, is_connected: bool, client_id: Optional[str] = None):
    async with get_db_connection() as db:
        if client_id:
            await db.execute("""
                UPDATE broker_accounts
                SET is_connected = ?, client_id = ?
                WHERE id = ?
            """, (1 if is_connected else 0, client_id, broker))
        else:
            await db.execute("""
                UPDATE broker_accounts
                SET is_connected = ?
                WHERE id = ?
            """, (1 if is_connected else 0, broker))
        await db.commit()


async def get_all_alerts(active_only: bool = False) -> List[Dict[str, Any]]:
    async with get_db_connection() as db:
        if active_only:
            cursor = await db.execute("SELECT * FROM alerts WHERE status = 'ACTIVE' ORDER BY id DESC")
        else:
            cursor = await db.execute("SELECT * FROM alerts ORDER BY id DESC")
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def create_alert(alert_data: Dict[str, Any]) -> int:
    now = datetime.now().isoformat()
    async with get_db_connection() as db:
        cursor = await db.execute("""
            INSERT INTO alerts (
                isin, tradingsymbol, exchange, condition_type, target_value,
                broker_sync, status, note, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
        """, (
            alert_data["isin"],
            alert_data["tradingsymbol"],
            alert_data.get("exchange", "NSE"),
            alert_data["condition_type"],
            float(alert_data["target_value"]),
            alert_data.get("broker_sync", "LOCAL_ONLY"),
            alert_data.get("note", ""),
            now
        ))
        await db.commit()
        return cursor.lastrowid


async def update_alert_status(alert_id: int, status: str, last_price: Optional[float] = None):
    now = datetime.now().isoformat()
    async with get_db_connection() as db:
        if status == "TRIGGERED":
            await db.execute("""
                UPDATE alerts
                SET status = ?, triggered_at = ?, last_checked_price = ?
                WHERE id = ?
            """, (status, now, last_price, alert_id))
        elif status == "ACTIVE":
            await db.execute("""
                UPDATE alerts
                SET status = ?, triggered_at = NULL, last_checked_price = COALESCE(?, last_checked_price)
                WHERE id = ?
            """, (status, last_price, alert_id))
        else:
            await db.execute("""
                UPDATE alerts
                SET status = ?, last_checked_price = COALESCE(?, last_checked_price)
                WHERE id = ?
            """, (status, last_price, alert_id))
        await db.commit()


async def delete_alert(alert_id: int):
    async with get_db_connection() as db:
        await db.execute("DELETE FROM alerts WHERE id = ?", (alert_id,))
        await db.commit()


async def get_all_cached_dividends() -> Dict[str, Dict[str, Any]]:
    """
    Fetch all cached dividend data keyed by ISIN.
    """
    async with get_db_connection() as db:
        cursor = await db.execute("SELECT * FROM dividend_cache")
        rows = await cursor.fetchall()
        result = {}
        for r in rows:
            try:
                payouts = json.loads(r["recent_payouts_json"]) if r["recent_payouts_json"] else []
            except Exception:
                payouts = []
            result[r["isin"]] = {
                "isin": r["isin"],
                "tradingsymbol": r["tradingsymbol"],
                "dividend_rate": float(r["dividend_rate"] or 0.0),
                "dividend_yield": float(r["dividend_yield"] or 0.0),
                "ex_dividend_date": r["ex_dividend_date"],
                "recent_payouts": payouts,
                "updated_at": r["updated_at"],
            }
        return result


async def upsert_dividend_cache_batch(items: List[Dict[str, Any]]):
    """
    Upsert a batch of dividend cache records.
    """
    now = datetime.now().isoformat()
    async with get_db_connection() as db:
        for item in items:
            payouts_json = json.dumps(item.get("recent_payouts", []))
            await db.execute("""
                INSERT INTO dividend_cache (
                    isin, tradingsymbol, dividend_rate, dividend_yield,
                    ex_dividend_date, recent_payouts_json, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(isin) DO UPDATE SET
                    tradingsymbol = excluded.tradingsymbol,
                    dividend_rate = excluded.dividend_rate,
                    dividend_yield = excluded.dividend_yield,
                    ex_dividend_date = excluded.ex_dividend_date,
                    recent_payouts_json = excluded.recent_payouts_json,
                    updated_at = excluded.updated_at
            """, (
                item["isin"],
                item["tradingsymbol"],
                float(item.get("dividend_rate", 0.0)),
                float(item.get("dividend_yield", 0.0)),
                item.get("ex_dividend_date"),
                payouts_json,
                now
            ))
        await db.commit()


async def get_portfolio_snapshots(days: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Fetch historical daily portfolio snapshots ordered chronologically.
    """
    async with get_db_connection() as db:
        if days:
            cursor = await db.execute("""
                SELECT * FROM portfolio_snapshots
                ORDER BY date DESC LIMIT ?
            """, (days,))
            rows = await cursor.fetchall()
            return [dict(r) for r in reversed(rows)]
        else:
            cursor = await db.execute("""
                SELECT * FROM portfolio_snapshots
                ORDER BY date ASC
            """)
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]


async def upsert_portfolio_snapshot(
    date_str: str,
    invested: float,
    current_val: float,
    pnl: float,
    pnl_pct: float,
    day_pnl: float = 0.0,
    nifty_close: float = 0.0
):
    """
    Record or update a daily portfolio snapshot.
    """
    now = datetime.now().isoformat()
    async with get_db_connection() as db:
        await db.execute("""
            INSERT INTO portfolio_snapshots (
                date, total_invested, total_current_value, total_pnl,
                total_pnl_percent, day_pnl, nifty50_close, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(date) DO UPDATE SET
                total_invested = excluded.total_invested,
                total_current_value = excluded.total_current_value,
                total_pnl = excluded.total_pnl,
                total_pnl_percent = excluded.total_pnl_percent,
                day_pnl = excluded.day_pnl,
                nifty50_close = COALESCE(NULLIF(excluded.nifty50_close, 0.0), portfolio_snapshots.nifty50_close),
                created_at = excluded.created_at
        """, (date_str, invested, current_val, pnl, pnl_pct, day_pnl, nifty_close, now))
        await db.commit()


async def get_technical_cache() -> Dict[str, Dict[str, Any]]:
    """
    Fetch all cached technical indicator metrics keyed by ISIN.
    """
    async with get_db_connection() as db:
        cursor = await db.execute("SELECT * FROM technical_cache")
        rows = await cursor.fetchall()
        return {r["isin"]: dict(r) for r in rows}


async def upsert_technical_cache_batch(items: List[Dict[str, Any]]):
    """
    Upsert a batch of technical indicator records.
    """
    now = datetime.now().isoformat()
    async with get_db_connection() as db:
        for item in items:
            await db.execute("""
                INSERT INTO technical_cache (
                    isin, tradingsymbol, last_price, high_52w, low_52w,
                    pct_from_52w_high, pct_from_52w_low, ema_50, ema_200,
                    pct_from_200_ema, trend_signal, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(isin) DO UPDATE SET
                    tradingsymbol = excluded.tradingsymbol,
                    last_price = excluded.last_price,
                    high_52w = excluded.high_52w,
                    low_52w = excluded.low_52w,
                    pct_from_52w_high = excluded.pct_from_52w_high,
                    pct_from_52w_low = excluded.pct_from_52w_low,
                    ema_50 = excluded.ema_50,
                    ema_200 = excluded.ema_200,
                    pct_from_200_ema = excluded.pct_from_200_ema,
                    trend_signal = excluded.trend_signal,
                    updated_at = excluded.updated_at
            """, (
                item["isin"],
                item["tradingsymbol"],
                float(item["last_price"]),
                float(item["high_52w"]),
                float(item["low_52w"]),
                float(item["pct_from_52w_high"]),
                float(item["pct_from_52w_low"]),
                float(item["ema_50"]),
                float(item["ema_200"]),
                float(item["pct_from_200_ema"]),
                item["trend_signal"],
                now
            ))
        await db.commit()
