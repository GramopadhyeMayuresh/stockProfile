export interface AggregatedHolding {
  isin: string;
  tradingsymbol: string;
  company_name?: string;
  exchange: string;
  brokers: string[];
  broker_quantities: Record<string, number>;
  total_quantity: number;
  average_price: number;
  last_price: number;
  invested_value: number;
  current_value: number;
  pnl: number;
  pnl_percent: number;
  sector: string;
  weight_percent: number;
  day_change: number;
  day_change_percent: number;
}

export interface SectorAllocation {
  sector: string;
  current_value: number;
  invested_value: number;
  weight_percent: number;
  pnl: number;
  pnl_percent: number;
  stock_count: number;
}

export interface BrokerAccount {
  id: string;
  client_id?: string;
  is_connected: boolean;
  is_active?: boolean;
  last_synced_at?: string;
}

export interface PortfolioSummary {
  total_invested: number;
  total_current_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  day_pnl: number;
  day_pnl_percent: number;
  stock_count: number;
  sector_count: number;
  top_gainers: AggregatedHolding[];
  top_losers: AggregatedHolding[];
  brokers_status: Record<string, BrokerAccount>;
  last_synced_at?: string;
}

export interface Alert {
  id: number;
  isin: string;
  tradingsymbol: string;
  exchange: string;
  condition_type: "PRICE_ABOVE" | "PRICE_BELOW" | "PCT_CHANGE_UP" | "PCT_CHANGE_DOWN";
  target_value: number;
  broker_sync: "LOCAL_ONLY" | "ZERODHA_GTT" | "ANGEL_RULE";
  status: "ACTIVE" | "TRIGGERED" | "DISABLED";
  note?: string;
  created_at: string;
  triggered_at?: string;
  last_checked_price?: number;
}

export interface AlertCreate {
  isin?: string;
  tradingsymbol: string;
  exchange?: string;
  condition_type: "PRICE_ABOVE" | "PRICE_BELOW" | "PCT_CHANGE_UP" | "PCT_CHANGE_DOWN";
  target_value: number;
  broker_sync?: "LOCAL_ONLY" | "ZERODHA_GTT" | "ANGEL_RULE";
  note?: string;
}

export interface DividendPayout {
  date: string;
  amount: number;
}

export interface StockDividendInfo {
  isin: string;
  tradingsymbol: string;
  company_name?: string;
  total_quantity: number;
  last_price: number;
  average_price: number;
  current_value: number;
  invested_value: number;
  dividend_rate: number;
  dividend_yield: number;
  yield_on_cost: number;
  annual_cashflow: number;
  ex_dividend_date?: string | null;
  recent_payouts: DividendPayout[];
}

export interface MonthlyCashflow {
  month: string;
  month_name: string;
  month_index: number;
  projected_amount: number;
  stocks: string[];
}

export interface UpcomingDividendEvent {
  tradingsymbol: string;
  company_name: string;
  ex_dividend_date: string;
  dividend_rate: number;
  total_quantity: number;
  estimated_payout: number;
  dividend_yield: number;
}

export interface DividendSummary {
  total_annual_cashflow: number;
  average_monthly_cashflow: number;
  portfolio_dividend_yield: number;
  portfolio_yield_on_cost: number;
  dividend_paying_stocks_count: number;
  total_stocks_count: number;
  monthly_cashflow: MonthlyCashflow[];
  stocks: StockDividendInfo[];
  upcoming_events: UpcomingDividendEvent[];
  last_updated?: string | null;
}

export interface PortfolioSnapshot {
  id?: number;
  date: string;
  total_invested: number;
  total_current_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  day_pnl: number;
  nifty50_close?: number;
  created_at?: string;
}

export interface PortfolioHistoryResponse {
  timeframe: string;
  snapshots: PortfolioSnapshot[];
  start_value: number;
  end_value: number;
  period_change_value: number;
  period_change_percent: number;
  all_time_high_value: number;
  all_time_high_date: string;
  all_time_low_value: number;
  all_time_low_date: string;
  nifty_benchmark_return_percent: number;
}

export interface TechnicalIndicatorItem {
  isin: string;
  tradingsymbol: string;
  company_name: string;
  sector: string;
  total_quantity: number;
  last_price: number;
  average_price: number;
  high_52w: number;
  low_52w: number;
  pct_from_52w_high: number;
  pct_from_52w_low: number;
  ema_50: number;
  ema_200: number;
  pct_from_200_ema: number;
  trend_signal: string;
  updated_at?: string;
}

