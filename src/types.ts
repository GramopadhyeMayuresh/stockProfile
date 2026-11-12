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
