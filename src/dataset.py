import numpy as np
import pandas as pd
from pathlib import Path

from src.features import add_all_features

HORIZON = 60  # trading days

INPUT_PATH  = Path("data/raw/prices.csv")
OUTPUT_PATH = Path("data/processed/dataset.csv")

FEATURE_COLS = [
    "ret_1d", "ret_5d", "ret_20d",
    "vol_20d", "vol_60d",
    "sma20_gap", "sma60_gap",
    "rsi_14",
    "macd", "macd_signal", "macd_hist",
    "volume_z_20d",
]

FINAL_COLS = [
    "date", "ticker", "open", "high", "low", "close", "adj_close", "volume",
    *FEATURE_COLS,
    "fwd_ret_60d", "y",
]


def load_raw(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, parse_dates=["date"])
    df = df.sort_values("date").drop_duplicates(subset="date").reset_index(drop=True)
    return df


def create_label(df: pd.DataFrame, horizon: int) -> pd.DataFrame:
    fwd_close = df["close"].shift(-horizon)
    df["fwd_ret_60d"] = np.log(fwd_close / df["close"])
    df["y"] = (df["fwd_ret_60d"] > 0).astype(int)
    # drop rows where label is undefined (last `horizon` rows)
    df = df.dropna(subset=["fwd_ret_60d"])
    return df


def main():
    df = load_raw(INPUT_PATH)
    n_raw = len(df)
    print(f"Rows loaded:              {n_raw}")

    df = add_all_features(df)
    df = create_label(df, HORIZON)

    df = df.dropna(subset=FEATURE_COLS)
    n_clean = len(df)
    print(f"Rows after dropping NaNs: {n_clean}")
    print(f"Date range:               {df['date'].min().date()} → {df['date'].max().date()}")
    print(f"Positive labels (y=1):    {df['y'].mean():.1%}")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df[FINAL_COLS].to_csv(OUTPUT_PATH, index=False)
    print(f"Saved → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
