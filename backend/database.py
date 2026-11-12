import os
import aiosqlite
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from .sector_data import KNOWN_INDIAN_STOCKS

from contextlib import asynccontextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), "stockprofile.db")


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
                last_synced_at TEXT,
                credentials_json TEXT
            );
        """)

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


async def get_all_holdings() -> List[Dict[str, Any]]:
    async with get_db_connection() as db:
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
            res[r["id"]] = {
                "id": r["id"],
                "client_id": r["client_id"],
                "is_connected": bool(r["is_connected"]),
                "last_synced_at": r["last_synced_at"],
            }
        return res


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
