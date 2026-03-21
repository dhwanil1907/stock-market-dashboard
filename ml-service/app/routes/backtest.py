from fastapi import APIRouter, HTTPException, Query
import yfinance as yf
from app.utils.backtest import run_backtest
from app.models.schemas import BacktestResponse

router = APIRouter()

VALID_STRATEGIES = {"SMA_CROSS", "RSI", "MACD"}

@router.get("/{ticker}", response_model=BacktestResponse)
async def backtest(
    ticker: str,
    strategy: str = Query("SMA_CROSS", description="SMA_CROSS | RSI | MACD"),
    period: str = Query("2y", description="yfinance period: 1y, 2y, 5y"),
):
    if strategy not in VALID_STRATEGIES:
        raise HTTPException(status_code=400, detail=f"strategy must be one of {VALID_STRATEGIES}")

    if period not in {"1y", "2y", "5y"}:
        raise HTTPException(status_code=400, detail="period must be 1y, 2y, or 5y")

    try:
        stock = yf.Ticker(ticker.upper())
        df = stock.history(period=period)

        if df.empty or len(df) < 60:
            raise HTTPException(status_code=400, detail="Insufficient historical data for backtesting")

        result = run_backtest(ticker.upper(), df, strategy=strategy)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
