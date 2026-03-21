import numpy as np
import pandas as pd
from typing import List, Dict, Any

def _compute_signals_sma(df: pd.DataFrame, short: int = 20, long: int = 50) -> pd.Series:
    """SMA crossover: +1 = buy signal, -1 = sell signal, 0 = hold."""
    sma_short = df['Close'].rolling(short).mean()
    sma_long = df['Close'].rolling(long).mean()
    signals = pd.Series(0, index=df.index)
    # Buy when short crosses above long
    signals[sma_short > sma_long] = 1
    signals[sma_short <= sma_long] = -1
    return signals

def _compute_signals_rsi(df: pd.DataFrame, period: int = 14, oversold: int = 30, overbought: int = 70) -> pd.Series:
    """RSI strategy: buy when RSI < oversold, sell when RSI > overbought."""
    delta = df['Close'].diff()
    gain = delta.where(delta > 0, 0).rolling(period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))

    signals = pd.Series(0, index=df.index)
    in_position = False
    for i in range(len(rsi)):
        if pd.isna(rsi.iloc[i]):
            continue
        if not in_position and rsi.iloc[i] < oversold:
            signals.iloc[i] = 1
            in_position = True
        elif in_position and rsi.iloc[i] > overbought:
            signals.iloc[i] = -1
            in_position = False
    return signals

def _compute_signals_macd(df: pd.DataFrame, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.Series:
    """MACD crossover strategy."""
    ema_fast = df['Close'].ewm(span=fast, adjust=False).mean()
    ema_slow = df['Close'].ewm(span=slow, adjust=False).mean()
    macd = ema_fast - ema_slow
    signal_line = macd.ewm(span=signal, adjust=False).mean()

    signals = pd.Series(0, index=df.index)
    signals[macd > signal_line] = 1
    signals[macd <= signal_line] = -1
    return signals


def run_backtest(
    ticker: str,
    history_df: pd.DataFrame,
    strategy: str = "SMA_CROSS",
    initial_capital: float = 100000.0,
) -> Dict[str, Any]:
    df = history_df.copy()
    df = df.dropna(subset=['Close'])

    # Compute signals based on strategy
    if strategy == "SMA_CROSS":
        signals = _compute_signals_sma(df)
    elif strategy == "RSI":
        signals = _compute_signals_rsi(df)
    elif strategy == "MACD":
        signals = _compute_signals_macd(df)
    else:
        raise ValueError(f"Unknown strategy: {strategy}")

    # Simulate trades
    cash = initial_capital
    shares = 0
    portfolio_values = []
    trades = []

    prev_signal = 0
    for i in range(len(df)):
        date = df.index[i]
        price = float(df['Close'].iloc[i])
        sig = int(signals.iloc[i])

        # Execute on signal change
        if sig == 1 and prev_signal != 1 and cash > 0:
            shares_to_buy = int(cash // price)
            if shares_to_buy > 0:
                cost = shares_to_buy * price
                cash -= cost
                shares += shares_to_buy
                trades.append({
                    "date": date.strftime('%Y-%m-%d'),
                    "action": "BUY",
                    "price": round(price, 2),
                    "shares": shares_to_buy,
                    "value": round(cost, 2)
                })
        elif sig == -1 and prev_signal != -1 and shares > 0:
            proceeds = shares * price
            cash += proceeds
            trades.append({
                "date": date.strftime('%Y-%m-%d'),
                "action": "SELL",
                "price": round(price, 2),
                "shares": shares,
                "value": round(proceeds, 2)
            })
            shares = 0

        prev_signal = sig
        portfolio_values.append({
            "date": date.strftime('%Y-%m-%d'),
            "value": round(cash + shares * price, 2)
        })

    # Final portfolio value
    final_value = cash + shares * float(df['Close'].iloc[-1])
    total_return_pct = (final_value - initial_capital) / initial_capital * 100

    # Buy & hold comparison
    first_price = float(df['Close'].iloc[0])
    last_price = float(df['Close'].iloc[-1])
    bh_shares = int(initial_capital // first_price)
    buy_hold_return_pct = ((last_price - first_price) / first_price * 100)

    # Max drawdown
    values = np.array([p["value"] for p in portfolio_values])
    peak = np.maximum.accumulate(values)
    drawdowns = (values - peak) / peak * 100
    max_drawdown_pct = float(np.min(drawdowns))

    # Sharpe ratio (annualized, using daily returns)
    daily_returns = np.diff(values) / values[:-1]
    if daily_returns.std() > 0:
        sharpe = float(np.mean(daily_returns) / daily_returns.std() * np.sqrt(252))
    else:
        sharpe = 0.0

    # Win rate
    buy_trades = [t for t in trades if t["action"] == "BUY"]
    sell_trades = [t for t in trades if t["action"] == "SELL"]
    winning = 0
    for i in range(min(len(buy_trades), len(sell_trades))):
        if sell_trades[i]["price"] > buy_trades[i]["price"]:
            winning += 1
    win_rate = (winning / len(sell_trades) * 100) if sell_trades else 0.0

    return {
        "ticker": ticker,
        "strategy": strategy,
        "initial_capital": initial_capital,
        "final_value": round(final_value, 2),
        "total_return_pct": round(total_return_pct, 2),
        "buy_hold_return_pct": round(buy_hold_return_pct, 2),
        "max_drawdown_pct": round(max_drawdown_pct, 2),
        "sharpe_ratio": round(sharpe, 2),
        "win_rate": round(win_rate, 1),
        "total_trades": len(trades),
        "equity_curve": portfolio_values,
        "trades": trades[-50:],  # last 50 trades to keep response size reasonable
    }
