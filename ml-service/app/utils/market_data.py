import time
import yfinance as yf
import pandas as pd
from typing import List
from app.models.schemas import QuoteResponse, HistoryPoint, SearchResult
from app.utils.finnhub_client import get_client

# Simple in-memory quote cache — 60s TTL to stay within Finnhub's 60 req/min free limit
_quote_cache: dict = {}
_QUOTE_TTL = 60  # seconds

def _cache_get(key: str):
    entry = _quote_cache.get(key)
    if entry and time.time() - entry['ts'] < _QUOTE_TTL:
        return entry['val']
    return None

def _cache_set(key: str, val):
    _quote_cache[key] = {'val': val, 'ts': time.time()}


def get_stock_quote(ticker: str) -> QuoteResponse:
    cached = _cache_get(ticker)
    if cached:
        return cached

    try:
        fh = get_client()
        quote = fh.quote(ticker)
        profile = fh.company_profile2(symbol=ticker)

        price = quote.get('c') or 0.0
        prev_close = quote.get('pc') or price
        change = round(price - prev_close, 2)
        change_percent = round((change / prev_close * 100) if prev_close else 0.0, 2)

        result = QuoteResponse(
            symbol=ticker,
            price=round(price, 2),
            change=change,
            change_percent=change_percent,
            open=round(quote.get('o') or 0.0, 2),
            high=round(quote.get('h') or 0.0, 2),
            low=round(quote.get('l') or 0.0, 2),
            volume=int(quote.get('v') or 0),
            market_cap=int(profile.get('marketCapitalization', 0) * 1_000_000) or None,
            pe_ratio=None,
            dividend_yield=None,
            company_name=profile.get('name', ticker),
            description=None,
            sector=profile.get('finnhubIndustry'),
            industry=profile.get('finnhubIndustry'),
        )
        _cache_set(ticker, result)
        return result
    except Exception as e:
        print(f"Error fetching quote for {ticker}: {e}")
        raise ValueError(f"Could not fetch data for {ticker}")


def get_stock_history(ticker: str, period: str = "1y") -> List[HistoryPoint]:
    # Keep yfinance for historical OHLCV — Finnhub free tier is limited here
    try:
        stock = yf.Ticker(ticker)
        df = stock.history(period=period)

        history = []
        for index, row in df.iterrows():
            history.append(HistoryPoint(
                date=index.strftime('%Y-%m-%d'),
                open=round(row['Open'], 2),
                high=round(row['High'], 2),
                low=round(row['Low'], 2),
                close=round(row['Close'], 2),
                volume=int(row['Volume'])
            ))
        return history
    except Exception as e:
        print(f"Error fetching history for {ticker}: {e}")
        return []


# Expanded fallback ticker list
_FALLBACK_TICKERS = [
    {"symbol": "AAPL", "name": "Apple Inc."},
    {"symbol": "MSFT", "name": "Microsoft Corporation"},
    {"symbol": "GOOGL", "name": "Alphabet Inc."},
    {"symbol": "AMZN", "name": "Amazon.com Inc."},
    {"symbol": "TSLA", "name": "Tesla, Inc."},
    {"symbol": "META", "name": "Meta Platforms, Inc."},
    {"symbol": "NVDA", "name": "NVIDIA Corporation"},
    {"symbol": "BRK-B", "name": "Berkshire Hathaway Inc."},
    {"symbol": "V", "name": "Visa Inc."},
    {"symbol": "JPM", "name": "JPMorgan Chase & Co."},
    {"symbol": "UNH", "name": "UnitedHealth Group"},
    {"symbol": "JNJ", "name": "Johnson & Johnson"},
    {"symbol": "XOM", "name": "Exxon Mobil Corporation"},
    {"symbol": "WMT", "name": "Walmart Inc."},
    {"symbol": "MA", "name": "Mastercard Incorporated"},
    {"symbol": "PG", "name": "Procter & Gamble Co."},
    {"symbol": "HD", "name": "The Home Depot, Inc."},
    {"symbol": "CVX", "name": "Chevron Corporation"},
    {"symbol": "ABBV", "name": "AbbVie Inc."},
    {"symbol": "KO", "name": "The Coca-Cola Company"},
    {"symbol": "LLY", "name": "Eli Lilly and Company"},
    {"symbol": "AVGO", "name": "Broadcom Inc."},
    {"symbol": "PEP", "name": "PepsiCo, Inc."},
    {"symbol": "COST", "name": "Costco Wholesale Corporation"},
    {"symbol": "MRK", "name": "Merck & Co., Inc."},
    {"symbol": "BAC", "name": "Bank of America Corporation"},
    {"symbol": "AMD", "name": "Advanced Micro Devices"},
    {"symbol": "INTC", "name": "Intel Corporation"},
    {"symbol": "NFLX", "name": "Netflix, Inc."},
    {"symbol": "CRM", "name": "Salesforce, Inc."},
    {"symbol": "DIS", "name": "The Walt Disney Company"},
    {"symbol": "ADBE", "name": "Adobe Inc."},
    {"symbol": "PYPL", "name": "PayPal Holdings, Inc."},
    {"symbol": "UBER", "name": "Uber Technologies, Inc."},
    {"symbol": "SPOT", "name": "Spotify Technology"},
    {"symbol": "HOOD", "name": "Robinhood Markets, Inc."},
    {"symbol": "COIN", "name": "Coinbase Global, Inc."},
    {"symbol": "SQ", "name": "Block, Inc."},
    {"symbol": "SHOP", "name": "Shopify Inc."},
    {"symbol": "PLTR", "name": "Palantir Technologies"},
    {"symbol": "SNOW", "name": "Snowflake Inc."},
    {"symbol": "NET", "name": "Cloudflare, Inc."},
    {"symbol": "DDOG", "name": "Datadog, Inc."},
    {"symbol": "MU", "name": "Micron Technology, Inc."},
    {"symbol": "QCOM", "name": "Qualcomm Incorporated"},
    {"symbol": "TXN", "name": "Texas Instruments"},
    {"symbol": "ORCL", "name": "Oracle Corporation"},
    {"symbol": "IBM", "name": "IBM Corporation"},
    {"symbol": "GS", "name": "Goldman Sachs Group"},
    {"symbol": "MS", "name": "Morgan Stanley"},
]


def search_tickers(query: str) -> List[SearchResult]:
    query_upper = query.upper()

    # Try Finnhub symbol search
    try:
        fh = get_client()
        results_raw = fh.symbol_search(query)
        results = []
        for r in (results_raw.get('result') or []):
            symbol = r.get('symbol', '')
            name = r.get('description', symbol)
            # Filter to US common stocks only
            if symbol and r.get('type') == 'Common Stock' and '.' not in symbol:
                results.append(SearchResult(symbol=symbol, name=name))
        if results:
            return results[:10]
    except Exception:
        pass

    # Fallback: filter local list
    results = []
    for t in _FALLBACK_TICKERS:
        if query_upper in t["symbol"] or query_upper in t["name"].upper():
            results.append(SearchResult(**t))

    return results[:10]
