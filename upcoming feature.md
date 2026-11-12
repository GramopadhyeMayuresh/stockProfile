# StockProfile — Upcoming Features & Product Roadmap 🚀

This document tracks the feature roadmap for **StockProfile** (macOS Indian Equity Portfolio & Alert Desktop App). It outlines completed milestones, technical architecture plans, and priority queues for upcoming capabilities utilizing free/zero-cost APIs (Zerodha Kite Connect, Angel One SmartAPI, Yahoo Finance NSE, and local SQLite persistence).

---

## 📊 Roadmap Overview & Status Matrix

| Priority | Feature | Status | Target Version | Key Value Proposition |
| :---: | :--- | :---: | :---: | :--- |
| **P0** | **1-Click Excel/CSV Export** | ✅ **Completed** | `v0.1.0` | Instant CA & Tax-audit ready reports with custom field selection |
| **P1** | **Dividend Calendar & Expected Cashflow** | ✅ **Completed** | `v0.2.0` | Track upcoming ex-dates, yield-on-cost & projected annual ₹ cashflow |
| **P2** | **Market Cap Breakdown (Large/Mid/Small Cap)** | ⏳ **Next Up** | `v0.2.1` | SEBI/AMFI asset allocation distribution & risk profiling |
| **P3** | **Daily Portfolio Value History & Trend Chart** | 📋 **Planned** | `v0.3.0` | Local SQLite snapshotting & interactive compounding chart |
| **P4** | **52-Week High & 200 EMA Technical Alerts** | 📋 **Planned** | `v0.3.1` | Background scanner for breakout levels & moving average crosses |

---

## 1. 1-Click Excel/CSV Export with Field Customizer
- **Status:** ✅ **Completed & Shipped** (`main` branch)
- **Component References:**
  - Frontend Modal: `src/components/ExportModal.tsx`
  - Toolbar Action: `src/components/HoldingsTable.tsx`
  - Backend API: `GET /api/portfolio/export/csv` in `backend/main.py`
- **Key Capabilities Delivered:**
  - [x] 1-Click export to standard CSV with UTF-8 BOM (`\uFEFF`) and CRLF formatting for Microsoft Excel & Apple Numbers.
  - [x] Interactive field selection modal with 19 configurable columns across 4 categories (Stock Identity, Broker Split, Valuation, P&L).
  - [x] 4 Instant Presets: **All Fields**, **Tax & CA Audit**, **Multi-Broker Breakdown**, and **Performance**.
  - [x] Toggleable formatted `TOTAL` summary row calculating total capital, valuation, and weighted returns.
  - [x] Filter-aware export (exports filtered search/sector view or all holdings).
  - [x] LocalStorage persistence for user column choices.
  - [x] Backend endpoint supporting query parameters `?fields=...` and `?include_totals=true|false`.

---

## 2. Dividend Calendar & Expected Cashflow Tracker
- **Status:** ✅ **Completed & Shipped** (`v0.2.0`)
- **Component References:**
  - Frontend Tab: `src/components/DividendCashflowView.tsx`
  - Navigation: `src/components/Navbar.tsx` (`Dividends & Cashflow` tab)
  - Backend Service: `backend/dividend_service.py`
  - Database Table: `dividend_cache` in `backend/database.py`
  - Backend APIs: `GET /api/portfolio/dividends` & `POST /api/portfolio/dividends/refresh`
- **Key Capabilities Delivered:**
  - [x] Multi-threaded concurrent dividend fetcher for Indian NSE equities (strips broker series suffixes like `-BE`, `-EQ`).
  - [x] Fast SQLite cache (`dividend_cache`) providing instant < 2ms lookups.
  - [x] Projected Annual Dividend ₹ and Average Monthly ₹ Cashflow computation.
  - [x] Portfolio Dividend Yield % (on current valuation) and Yield on Cost % (on actual invested capital).
  - [x] Interactive 12-Month Projected Cashflow Bar Chart (Jan–Dec) with click-to-filter stock inspection.
  - [x] Upcoming & Recent Ex-Dividend Dates timeline with share counts and estimated payout credit.
  - [x] Stock-by-stock breakdown table with sorting, search, and historical payout badges.
  - [x] Full Privacy Mode masking support (`isMasked` respects `₹ ••••••`).
   - **Annual Dividend Income:** Total expected annual cashflow in ₹ based on current shares held.
   - **Portfolio Dividend Yield:** Weighted portfolio dividend yield %.
   - **Interactive Cashflow Calendar:** Projected monthly payout bar chart (January to December).
   - **Upcoming Ex-Dividend Tracker:** Table showing upcoming ex-dates, declared dividend per share, and expected payout to bank account.
   - **Dividend Alerts:** Background alert when a held stock announces an ex-dividend date within the next 7 days.

---

## 3. Market Cap Breakdown (Large Cap / Mid Cap / Small Cap)
- **Status:** 📋 **Planned (Priority 2)**
- **Target Release:** `v0.2.1`
- **Motivation:** SEBI and financial advisors recommend maintaining a balanced asset allocation between Large Cap (stability), Mid Cap (growth), and Small Cap (alpha).

### Technical Specification:
1. **Classification Engine:**
   - Follow AMFI (Association of Mutual Funds in India) official ranking:
     - **Large Cap:** Top 100 companies by market capitalization.
     - **Mid Cap:** 101st to 250th companies.
     - **Small Cap:** 251st company onwards.
   - Store mapping in `backend/sector_data.py` with automatic fallback to Yahoo Finance `marketCap` (Large Cap > ₹20,000 Cr, Mid Cap ₹5,000–₹20,000 Cr, Small Cap < ₹5,000 Cr).
2. **Visual Dashboard Component (`MarketCapAllocationView.tsx`):**
   - Donut / Pie distribution chart alongside current Sector allocation.
   - Exposure summary pills: e.g. `Large Cap: 62%`, `Mid Cap: 26%`, `Small Cap: 12%`.
   - Concentration warnings (e.g. if single Small Cap stock exceeds 15% of total portfolio).

---

## 4. Daily Portfolio Value History & Compounding Trend Chart
- **Status:** 📋 **Planned (Priority 3)**
- **Target Release:** `v0.3.0`
- **Motivation:** Brokers only show point-in-time value or intraday P&L. Tracking day-over-day net worth compounding over weeks, months, and years provides long-term investing clarity.

### Technical Specification:
1. **Local SQLite Persistence:**
   - Schema: `portfolio_snapshots (id INTEGER PRIMARY KEY, date TEXT UNIQUE, total_invested REAL, total_current REAL, total_pnl REAL, day_pnl REAL, timestamp DATETIME)`
   - Auto-snapshot trigger: Background alert daemon captures daily closing valuation at 3:35 PM IST or upon the first daily portfolio sync.
2. **Interactive Chart View (`PortfolioHistoryChart.tsx`):**
   - Built using SVG or lightweight charting (`recharts` / `chart.js`).
   - Timeframe filter tabs: `1W` | `1M` | `3M` | `6M` | `1Y` | `ALL`.
   - Comparative overlay option: Portfolio growth % vs NIFTY 50 benchmark index.
   - Tooltip displaying Rupee value, absolute profit, and percentage return on any historical date.

---

## 5. 52-Week High & 200 EMA Technical Alerts
- **Status:** 📋 **Planned (Priority 4)**
- **Target Release:** `v0.3.1`
- **Motivation:** Institutional and professional retail investors monitor key technical levels (52-week highs for momentum breakouts, 200-day EMA for long-term trend support).

### Technical Specification:
1. **Background Technical Scanner:**
   - Integrated into existing `backend/alert_daemon.py`.
   - Daily morning scan (9:15 AM - 3:30 PM IST) querying Yahoo Finance for 52-week high/low prices and historical 200-day closing prices.
   - Compute 200 EMA (`EMA = (Close - EMA_prev) * (2 / (200 + 1)) + EMA_prev`).
2. **Automated Alert Triggers:**
   - **52-Week High Proximity:** Trigger when current price is within 2% of 52-week high ("*ITC is 1.2% away from 52-Week High (₹510.50)*").
   - **200 EMA Crossover:** Trigger when price crosses above 200 EMA (Bullish trend shift) or drops below 200 EMA (Bearish breakdown).
3. **Delivery Mechanism:**
   - Native macOS Notification Center push alerts with custom sound via `terminal-notifier` or `osascript`.
   - In-app Alert Center badge counter with timestamp and action button.

---

## 🛠️ Implementation Log & Change History

| Date | Milestone / Commit | Description |
| :--- | :--- | :--- |
| **2026-11-12** | `b8edbb1` | **Customizable CSV / Excel Export**: Full modal with 19 fields, presets, summary totals, and persistent preferences. |
| **2026-11-12** | `b762983` | **1-Click CSV Export**: Base export implementation with multi-broker aggregation & backend endpoint. |
| **2026-11-12** | `addd670` | **Account Toggle & Privacy Mode**: Added single-broker enable/disable toggles, masked financial mode, and daily vs overall P&L. |
| **2026-11-12** | `4dfa98e` | **Angel One SmartAPI Live Sync**: Silent TOTP token generation, holding fetch fix, symbol sanitation (`-EQ`). |
| **2026-11-12** | `6b2e310` | **Zerodha Kite Connect OAuth**: Local loopback redirect, keychain secret storage, portfolio aggregation. |

