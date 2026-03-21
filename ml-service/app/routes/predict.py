import asyncio
from functools import partial
from fastapi import APIRouter, HTTPException, Query
import yfinance as yf
from app.utils.ensemble import get_ensemble_prediction
from app.utils.cache import prediction_cache
from app.models.schemas import PredictResponse

router = APIRouter()

@router.get("/{ticker}", response_model=PredictResponse)
async def predict(ticker: str, horizon: int = Query(30, ge=7, le=90)):
    cache_key = f"{ticker}_{horizon}"
    cached_val = await prediction_cache.get(cache_key)
    if cached_val:
        return cached_val

    try:
        stock = yf.Ticker(ticker)
        df = stock.history(period="2y")

        if df.empty or len(df) < 100:
            raise HTTPException(status_code=400, detail="Insufficient historical data for prediction")

        # Run CPU-bound prediction in thread pool so other requests aren't blocked
        loop = asyncio.get_event_loop()
        prediction = await loop.run_in_executor(
            None,
            partial(get_ensemble_prediction, ticker, df, horizon)
        )

        await prediction_cache.set(cache_key, prediction)
        return prediction

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in prediction for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
