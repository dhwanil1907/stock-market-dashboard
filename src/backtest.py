import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

DATASET_PATH     = Path("data/processed/dataset.csv")
PREDICTIONS_PATH = Path("outputs/results/predictions.csv")
OUTPUT_DIR       = Path("outputs/results")


def load_data() -> pd.DataFrame:
    ds   = pd.read_csv(DATASET_PATH, parse_dates=["date"])[["date", "close"]]
    pred = pd.read_csv(PREDICTIONS_PATH, parse_dates=["date"])
    df   = pred.merge(ds, on="date", how="left")
    df   = df.sort_values("date").dropna().reset_index(drop=True)
    return df


def compute_strategy(df: pd.DataFrame) -> pd.DataFrame:
    df["daily_return"] = df["close"].pct_change()

    # shift y_pred by 1 so prediction at t acts on return at t+1 (no lookahead)
    df["position"]          = df["y_pred"].shift(1)
    df["strategy_return"]   = df["daily_return"] * df["position"]
    df["benchmark_return"]  = df["daily_return"]

    # fill first row (NaN from shift/pct_change) with 0
    df[["daily_return", "strategy_return", "benchmark_return"]] = (
        df[["daily_return", "strategy_return", "benchmark_return"]].fillna(0)
    )

    df["cumulative_return"]   = (1 + df["strategy_return"]).cumprod()
    df["benchmark_cumulative"] = (1 + df["benchmark_return"]).cumprod()
    return df


def cagr(cum_returns: pd.Series, n_days: int) -> float:
    final = cum_returns.iloc[-1]
    years = n_days / 252
    return float(final ** (1 / years) - 1)


def sharpe(daily_returns: pd.Series) -> float:
    mean = daily_returns.mean()
    std  = daily_returns.std()
    return float((mean / std) * np.sqrt(252)) if std > 0 else 0.0


def max_drawdown(cum_returns: pd.Series) -> float:
    roll_max = cum_returns.cummax()
    drawdown = (cum_returns - roll_max) / roll_max
    return float(drawdown.min())


def save_results(df: pd.DataFrame):
    out = df[["date", "close", "daily_return", "strategy_return",
              "cumulative_return", "benchmark_return"]].copy()
    out.to_csv(OUTPUT_DIR / "backtest_results.csv", index=False)


def save_performance(df: pd.DataFrame):
    n = len(df)
    perf = {
        "strategy_cagr":          round(cagr(df["cumulative_return"],    n), 4),
        "strategy_sharpe":        round(sharpe(df["strategy_return"]),       4),
        "strategy_max_drawdown":  round(max_drawdown(df["cumulative_return"]), 4),
        "benchmark_cagr":         round(cagr(df["benchmark_cumulative"],  n), 4),
        "benchmark_max_drawdown": round(max_drawdown(df["benchmark_cumulative"]), 4),
    }
    with open(OUTPUT_DIR / "performance.json", "w") as f:
        json.dump(perf, f, indent=2)
    return perf


def save_equity_curve(df: pd.DataFrame):
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(df["date"], df["cumulative_return"],    label="Strategy",  color="#00c896", linewidth=1.5)
    ax.plot(df["date"], df["benchmark_cumulative"], label="Buy & Hold", color="#888888", linewidth=1.5, linestyle="--")
    ax.set_title("Equity Curve — Strategy vs Buy & Hold (TSLA)")
    ax.set_xlabel("Date")
    ax.set_ylabel("Cumulative Return")
    ax.legend()
    ax.grid(alpha=0.3)
    plt.tight_layout()
    fig.savefig(OUTPUT_DIR / "equity_curve.png", dpi=120)
    plt.close(fig)


def main():
    df = load_data()
    df = compute_strategy(df)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    save_results(df)
    perf = save_performance(df)
    save_equity_curve(df)

    final_strat = df["cumulative_return"].iloc[-1]
    final_bench = df["benchmark_cumulative"].iloc[-1]

    print(f"Period:            {df['date'].min().date()} → {df['date'].max().date()}")
    print(f"Strategy CAGR:     {perf['strategy_cagr']:.2%}")
    print(f"Strategy Sharpe:   {perf['strategy_sharpe']:.4f}")
    print(f"Strategy Max DD:   {perf['strategy_max_drawdown']:.2%}")
    print(f"Benchmark CAGR:    {perf['benchmark_cagr']:.2%}")
    print(f"Benchmark Max DD:  {perf['benchmark_max_drawdown']:.2%}")
    print(f"Final Return:      Strategy {final_strat:.2f}x  vs  Buy & Hold {final_bench:.2f}x")
    print(f"Outputs saved → {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
