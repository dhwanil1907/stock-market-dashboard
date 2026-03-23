import numpy as np
import pandas as pd


def add_returns(df: pd.DataFrame) -> pd.DataFrame:
    close = df["close"]
    df["ret_1d"]  = close.pct_change(1)
    df["ret_5d"]  = close.pct_change(5)
    df["ret_20d"] = close.pct_change(20)
    return df


def add_volatility(df: pd.DataFrame) -> pd.DataFrame:
    ret = df["ret_1d"]
    df["vol_20d"] = ret.rolling(20).std()
    df["vol_60d"] = ret.rolling(60).std()
    return df


def add_moving_averages(df: pd.DataFrame) -> pd.DataFrame:
    close = df["close"]
    sma20 = close.rolling(20).mean()
    sma60 = close.rolling(60).mean()
    df["sma20_gap"] = (close - sma20) / sma20
    df["sma60_gap"] = (close - sma60) / sma60
    return df


def add_rsi(df: pd.DataFrame, period: int = 14) -> pd.DataFrame:
    delta = df["close"].diff()
    gain  = delta.clip(lower=0)
    loss  = (-delta).clip(lower=0)

    avg_gain = gain.ewm(com=period - 1, min_periods=period).mean()
    avg_loss = loss.ewm(com=period - 1, min_periods=period).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)
    df["rsi_14"] = 100 - (100 / (1 + rs))
    return df


def add_macd(df: pd.DataFrame, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.DataFrame:
    close = df["close"]
    ema_fast   = close.ewm(span=fast,   adjust=False).mean()
    ema_slow   = close.ewm(span=slow,   adjust=False).mean()
    macd_line  = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()

    df["macd"]        = macd_line
    df["macd_signal"] = signal_line
    df["macd_hist"]   = macd_line - signal_line
    return df


def add_volume_zscore(df: pd.DataFrame, window: int = 20) -> pd.DataFrame:
    vol = df["volume"].astype(float)
    mean = vol.rolling(window).mean()
    std  = vol.rolling(window).std()
    df["volume_z_20d"] = (vol - mean) / std.replace(0, np.nan)
    return df


def add_all_features(df: pd.DataFrame) -> pd.DataFrame:
    df = add_returns(df)
    df = add_volatility(df)
    df = add_moving_averages(df)
    df = add_rsi(df)
    df = add_macd(df)
    df = add_volume_zscore(df)
    return df
