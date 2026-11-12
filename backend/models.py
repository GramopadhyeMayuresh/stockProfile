from __future__ import annotations
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class BrokerAccount(BaseModel):
    id: str  # 'zerodha' | 'angelone'
    client_id: Optional[str] = None
    is_connected: bool = False
    is_active: bool = True
    last_synced_at: Optional[str] = None


class Holding(BaseModel):
    id: Optional[int] = None
    broker: str  # 'zerodha' | 'angelone'
    tradingsymbol: str
    isin: str
    exchange: str = "NSE"
    quantity: int
    average_price: float
    last_price: float
    current_value: float
    pnl: float
    pnl_percent: float = 0.0
    sector: str = "Other"
    day_change: float = 0.0
    day_change_percent: float = 0.0
    updated_at: Optional[str] = None


class AggregatedHolding(BaseModel):
    isin: str
    tradingsymbol: str
    company_name: Optional[str] = None
    exchange: str = "NSE"
    brokers: List[str]  # ['zerodha'], ['angelone'], or ['zerodha', 'angelone']
    broker_quantities: Dict[str, int] = Field(default_factory=dict)
    total_quantity: int
    average_price: float
    last_price: float
    invested_value: float
    current_value: float
    pnl: float
    pnl_percent: float
    sector: str
    weight_percent: float = 0.0
    day_change: float = 0.0
    day_change_percent: float = 0.0


class SectorAllocation(BaseModel):
    sector: str
    current_value: float
    invested_value: float
    weight_percent: float
    pnl: float
    pnl_percent: float
    stock_count: int


class PortfolioSummary(BaseModel):
    total_invested: float
    total_current_value: float
    total_pnl: float
    total_pnl_percent: float
    day_pnl: float
    day_pnl_percent: float
    stock_count: int
    sector_count: int
    top_gainers: List[AggregatedHolding] = Field(default_factory=list)
    top_losers: List[AggregatedHolding] = Field(default_factory=list)
    brokers_status: Dict[str, BrokerAccount] = Field(default_factory=dict)
    last_synced_at: Optional[str] = None


class AlertCondition(str):
    PRICE_ABOVE = "PRICE_ABOVE"
    PRICE_BELOW = "PRICE_BELOW"
    PCT_CHANGE_UP = "PCT_CHANGE_UP"
    PCT_CHANGE_DOWN = "PCT_CHANGE_DOWN"


class AlertStatus(str):
    ACTIVE = "ACTIVE"
    TRIGGERED = "TRIGGERED"
    DISABLED = "DISABLED"


class Alert(BaseModel):
    id: Optional[int] = None
    isin: str
    tradingsymbol: str
    exchange: str = "NSE"
    condition_type: str  # PRICE_ABOVE, PRICE_BELOW, PCT_CHANGE_UP, PCT_CHANGE_DOWN
    target_value: float
    broker_sync: str = "LOCAL_ONLY"  # LOCAL_ONLY, ZERODHA_GTT, ANGEL_RULE
    status: str = "ACTIVE"
    note: Optional[str] = ""
    created_at: Optional[str] = None
    triggered_at: Optional[str] = None
    last_checked_price: Optional[float] = None


class AlertCreate(BaseModel):
    tradingsymbol: str
    isin: Optional[str] = ""
    exchange: str = "NSE"
    condition_type: str
    target_value: float
    broker_sync: str = "LOCAL_ONLY"
    note: Optional[str] = ""


class ZerodhaAuthRequest(BaseModel):
    api_key: str
    api_secret: str
    request_token: Optional[str] = None


class AngelOneAuthRequest(BaseModel):
    client_id: str
    password_pin: str
    api_key: str
    totp_secret: str


class SectorOverrideRequest(BaseModel):
    isin: str
    sector: str


class DividendPayout(BaseModel):
    date: str
    amount: float


class StockDividendInfo(BaseModel):
    isin: str
    tradingsymbol: str
    company_name: Optional[str] = None
    total_quantity: int
    last_price: float
    average_price: float
    current_value: float
    invested_value: float
    dividend_rate: float
    dividend_yield: float
    yield_on_cost: float
    annual_cashflow: float
    ex_dividend_date: Optional[str] = None
    recent_payouts: List[DividendPayout] = Field(default_factory=list)


class MonthlyCashflow(BaseModel):
    month: str
    month_name: str
    month_index: int
    projected_amount: float
    stocks: List[str] = Field(default_factory=list)


class DividendSummary(BaseModel):
    total_annual_cashflow: float
    average_monthly_cashflow: float
    portfolio_dividend_yield: float
    portfolio_yield_on_cost: float
    dividend_paying_stocks_count: int
    total_stocks_count: int
    monthly_cashflow: List[MonthlyCashflow]
    stocks: List[StockDividendInfo]
    upcoming_events: List[Dict[str, Any]] = Field(default_factory=list)
    last_updated: Optional[str] = None
