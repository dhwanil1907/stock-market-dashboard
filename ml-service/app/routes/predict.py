from fastapi import APIRouter, HTTPException, Query
import yfinance as yf
from app.utils.ensemble import get_ensemble_prediction
from app.utils.cache import prediction_cache
from app.models.schemas import PredictResponse

router = APIRouter()

@router.get("/{ticker}", response_model=PredictResponse)
async def predict(ticker: str, horizon: int = Query(30, ge=7, le=90)):
    # Check cache
    cache_key = f"{ticker}_{horizon}"
    cached_val = await prediction_cache.get(cache_key)
    if cached_val:
        return cached_val
        
    try:
        # Fetch 2 years of daily data
        stock = yf.Ticker(ticker)
        df = stock.history(period="2y")
        
        if df.empty or len(df) < 100:
            raise HTTPException(status_code=400, detail="Insufficient historical data for prediction")
            
        prediction = get_ensemble_prediction(ticker, df, horizon)
        
        # Save to cache
        await prediction_cache.set(cache_key, prediction)
        
        return prediction
    except Exception as e:
        print(f"Error in prediction for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
