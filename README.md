# StockProfile - Indian Equity Portfolio & Alert Desktop App (macOS)

A high-performance, privacy-focused macOS desktop application that aggregates equity holdings across **Zerodha (Kite Connect)** and **Angel One (SmartAPI)**, computes unified cross-broker portfolio weights, sector-wise allocations, and runs a persistent background daemon for real-time price & indicator alerts with native macOS banner notifications.

---

## 🌟 Key Features Implemented

### 1. Cross-Broker Holdings Aggregation & Normalization
* **ISIN-Based Merging:** Automatically merges identical stocks held across multiple brokers (e.g. `HDFCBANK` held in Zerodha and Angel One) into a single consolidated row using international ISIN (`INE040A01034`).
* **Weighted Average Pricing:** Computes exact volume-weighted acquisition prices across brokers:
  $$\text{Avg Cost} = \frac{(Q_{\text{zerodha}} \times P_{\text{zerodha}}) + (Q_{\text{angelone}} \times P_{\text{angelone}})}{Q_{\text{total}}}$$
* **Broker Badges:** Visual badges indicate whether a position is in `Zerodha Kite`, `Angel One`, or `Both`.
* **Portfolio Weight Calculation:** Calculates each stock's percentage weight of the total portfolio value with visual progress bars.

### 2. Indian Equity Sector Allocation Pipeline
* **Pre-seeded Knowledge Base:** Built-in mapping of 250+ top Indian stocks into standardized market sectors (Financial Services, IT, Energy & Power, FMCG, Automobile, Healthcare & Pharma, Capital Goods & Infra, Chemicals, Consumer Durables & Retail, Metals & Mining, Telecommunication, Real Estate).
* **Dynamic Fallback Resolver:** If an unknown ISIN is ingested, queries metadata/yfinance asynchronously and permanently caches the sector into the local SQLite database.
* **Interactive Donut & Performance Bars:** Interactive Recharts Donut chart displaying sector distributions, invested capital, current values, and sector-wise P&L gains.

### 3. Native macOS Background Execution & Menu Bar Tray
* **Menu Bar Tray Icon:** Lives in the top macOS Menu Bar (`NSStatusBar`) with menu actions:
  - *Open Dashboard*
  - *Sync Portfolios Now*
  - *Active Alerts*
  - *Quit StockProfile*
* **Survives Window Close:** Intercepts `CloseRequested` events to hide the window instead of quitting the application (`window.hide()`).
* **Single Click Toggle:** Clicking the Menu Bar tray icon toggles the app window into view and focuses it.

### 4. Background Alert Engine & Native macOS Notifications
* **Alert Rule Engine:** Evaluates active rules for:
  - `PRICE_ABOVE`: Price crosses above target level (₹)
  - `PRICE_BELOW`: Price falls below target level (₹)
  - `PCT_CHANGE_UP`: Daily % gain hits target (+%)
  - `PCT_CHANGE_DOWN`: Daily % drop hits target (-%)
* **Native macOS Banners & Sound:** Triggers native macOS banner notifications with sound (`Glass`) via system bridges even when the app window is closed or hidden.
* **1-Click Test Trigger:** Includes an instant test trigger button to verify macOS banner notifications immediately.
* **Broker GTT Mirroring:** Option to mirror alerts to Zerodha GTT or Angel One SmartAPI GTT rules.

### 5. Local-First Security & Automated Token Refresh
* **macOS Keychain Integration:** All API keys, secrets, and session tokens are encrypted in the macOS Keychain (`keyring`) and local SQLite database (`stockprofile.db`).
* **Angel One Silent TOTP Refresh:** Automated daily login using `smartapi-python` + `pyotp` with stored Client ID, MPIN, API Key, and TOTP secret—eliminating manual TOTP logins every morning.
* **Zerodha OAuth Callback Listener:** Local endpoint (`http://127.0.0.1:8765/callback/zerodha`) to exchange `request_token` for daily session tokens.
* **One-Click Demo Mode:** Allows testing the full UI with realistic multi-broker holdings without entering live credentials.

---

## 🛠️ Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        macOS Desktop App (Tauri v2)                    │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐  │
│  │   React 18 + TypeScript +     │  │   macOS Menu Bar Tray Icon    │  │
│  │   Tailwind CSS + Recharts     │  │   & Window Hide On Close      │  │
│  └───────────────┬───────────────┘  └───────────────┬───────────────┘  │
└──────────────────┼──────────────────────────────────┼──────────────────┘
                   │ REST / SSE (localhost:8765)      │ IPC Events
┌──────────────────▼──────────────────────────────────▼──────────────────┐
│                      Python FastAPI Sidecar Engine                     │
│  ┌────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐ │
│  │  Zerodha Adapter   │  │  Angel One Adapter  │  │   Alert Daemon   │ │
│  │ (kiteconnect SDK)  │  │  (smartapi + pyotp) │  │  (Async Worker)  │ │
│  └─────────┬──────────┘  └──────────┬──────────┘  └────────┬─────────┘ │
│            └────────────────────────┼──────────────────────┘           │
│                                     ▼                                  │
│                 ┌──────────────────────────────────────┐               │
│                 │   Portfolio Aggregator & Sector Map  │               │
│                 │   SQLite DB + macOS Keychain         │               │
│                 └──────────────────────────────────────┘               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 How to Run the App

### Option A: One-Click Runner Script
```bash
cd /Users/mayureshgramopadhye/personal/StockProfile
./start.sh
```

### Option B: Development Mode (Hot Reload)
Terminal 1 (Backend Daemon):
```bash
cd /Users/mayureshgramopadhye/personal/StockProfile
bash backend/run_backend.sh
```

Terminal 2 (Frontend & Tauri Desktop):
```bash
cd /Users/mayureshgramopadhye/personal/StockProfile
npm run tauri dev
```

---

## 🧪 Testing and Verifying Features

1. **Verify Holdings & Aggregation:**
   - Launch the dashboard and view the **Dashboard** and **Holdings & Weights** tabs.
   - Note `HDFCBANK`: it is owned in both Zerodha (100 shares @ ₹1,580.50) and Angel One (50 shares @ ₹1,610.00). It is merged into 1 row with 150 shares @ ₹1,590.33 and badged `Zerodha + Angel One`.
2. **Verify Sector Allocation:**
   - Click the **Sector Allocation** tab to view the interactive Donut chart and progress bars for each sector.
3. **Verify Alert Engine & macOS Notification:**
   - Click the **Alerts & Daemon** tab.
   - Click **Test macOS Banner** on any alert rule.
   - Observe the native macOS banner notification with sound appearing in the top-right corner of macOS.
4. **Verify Window Close & Menu Bar Tray:**
   - Click the red close button on the macOS window. The window will hide rather than quitting.
   - Click the StockProfile icon in the top macOS Menu Bar to restore the window.
