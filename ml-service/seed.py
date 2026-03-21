import asyncio
import yfinance as yf
from app.utils.ensemble import get_ensemble_prediction
from app.utils.cache import prediction_cache

async def seed_data():
    """
    Pre-trains and caches 5 major tickers on startup.
    """
    tickers = ["AAPL", "TSLA", "MSFT", "AMZN", "GOOGL"]
    print(f"Starting seed process for: {tickers}")
    
    for ticker in tickers:
        try:
            print(f"Seeding {ticker}...")
            stock = yf.Ticker(ticker)
            df = stock.history(period="2y")
            
            if not df.empty:
                prediction = get_ensemble_prediction(ticker, df, 30)
                await prediction_cache.set(f"{ticker}_30", prediction)
                print(f"Successfully seeded {ticker}")
        except Exception as e:
            print(f"Failed to seed {ticker}: {e}")
            
    print("Seed process complete.")

if __name__ == "__main__":
    asyncio.run(seed_data())
