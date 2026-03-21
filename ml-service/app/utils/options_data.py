import yfinance as yf
import pandas as pd
from typing import List, Dict, Any, Optional


def get_options_chain(ticker: str, expiration: Optional[str] = None) -> Dict[str, Any]:
    """
    Returns the options chain for the given ticker.
    If expiration is None, uses the nearest available expiration.
    """
    stock = yf.Ticker(ticker)
    expirations = stock.options

    if not expirations:
        raise ValueError(f"No options data available for {ticker}")

    # Use the provided expiration or default to nearest
    exp = expiration if expiration and expiration in expirations else expirations[0]

    chain = stock.option_chain(exp)

    def _clean_df(df: pd.DataFrame) -> List[Dict]:
        cols = ['strike', 'lastPrice', 'bid', 'ask', 'volume', 'openInterest', 'impliedVolatility', 'inTheMoney']
        available = [c for c in cols if c in df.columns]
        rows = []
        for _, row in df[available].iterrows():
            entry = {}
            for col in available:
                val = row[col]
                if pd.isna(val):
                    val = None
                elif col == 'impliedVolatility' and val is not None:
                    val = round(float(val) * 100, 2)  # convert to %
                elif col in ('strike', 'lastPrice', 'bid', 'ask'):
                    val = round(float(val), 2)
                elif col in ('volume', 'openInterest'):
                    val = int(val) if val is not None else 0
                entry[col] = val
            rows.append(entry)
        return rows

    return {
        "ticker": ticker,
        "expiration": exp,
        "expirations": list(expirations[:12]),  # next 12 expirations
        "calls": _clean_df(chain.calls),
        "puts": _clean_df(chain.puts),
    }
