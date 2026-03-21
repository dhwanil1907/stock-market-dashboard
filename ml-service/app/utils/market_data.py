import yfinance as yf
import pandas as pd
from typing import List, Optional
from app.models.schemas import QuoteResponse, HistoryPoint, SearchResult

def get_stock_quote(ticker: str) -> QuoteResponse:
    try:
        stock = yf.Ticker(ticker)
        info = stock.info

        current_price = info.get('regularMarketPrice') or info.get('currentPrice') or 0.0
        prev_close = info.get('regularMarketPreviousClose') or info.get('previousClose') or current_price
        change = current_price - prev_close
        change_percent = (change / prev_close * 100) if prev_close != 0 else 0.0

        return QuoteResponse(
            symbol=ticker,
            price=round(current_price, 2),
            change=round(change, 2),
            change_percent=round(change_percent, 2),
            open=info.get('open', 0.0),
            high=info.get('dayHigh', 0.0),
            low=info.get('dayLow', 0.0),
            volume=info.get('volume', 0),
            market_cap=info.get('marketCap'),
            pe_ratio=info.get('trailingPE'),
            dividend_yield=info.get('dividendYield'),
            company_name=info.get('longName', ticker),
            description=info.get('longBusinessSummary'),
            sector=info.get('sector'),
            industry=info.get('industry')
        )
    except Exception as e:
        print(f"Error fetching quote for {ticker}: {e}")
        raise ValueError(f"Could not fetch data for {ticker}")

def get_stock_history(ticker: str, period: str = "1y") -> List[HistoryPoint]:
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

    # Try yfinance's built-in search first (fast, no rate limits)
    try:
        search = yf.Search(query, max_results=8)
        quotes = search.quotes
        if quotes:
            results = []
            for q in quotes:
                symbol = q.get('symbol', '')
                name = q.get('longname') or q.get('shortname') or symbol
                if symbol:
                    results.append(SearchResult(symbol=symbol, name=name))
            if results:
                return results[:10]
    except Exception:
        pass

    # Fallback: filter the expanded local list
    results = []
    for t in _FALLBACK_TICKERS:
        if query_upper in t["symbol"] or query_upper in t["name"].upper():
            results.append(SearchResult(**t))

    return results[:10]
