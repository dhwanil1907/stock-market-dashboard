import time
import yfinance as yf
import pandas as pd
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from app.utils.finnhub_client import get_client

_sector_cache: dict = {}
_SECTOR_TTL = 60

def _cache_get(key: str):
    entry = _sector_cache.get(key)
    if entry and time.time() - entry['ts'] < _SECTOR_TTL:
        return entry['val']
    return None

def _cache_set(key: str, val):
    _sector_cache[key] = {'val': val, 'ts': time.time()}

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
    cached = _cache_get(etf)
    if cached:
        return cached

    try:
        fh = get_client()
        quote = fh.quote(etf)

        price = quote.get('c') or 0.0
        prev_close = quote.get('pc') or price
        change_pct = ((price - prev_close) / prev_close * 100) if prev_close else 0.0

        # 1-month performance via yfinance (Finnhub free tier lacks candle history for ETFs)
        month_return = 0.0
        try:
            hist = yf.Ticker(etf).history(period='1mo')
            if len(hist) >= 2:
                start = float(hist['Close'].iloc[0])
                end = float(hist['Close'].iloc[-1])
                month_return = (end - start) / start * 100 if start else 0.0
        except Exception:
            pass

        result = {
            "sector": sector,
            "etf": etf,
            "price": round(float(price), 2),
            "change_pct": round(float(change_pct), 2),
            "month_return_pct": round(float(month_return), 2),
        }
        _cache_set(etf, result)
        return result
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

    results.sort(key=lambda x: x.get('change_pct', 0), reverse=True)
    return results
