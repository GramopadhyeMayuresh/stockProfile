# Project Implementation Plan: Indian Equity Portfolio & Alert Desktop App (macOS)

## 1. Project Overview & Goals
Build a local-first, privacy-focused macOS desktop application that aggregates equity holdings from **Zerodha (Kite Connect)** and **Angel One (SmartAPI)**, computes unified portfolio analytics (stock-wise weights, sector-wise allocation, P&L), and runs a background daemon to monitor custom price/indicator alerts with native macOS notifications.

### Core Requirements
* **Broker Integrations:** Zerodha Kite Connect API & Angel One SmartAPI.
* **Portfolio Analytics:** Unified holdings table, stock-wise percentage of total portfolio value, sector-wise allocation breakdown (donut/bar charts), and overall P&L.
* **Custom Alert Engine:** Create alerts locally (Price thresholds, % change, moving averages) synced with live market feeds (WebSocket/polling) and optionally mirrored to broker GTT/alerts.
* **Native macOS Background Experience:** Runs persistently in the macOS Menu Bar (`NSStatusBar` / Tray icon), survives window closure, launches on login, and triggers native macOS banner notifications with sound when an alert hits.
* **Local-First Security:** All API keys, access tokens, and portfolio data remain strictly on the user's Mac (stored in SQLite + macOS Keychain).

---

## 2. Recommended Tech Stack (Optimized for macOS & AI-Assisted Build)
* **Desktop Framework:** **Tauri v2** (Rust backend + React/TypeScript frontend) *OR* **Electron + Python FastAPI sidecar**.
  * *Why Tauri v2 + Python Sidecar (Recommended):* Tauri produces a lightweight (<15MB) native macOS `.app`/`.dmg` with native Menu Bar (`tray-icon`) and `tauri-plugin-notification` support, while a local Python sidecar leverages official, well-maintained SDKs (`kiteconnect` and `smartapi-python`).
* **Frontend:** React 18, TypeScript, Tailwind CSS, Shadcn/UI, Recharts (for sector & stock allocation visualizations), Lucide Icons.
* **Backend Engine:** Python 3.11+ (FastAPI + `asyncio` + `uvicorn`) bundled via PyInstaller or managed as a local daemon by Tauri.
* **Database & Secrets:**
  * **SQLite** (via SQLAlchemy/SQLite3) for holdings snapshots, sector mappings, and alert rules/history.
  * **macOS Keychain** (`keyring` in Python or `tauri-plugin-stronghold`) for encrypting broker API secrets and daily session tokens.

---

## 3. System Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        macOS Desktop App (Tauri)                    │
│  ┌───────────────────────────────┐  ┌────────────────────────────┐  │
│  │   React + Tailwind Frontend   │  │   macOS Menu Bar & Native  │  │
│  │  • Unified Dashboard          │  │   Notifications            │  │
│  │  • Sector & Stock % Charts    │  │  • Background Daemon Mode  │  │
│  │  • Alert Manager UI           │  │  • Instant Trigger Alerts  │  │
│  └───────────────┬───────────────┘  └──────────────┬─────────────┘  │
└──────────────────┼─────────────────────────────────┼────────────────┘
                   │ REST / WebSocket (localhost)    │ IPC / Events
┌──────────────────▼─────────────────────────────────▼────────────────┐
│                  Local Python FastAPI Engine                        │
│  ┌────────────────────┐  ┌────────────────────┐  ┌───────────────┐  │
│  │ Zerodha Connector  │  │ Angel One Connector│  │ Alert Worker  │  │
│  │ (kiteconnect SDK)  │  │ (smartapi-python)  │  │ (Async Loop)  │  │
│  └─────────┬──────────┘  └─────────┬──────────┘  └───────┬───────┘  │
│            └───────────────────────┼─────────────────────┘          │
│                                    ▼                                │
│                 ┌────────────────────────────────────┐              │
│                 │  Portfolio Aggregator & Sector Map │              │
│                 │  SQLite DB + macOS Keychain        │              │
│                 └────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Database Schema (SQLite)

### `broker_accounts`
* `id` (TEXT PK): `'zerodha'` | `'angelone'`
* `client_id` (TEXT): User ID
* `is_connected` (BOOLEAN)
* `last_synced_at` (DATETIME)
* *(Note: `api_key`, `api_secret`, `totp_secret`, `access_token` stored in macOS Keychain)*

### `holdings`
* `id` (INTEGER PK)
* `broker` (TEXT): `'zerodha'` | `'angelone'`
* `tradingsymbol` (TEXT): Normalized NSE/BSE symbol (e.g., `HDFCBANK`, `PIDILITIND`)
* `isin` (TEXT): **Primary key for deduplication/merging across brokers**
* `exchange` (TEXT): `'NSE'` | `'BSE'`
* `quantity` (INTEGER)
* `average_price` (REAL)
* `last_price` (REAL)
* `current_value` (REAL): `quantity * last_price`
* `pnl` (REAL)
* `sector` (TEXT): Mapped Indian equity sector (e.g., `Financial Services`, `FMCG`, `Chemicals`, `Building Materials`)

### `alerts`
* `id` (INTEGER PK)
* `isin` (TEXT)
* `tradingsymbol` (TEXT)
* `exchange` (TEXT)
* `condition_type` (TEXT): `'PRICE_ABOVE'` | `'PRICE_BELOW'` | `'PCT_CHANGE_UP'` | `'PCT_CHANGE_DOWN'`
* `target_value` (REAL)
* `broker_sync` (TEXT): `'LOCAL_ONLY'` | `'ZERODHA_GTT'` | `'ANGEL_RULE'`
* `status` (TEXT): `'ACTIVE'` | `'TRIGGERED'` | `'DISABLED'`
* `note` (TEXT): Custom message shown in macOS notification
* `created_at` (DATETIME)
* `triggered_at` (DATETIME)

---

## 5. Step-by-Step Implementation Phases for Antigravity IDE

### Phase 1: Project Scaffolding & macOS Background Shell
1. Initialize a **Tauri v2** project with React + TypeScript + Tailwind CSS (`npm create tauri-app@latest`).
2. Configure `tauri.conf.json` for macOS background execution:
   * Enable `trayIcon` so the app sits in the top macOS Menu Bar.
   * Intercept the window close event (`CloseRequested`) to hide the main window instead of quitting the process (`window.hide()`).
   * Add menu bar options: *"Open Dashboard"*, *"Sync Portfolios Now"*, *"Active Alerts (Count)"*, *"Quit"*.
3. Install and configure `tauri-plugin-notification` and `tauri-plugin-autostart` (for "Launch at Login").
4. Set up a `/backend` Python FastAPI project (`fastapi`, `uvicorn`, `kiteconnect`, `smartapi-python`, `pyotp`, `keyring`, `aiosqlite`, `yfinance`).

### Phase 2: Broker Authentication & Portfolio Ingestion
1. **Zerodha (Kite Connect) Auth Flow:**
   * Implement local OAuth callback listener (`http://127.0.0.1:8765/callback/zerodha`) to capture `request_token` after browser login and exchange it for `access_token`.
   * Fetch equity holdings via `kite.holdings()` and mutual funds/positions if needed.
2. **Angel One (SmartAPI) Auth Flow:**
   * Implement automated TOTP login using `smartapi-python` + `pyotp` (using user's stored Client ID, PIN, API Key, and TOTP secret in Keychain) so daily token refresh requires zero manual steps.
   * Fetch holdings via `smartApi.getHolding()`.
3. **Portfolio Normalization & Aggregation Engine:**
   * Merge holdings across Zerodha and Angel One using **ISIN** so if a stock (e.g., `HDFCBANK`) is held in both brokers, the dashboard shows both combined and per-broker breakdowns.
   * Compute:
     * `Total Portfolio Value` = $\sum (\text{Qty}_i \times \text{LTP}_i)$
     * `Stock Weight %` = $\frac{\text{Stock Current Value}}{\text{Total Portfolio Value}} \times 100$
     * `Sector Weight %` = $\frac{\sum \text{Sector Current Value}}{\text{Total Portfolio Value}} \times 100$

### Phase 3: Indian Stock Sector Mapping Pipeline
1. Create a local cached lookup table (`isin_sector_map.json` / SQLite table) mapping NSE/BSE ISINs to standard Indian market sectors (e.g., Banking & Finance, FMCG, IT, Auto, Pharma, Chemicals, Capital Goods, Real Estate).
2. Implement a fallback resolver: if a newly bought stock's ISIN is missing from local cache, query NSE instrument metadata or `yfinance` (`{SYMBOL}.NS`) once and cache the sector permanently in SQLite. Allow manual sector override in the UI.

### Phase 4: Real-Time Tick Stream & Custom Alert Daemon
1. **Market Data Feed:**
   * Connect to **Zerodha KiteTicker (WebSocket)** or **Angel One SmartWebSocketV2** for real-time LTP ticks of all stocks in `holdings` and `alerts` during Indian market hours (`09:15 IST – 15:30 IST`, Mon–Fri).
   * Add a fallback REST quote poller (every 15 seconds) if WebSocket disconnects.
2. **Alert Evaluation Worker:**
   * On every price tick, evaluate active rules in the `alerts` table.
   * When a condition is met:
     1. Mark alert as `TRIGGERED` (or apply cooldown if recurring).
     2. Emit an IPC event / WebSocket push to Tauri frontend.
     3. Trigger a **native macOS Notification** via `tauri-plugin-notification` with title (e.g., `🚨 Alert: PIDILITIND hit ₹3,150`), body (custom user note), and sound.
3. **Optional Broker-Side Sync:**
   * Provide a toggle when creating an alert: *"Also place GTT / Trigger on Broker"*, calling `kite.place_gtt()` for Zerodha or `smartApi.gttCreateRule()` for Angel One.

### Phase 5: Frontend Dashboard & UI Views
1. **Overview Dashboard:**
   * Top KPI Cards: Total Invested, Current Value, Overall P&L (₹ & %), Day's P&L, Top Gainer/Loser.
   * **Sector-Wise Allocation Chart:** Interactive Donut chart + horizontal progress bars showing exact `%` and `₹` value per sector.
   * **Stock-Wise Portfolio Weight Chart & Table:** Sortable/filterable table displaying Stock Name, Broker Badge (`Z` / `A` / `Both`), Qty, Avg Cost, LTP, Current Value, P&L %, and **Portfolio Weight %** (visual bar).
2. **Alerts & Watchlist Manager:**
   * Form to search any NSE/BSE symbol, pick condition (`Price >`, `Price <`, `% Drop`), set target price, add custom note, and choose local-only vs. broker-synced alert.
   * Tabs for *Active Alerts* and *Triggered History*.
3. **Broker Settings & Health Monitor:**
   * UI to enter/update Zerodha & Angel One API credentials (saved straight to macOS Keychain).
   * Connection status indicators (Token Active/Expired, WebSocket Connected, Last Sync Timestamp).

---

## 6. Key Edge Cases & Indian Market Nuances to Handle
* **Daily Token Expiry:** Both Zerodha and Angel One invalidate access tokens every morning around `06:00 AM – 07:30 AM IST`. Show a subtle Menu Bar badge/notification at `09:00 AM IST` if Zerodha requires one-click browser re-auth (Angel One can auto-refresh silently via TOTP).
* **NSE vs. BSE Symbol Differences:** A stock might be bought on BSE in Angel One (`500180`) and NSE in Zerodha (`HDFCBANK`). Always group holdings by **ISIN** (`INE040A01034`) to prevent duplicate rows.
* **Market Hours Awareness:** Pause aggressive polling outside `09:00 – 15:45 IST` and on weekends/NSE holidays to save Mac battery and CPU.
* **Rate Limits:** Respect Kite Connect (3 req/sec for quotes) and SmartAPI rate limits by batching quote requests and relying primarily on WebSocket ticks.

---

## 7. Prompt / Instructions for Antigravity IDE Execution
> **How to start with Antigravity IDE:**
> 1. Place this `plan.md` in the root of an empty workspace folder (e.g., `~/Projects/indian-portfolio-monitor`).
> 2. Instruct Antigravity: *"Read `plan.md` completely. Start by scaffolding Phase 1 (Tauri v2 + React TypeScript frontend + Python FastAPI sidecar with macOS Menu Bar tray icon and native notifications). Verify the app builds and runs in the background on macOS before moving to Phase 2."*
> 3. Proceed phase-by-phase, testing each broker adapter with mock JSON responses first before plugging in live API credentials.