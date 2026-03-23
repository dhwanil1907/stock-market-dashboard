from pathlib import Path

import pandas as pd
import yfinance as yf

TICKER     = "TSLA"
OUTPUT_DIR = Path("data/raw")
OUTPUT_PATH = OUTPUT_DIR / "prices.csv"


def fetch_prices(ticker: str) -> pd.DataFrame:
    raw = yf.Ticker(ticker).history(period="max")
    if raw.empty:
        raise ValueError(f"No data returned for {ticker}")

    df = raw[["Open", "High", "Low", "Close", "Volume"]].copy()
    df.columns = ["open", "high", "low", "close", "volume"]

    # yfinance history() is already split/dividend adjusted
    df["adj_close"] = df["close"]
    df["ticker"]    = ticker

    df.index = pd.to_datetime(df.index).tz_localize(None)
    df = df.reset_index().rename(columns={"Date": "date", "Datetime": "date"})
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")

    df = (
        df.sort_values("date")
          .drop_duplicates(subset="date")
          .reset_index(drop=True)
    )

    return df[["date", "ticker", "open", "high", "low", "close", "adj_close", "volume"]]


def main():
    print(f"Fetching {TICKER} price history from yfinance...")
    df = fetch_prices(TICKER)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"Rows:       {len(df)}")
    print(f"Date range: {df['date'].iloc[0]} → {df['date'].iloc[-1]}")
    print(f"Saved → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
