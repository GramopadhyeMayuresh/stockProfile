# StockProfile — Comprehensive Features & User Guide 📖

**StockProfile** is a local-first, privacy-focused macOS desktop app designed for Indian equity investors. It combines holdings from multiple brokers (**Zerodha Kite** and **Angel One SmartAPI**) into a unified portfolio view with automated dividend tracking, compounding history charts, technical breakout alerts, and 1-click tax export.

---

## 📑 Table of Contents
1. [Privacy Mode & Data Protection](#1-privacy-mode--data-protection)
2. [Broker Accounts & Multi-Broker Tracking](#2-broker-accounts--multi-broker-tracking)
3. [Dashboard & Aggregated Holdings](#3-dashboard--aggregated-holdings)
4. [Daily Portfolio History & Compounding Trend Chart](#4-daily-portfolio-history--compounding-trend-chart)
5. [Sector Allocation & Risk Distribution](#5-sector-allocation--risk-distribution)
6. [Dividends & Expected Cashflow Calendar](#6-dividends--expected-cashflow-calendar)
7. [52-Week High & 200 EMA Technical Alerts](#7-52-week-high--200-ema-technical-alerts)
8. [1-Click Excel / CSV Export & Field Customizer](#8-1-click-excel--csv-export--field-customizer)

---

## 1. Privacy Mode & Data Protection

StockProfile is built with a **Privacy-First Architecture**:
- All financial balances are stored strictly on your local machine in SQLite (`stockprofile.db`) and credentials in macOS Keychain (`keyring`). No user financial data or telemetry is sent to any external server.

### What Privacy Mode Does:
- **Default State:** Privacy Mode is **enabled by default** (`Masked`).
- **Amounts Masked:** Total Invested, Total Current Value, Unrealized P&L, Daily P&L, Account Cash Balances, and Expected Dividend Rupee amounts are replaced with `₹ ••••••`.
- **Public Data Visible:** Publicly observable market data—specifically **LTP (Last Traded Price)**, return percentages (`+18.57%`), stock quantities, and calendar dates—remain visible so you can monitor market activity safely in coffee shops, offices, or screen-shares.
- **How to Toggle:**
  - Click the **Eye icon button** in the top navigation bar (`Visible` / `Masked`).
  - Or toggle it inside the **Broker Accounts** settings page.
  - Your preference is automatically persisted across app restarts in `localStorage`.

---

## 2. Broker Accounts & Multi-Broker Tracking

StockProfile seamlessly synchronizes with the two largest retail brokers in India:

### Zerodha Kite Connect:
- **Authentication:** Standard OAuth 2.0 flow.
- **Local Callback Loopback:** Automatically captures the redirect at `http://127.0.0.1:8765/callback/zerodha`, eliminating copy-pasting request tokens.
- **Secure Storage:** API Key & Secret are stored securely in macOS Keychain.

### Angel One SmartAPI:
- **Credentials:** Client ID, MPIN, API Key, and TOTP Secret Key.
- **Zero-Touch Silent Daily Re-Auth:** Uses your 32-character TOTP secret to generate time-based OTPs silently in the background, keeping your session live every morning without manual 2FA entry.
- **Symbol Sanitation:** Automatically strips `-EQ` series suffixes (`ITC-EQ` -> `ITC`) to harmonize with Zerodha and Yahoo Finance.

### Single-Broker Toggle (Independent Tracking):
- On the **Broker Accounts** page, each connected broker features a **Tracking: Active / Paused** toggle.
- **Use Case:** If you only have one broker account, or wish to audit your Zerodha holdings independently from your Angel One account, simply pause one broker. The entire app (KPI cards, Sector distribution, Holdings table, and CSV export) instantly re-calculates exclusively for the active broker.

---

## 3. Dashboard & Aggregated Holdings

The central command dashboard aggregates all your investments:

### Top KPI Metric Cards:
- **Total Invested:** Sum of capital deployed across all active broker accounts.
- **Current Value:** Real-time market valuation (`Total Qty × LTP`).
- **Unrealized P&L:** Net absolute profit/loss with all-time return percentage.
- **Today's P&L:** Intraday value change based on today's price movements.

### Aggregated Holdings Table:
- **Unified ISIN Matching:** If you hold shares of the same company across both brokers (e.g. 209 shares of **ITC** in Zerodha + 100 shares in Angel One):
  - Displays a combined holding row of **309 shares**.
  - Calculates the **Weighted Average Buy Price** (`(Q1×P1 + Q2×P2) / (Q1+Q2)`).
  - Shows broker badges (`ZER`, `ANG`, `ZER + ANG`). Hovering over the badge displays a detailed tooltip showing the exact share split per broker.
- **Overall vs Daily P&L Toggle:**
  - Segmented toggle at the top of the table switching between **Overall P&L** (all-time gains) and **Daily P&L** (today's gains).
  - Clicking column headers sorts dynamically by the active mode.
- **Sector Badges:** Abbreviated badges (`IT`, `FIN`, `FMCG`, etc.) with full sector names on hover tooltip.
- **LTP & Quantities:** Shows clear `Qty:` labels and unmasked real-time market prices.
- **1-Click Alert Launcher:** Click the bell icon next to any holding to instantly configure an alert for that specific stock.

---

## 4. Daily Portfolio History & Compounding Trend Chart

Accessible via the **History & Trend** tab in the top navigation bar.

### Features & Capabilities:
- **Interactive SVG Curve:** Renders continuous historical portfolio net worth with smooth area gradients and glowing drop-shadows.
- **Invested Capital Baseline:** Dashed secondary line plotted directly beneath the valuation curve, visually showing your capital cushion and accumulated profit over time.
- **Timeframe Selector:** Switch timeframes with 1 click:
  - `1W` (Last 7 days)
  - `1M` (Last 30 days)
  - `3M` (Last 90 days)
  - `6M` (Last 180 days)
  - `1Y` (Last 365 days)
  - `ALL` (Entire recording history)
- **Interactive Crosshair & Hover Tooltip:** Move your cursor across the chart to view:
  - Exact historical date
  - Portfolio valuation on that day
  - Cumulative invested capital
  - Unrealized P&L and return %
  - NIFTY 50 index closing level on that session
- **Performance Analytics Cards:**
  - **Period Return:** Rupee gain/loss and percentage return over the selected timeframe.
  - **Period Peak (ATH):** Highest valuation ever achieved during the period, along with the date it occurred.
  - **Period Low:** Lowest valuation point during the period.
  - **Alpha vs NIFTY 50:** Comparative outperformance percentage versus the benchmark NIFTY 50 index.
- **Automated Snapshots:** Background daemon automatically records closing valuations in SQLite `portfolio_snapshots`.

---

## 5. Sector Allocation & Risk Distribution

Accessible via the **Sector Allocation** tab.

### Features:
- **SEBI Industry Classification:** Categorizes Indian stocks across 11 standard industry sectors (Financial Services, IT, FMCG, Healthcare, Energy, Capital Goods, etc.).
- **Visual Weight Bars:** Displays your percentage exposure per sector compared to recommended balance guidelines.
- **Sector P&L:** Shows which sectors are driving your portfolio alpha versus which are lagging.
- **Concentration Risk Alerts:** Highlights sectors where your allocation exceeds 30% to prevent over-concentration.

---

## 6. Dividends & Expected Cashflow Calendar

Accessible via the **Dividends & Cashflow** tab.

### Features & Capabilities:
- **Projected Annual Dividend (₹):** Total estimated passive dividend cashflow over the next 12 months based on your current share counts and corporate payout declarations.
- **Average Monthly Dividend (₹):** Annual dividend divided by 12, showing your monthly passive income run-rate.
- **Portfolio Dividend Yield (%):** Annual dividend divided by current portfolio market value.
- **Yield on Cost (YoC) (%):** Annual dividend divided by your actual purchase cost. As companies increase dividends over time, your Yield on Cost expands (e.g. buying ITC at ₹262 yielding 6.1% on original cost).
- **Interactive 12-Month Projected Cashflow Bar Chart (Jan – Dec):**
  - Displays monthly seasonality (reflecting typical Indian dividend cycles peaking in May, June, July, and August).
  - **Click to Filter:** Click any month (e.g. *May*) to filter the stock table below and inspect the specific companies paying dividends in that month.
  - Highlights the **Current Month** with a special indicator.
- **Upcoming & Recent Ex-Dividend Dates:** Cards displaying upcoming corporate ex-dates, declared dividend per share, and expected payout credit.
- **Holdings Breakdown Table:**
  - Annual dividend per share (₹)
  - Current Yield % vs Yield on Cost %
  - Visual progress bar showing each stock's percentage contribution to your annual dividend income
  - Mini badges showing recent historical dividend payouts (dates and amounts)
- **Fast SQLite Cache:** Dividend records are cached in `dividend_cache`, loading in **< 2 milliseconds** on app start.

---

## 7. 52-Week High & 200 EMA Technical Alerts

Accessible via the **Alerts & Technicals** tab.

### Technical Analysis Engine:
- **52-Week High / Low Proximity Scanner:**
  - Evaluates how close each stock is to its 52-week high (`(High - LTP) / High × 100`).
  - Identifies **Breakout Setups** when a stock is within 3% of its 52-week high.
- **200-Day Exponential Moving Average (EMA):**
  - Computes the 200-session EMA to gauge institutional long-term trend support.
  - Computes the 50-session EMA to detect **Golden Cross** conditions (`50 EMA > 200 EMA`).
- **52-Week Range Bar:** Visual slider showing where the stock's current price sits within its 52-week high-to-low channel.

### Technical Signal Badges:
| Signal Badge | Meaning |
| :--- | :--- |
| **`⚡ 52W Breakout Zone`** | Stock is within 3% of its 52-Week High (high-probability momentum breakout). |
| **`📈 Golden Trend`** | Stock is trading above 200 EMA with 50 EMA > 200 EMA (bullish macro structure). |
| **`Above 200 EMA`** | Stock is trading above its long-term moving average. |
| **`Near 52W Low`** | Stock is within 4% of its 52-Week Low (deep value support or oversold condition). |
| **`Below 200 EMA`** | Stock is trading in a long-term corrective or bearish phase. |

### 1-Click Technical Preset Alerts:
Instead of manually typing prices, click any preset button on a stock row to create an alert instantly:
- **`⚡ 52W High`**: Sets a price breakout alert at `0.995 × 52W High`.
- **`📈 200 EMA`**: Sets a trendline cross alert at the exact 200-day EMA price.
- **`🛡️ -5% Stop`**: Sets a protective trailing stop-loss alert at `0.95 × LTP`.
- **`🎯 +10% Target`**: Sets a profit target alert at `1.10 × LTP`.

### Background Alert Daemon:
- Runs locally in Python (`backend/alert_daemon.py`).
- Continuously polls during Indian market hours (9:15 AM – 3:30 PM IST).
- Dispatches native **macOS Notification Center** banners with sound when triggers hit.

---

## 8. 1-Click Excel / CSV Export & Field Customizer

Accessible via the **Export CSV** button in the Holdings toolbar.

### Features & Capabilities:
- **Interactive Field Selection Modal:** Choose which columns to include in your export.
- **19 Configurable Fields across 4 Groups:**
  1. **Stock Identity:** Trading Symbol, Company Name, ISIN, Exchange, Sector, Sector Code
  2. **Broker & Quantities:** Brokers (`Zerodha + Angel One`), Zerodha Qty, Angel One Qty, Total Quantity
  3. **Valuation & Cost:** Weighted Avg Buy Price (₹), LTP (₹), Invested Value (₹), Current Value (₹)
  4. **Returns & Performance:** Unrealized P&L (₹), Return (%), Today's P&L (₹), Today's Change (%), Portfolio Weight (%)
- **4 Instant 1-Click Presets:**
  - **All Fields (19 columns):** Complete exhaustive portfolio dump.
  - **Tax & CA Audit:** Clean report optimized for chartered accountants and capital gains tax filing (Symbol, ISIN, Exchange, Qty, Buy Avg, LTP, Invested, Current Value, P&L).
  - **Multi-Broker Breakdown:** Focuses on share quantities split across Zerodha vs Angel One.
  - **Performance:** Weights, rupee gains, daily moves, and return percentages.
- **Formatted Summary / Total Row:** Toggleable bottom `TOTAL` row computing aggregated invested capital, portfolio valuation, and weighted returns.
- **Filter-Aware:** If you filter by sector or search for specific symbols, the export matches your active view; with no filter, it exports the entire portfolio.
- **Excel & Apple Numbers Compatible:** Encoded with **UTF-8 BOM (`\uFEFF`)** and CRLF row delimiters, preventing garbled Indian Rupee symbols (₹) or formatting corruptions.
- **Persistent Preferences:** Remembers your column selections in `localStorage`.
- **REST API Endpoint:** External tools or scripts can query `GET /api/portfolio/export/csv?fields=tradingsymbol,total_quantity,last_price,current_value&include_totals=true`.
