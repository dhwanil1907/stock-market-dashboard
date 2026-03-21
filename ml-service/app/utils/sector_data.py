import yfinance as yf
import pandas as pd
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed

SECTOR_ETFS: Dict[str, str] = {
    "Technology": "XLK",
    "Financials": "XLF",
    "Healthcare": "XLV",
    "Energy": "XLE",
    "Industrials": "XLI",
    "Consumer Discretionary": "XLY",
    "Consumer Staples": "XLP",
    "Materials": "XLB",
    "Real Estate": "XLRE",
    "Utilities": "XLU",
    "Communication Services": "XLC",
}


def _fetch_sector(sector: str, etf: str) -> Dict[str, Any]:
    try:
        ticker = yf.Ticker(etf)
        info = ticker.info
        price = info.get('regularMarketPrice') or info.get('currentPrice') or 0.0
        prev_close = info.get('regularMarketPreviousClose') or info.get('previousClose') or price
        change_pct = ((price - prev_close) / prev_close * 100) if prev_close else 0.0

        # 1-month performance
        hist = ticker.history(period='1mo')
        month_return = 0.0
        if len(hist) >= 2:
            start = float(hist['Close'].iloc[0])
            end = float(hist['Close'].iloc[-1])
            month_return = (end - start) / start * 100 if start else 0.0

        return {
            "sector": sector,
            "etf": etf,
            "price": round(float(price), 2),
            "change_pct": round(float(change_pct), 2),
            "month_return_pct": round(float(month_return), 2),
        }
    except Exception as e:
        return {
            "sector": sector,
            "etf": etf,
            "price": 0.0,
            "change_pct": 0.0,
            "month_return_pct": 0.0,
            "error": str(e),
        }


def get_sector_performance() -> List[Dict[str, Any]]:
    results = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {
            executor.submit(_fetch_sector, sector, etf): sector
            for sector, etf in SECTOR_ETFS.items()
        }
        for future in as_completed(futures):
            results.append(future.result())

    # Sort by daily change descending
    results.sort(key=lambda x: x.get('change_pct', 0), reverse=True)
    return results
