import {
  AggregatedHolding,
  SectorAllocation,
  PortfolioSummary,
  Alert,
  AlertCreate,
  BrokerAccount,
  DividendSummary,
  PortfolioHistoryResponse,
  TechnicalIndicatorItem,
} from "./types";

const API_BASE = "http://127.0.0.1:8765/api";

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPortfolioSummary(): Promise<PortfolioSummary> {
  const res = await fetchWithTimeout(`${API_BASE}/portfolio/summary`);
  if (!res.ok) throw new Error("Failed to fetch portfolio summary");
  return res.json();
}

export async function fetchHoldings(): Promise<AggregatedHolding[]> {
  const res = await fetchWithTimeout(`${API_BASE}/portfolio/holdings`);
  if (!res.ok) throw new Error("Failed to fetch holdings");
  return res.json();
}

export async function fetchSectors(): Promise<SectorAllocation[]> {
  const res = await fetchWithTimeout(`${API_BASE}/portfolio/sectors`);
  if (!res.ok) throw new Error("Failed to fetch sectors");
  return res.json();
}

export async function fetchPortfolioDividends(): Promise<DividendSummary> {
  const res = await fetchWithTimeout(`${API_BASE}/portfolio/dividends`);
  if (!res.ok) throw new Error("Failed to fetch dividend summary");
  return res.json();
}

export async function refreshPortfolioDividends(): Promise<DividendSummary> {
  const res = await fetchWithTimeout(`${API_BASE}/portfolio/dividends/refresh`, { method: "POST" }, 30000);
  if (!res.ok) throw new Error("Failed to refresh dividend summary");
  return res.json();
}

export async function fetchPortfolioHistory(timeframe = "1M"): Promise<PortfolioHistoryResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/portfolio/history?timeframe=${timeframe}`);
  if (!res.ok) throw new Error("Failed to fetch portfolio history");
  return res.json();
}

export async function fetchTechnicalIndicators(): Promise<TechnicalIndicatorItem[]> {
  const res = await fetchWithTimeout(`${API_BASE}/technical/indicators`);
  if (!res.ok) throw new Error("Failed to fetch technical indicators");
  return res.json();
}

export async function refreshTechnicalIndicators(): Promise<TechnicalIndicatorItem[]> {
  const res = await fetchWithTimeout(`${API_BASE}/technical/refresh`, { method: "POST" }, 30000);
  if (!res.ok) throw new Error("Failed to refresh technical indicators");
  return res.json();
}

export async function createTechnicalPresetAlert(payload: {
  tradingsymbol: string;
  isin: string;
  exchange?: string;
  preset_type: string;
  target_value: number;
  note?: string;
}): Promise<{ status: string; alert_id: number }> {
  const res = await fetchWithTimeout(`${API_BASE}/technical/create-preset-alert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create preset alert");
  return res.json();
}

export async function syncPortfolios(): Promise<{ status: string; zerodha_count: number; angelone_count: number }> {
  const res = await fetchWithTimeout(`${API_BASE}/portfolio/sync`, { method: "POST" }, 30000);
  if (!res.ok) throw new Error("Failed to sync portfolios");
  return res.json();
}

export async function seedDemoPortfolio(): Promise<{ status: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/portfolio/seed-demo`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to seed demo portfolio");
  return res.json();
}

export async function fetchBrokersStatus(): Promise<Record<string, BrokerAccount>> {
  const res = await fetchWithTimeout(`${API_BASE}/brokers/status`);
  if (!res.ok) throw new Error("Failed to fetch broker status");
  return res.json();
}

export async function getZerodhaAuthUrl(apiKey?: string): Promise<{ url: string }> {
  const url = apiKey ? `${API_BASE}/brokers/zerodha/auth-url?api_key=${encodeURIComponent(apiKey)}` : `${API_BASE}/brokers/zerodha/auth-url`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to get Zerodha Auth URL");
  }
  return res.json();
}

export async function saveZerodhaCredentials(apiKey: string, apiSecret: string, requestToken?: string) {
  const res = await fetchWithTimeout(`${API_BASE}/brokers/zerodha/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, api_secret: apiSecret, request_token: requestToken }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to save Zerodha credentials");
  }
  return res.json();
}

export async function loginAngelOne(clientId: string, passwordPin: string, apiKey: string, totpSecret: string) {
  const res = await fetchWithTimeout(
    `${API_BASE}/brokers/angelone/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, password_pin: passwordPin, api_key: apiKey, totp_secret: totpSecret }),
    },
    30000
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to login to Angel One");
  }
  return res.json();
}

export async function toggleBrokerActive(brokerId: string, isActive: boolean): Promise<{ status: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/brokers/${brokerId}/toggle?is_active=${isActive}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to toggle broker active state");
  return res.json();
}

export async function fetchAlerts(): Promise<Alert[]> {
  const res = await fetchWithTimeout(`${API_BASE}/alerts`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}

export async function createAlert(alert: AlertCreate): Promise<{ status: string; id: number }> {
  const res = await fetchWithTimeout(`${API_BASE}/alerts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(alert),
  });
  if (!res.ok) throw new Error("Failed to create alert");
  return res.json();
}

export async function deleteAlert(alertId: number): Promise<{ status: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/alerts/${alertId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete alert");
  return res.json();
}

export async function toggleAlertStatus(alertId: number, status: "ACTIVE" | "DISABLED"): Promise<{ status: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/alerts/${alertId}/toggle?status=${status}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to update alert");
  return res.json();
}

export async function testTriggerAlert(alertId: number): Promise<{ status: string; message: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/alerts/test-trigger/${alertId}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to test alert trigger");
  return res.json();
}

export async function overrideSector(isin: string, sector: string): Promise<{ status: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/sectors/override`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isin, sector }),
  });
  if (!res.ok) throw new Error("Failed to override sector");
  return res.json();
}

export const SECTOR_ABBREVIATIONS: Record<string, string> = {
  "Information Technology": "IT",
  "Financial Services": "FIN",
  "Consumer Durables & Retail": "CONS",
  "Fast Moving Consumer Goods": "FMCG",
  "FMCG": "FMCG",
  "Healthcare & Pharma": "PHARMA",
  "Oil, Gas & Energy": "ENERGY",
  "Automobile & Auto Components": "AUTO",
  "Metals & Mining": "METALS",
  "Capital Goods & Infra": "INFRA",
  "Chemicals": "CHEM",
  "Telecommunication": "TELECOM",
  "Power": "POWER",
  "Real Estate": "REALTY",
  "Services": "SERV",
  "Media": "MEDIA",
  "Other": "OTHER",
};

export function getSectorAbbr(sector: string): string {
  if (!sector) return "OTHER";
  return SECTOR_ABBREVIATIONS[sector] || (sector.length <= 6 ? sector.toUpperCase() : sector.slice(0, 5).toUpperCase());
}

export function formatINR(val: number, isMasked: boolean = false): string {
  if (isMasked) {
    return "₹ ••••••";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val);
}

