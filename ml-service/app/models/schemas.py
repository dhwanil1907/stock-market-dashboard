from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class QuoteResponse(BaseModel):
    symbol: str
    price: float
    change: float
    change_percent: float
    open: float
    high: float
    low: float
    volume: int
    market_cap: Optional[int] = None
    pe_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    company_name: str
    description: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None

class HistoryPoint(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int

class ForecastPoint(BaseModel):
    date: str
    price: float
    lower: Optional[float] = None
    upper: Optional[float] = None

class PredictResponse(BaseModel):
    ticker: str
    arima_forecast: List[ForecastPoint]
    lstm_forecast: List[ForecastPoint]
    ensemble_forecast: List[ForecastPoint]
    recommendation: str
    confidence: float
    reasoning: str
    metrics: Dict[str, float]
    price_target: float
    price_change_pct: float
    rsi_value: float
    current_price: float
    arima_target: float
    lstm_target: float

class SearchResult(BaseModel):
    symbol: str
    name: str

# Options schemas
class OptionContract(BaseModel):
    strike: Optional[float] = None
    lastPrice: Optional[float] = None
    bid: Optional[float] = None
    ask: Optional[float] = None
    volume: Optional[int] = None
    openInterest: Optional[int] = None
    impliedVolatility: Optional[float] = None
    inTheMoney: Optional[bool] = None

class OptionsChainResponse(BaseModel):
    ticker: str
    expiration: str
    expirations: List[str]
    calls: List[OptionContract]
    puts: List[OptionContract]

# Sector heatmap schemas
class SectorPerformance(BaseModel):
    sector: str
    etf: str
    price: float
    change_pct: float
    month_return_pct: float
    error: Optional[str] = None

# Backtest schemas
class TradeEvent(BaseModel):
    date: str
    action: str
    price: float
    shares: int
    value: float

class EquityPoint(BaseModel):
    date: str
    value: float

class BacktestResponse(BaseModel):
    ticker: str
    strategy: str
    initial_capital: float
    final_value: float
    total_return_pct: float
    buy_hold_return_pct: float
    max_drawdown_pct: float
    sharpe_ratio: float
    win_rate: float
    total_trades: int
    equity_curve: List[EquityPoint]
    trades: List[TradeEvent]
