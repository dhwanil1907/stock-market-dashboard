# TSLA ML Trading Pipeline

A end-to-end machine learning pipeline that predicts 60-day directional price moves for TSLA using only technical indicators derived from OHLCV data.

Built as a 10-part structured project covering data ingestion, feature engineering, baseline modeling, LSTM deep learning, walk-forward validation, and backtesting.

---

## Scope

- **Asset:** TSLA only
- **Data source:** yfinance OHLCV prices
- **Features:** technical indicators only (returns, volatility, RSI, MACD, SMA gaps, volume z-score)
- **Label:** binary — 1 if 60-day forward log return > 0, else 0
- **No APIs, fundamentals, or sentiment**

---

## Project Structure

```
.
├── data/
│   ├── raw/
│   │   └── prices.csv          # raw OHLCV data
│   └── processed/
│       └── dataset.csv         # feature-engineered dataset
├── src/
│   ├── data.py                 # fetch raw prices (Part 3)
│   ├── features.py             # technical indicator functions
│   ├── dataset.py              # build processed dataset
│   ├── model.py                # baseline + LSTM model definitions
│   ├── train.py                # training, evaluation, walk-forward
│   └── backtest.py             # strategy simulation
└── outputs/
    ├── models/
    │   ├── baseline.pkl
    │   └── lstm.pt
    └── results/
        ├── metrics_baseline.json
        ├── metrics_lstm.json
        ├── predictions_baseline.csv
        ├── predictions_lstm.csv
        ├── confusion_matrix_baseline.png
        ├── confusion_matrix_lstm.png
        ├── walkforward_metrics.csv
        ├── backtest_results.csv
        ├── performance.json
        └── equity_curve.png
```

---

## Pipeline

| Part | Description |
|------|-------------|
| 3 | Fetch raw TSLA prices via yfinance → `data/raw/prices.csv` |
| 4 | Build feature-engineered dataset → `data/processed/dataset.csv` |
| 5 | Train logistic regression baseline → metrics + predictions |
| 6 | Backtest long-only strategy → equity curve + performance metrics |
| 7–10 | LSTM model + walk-forward validation + final evaluation |

---

## How to Run

```bash
# 1. Fetch raw prices
python -m src.data

# 2. Build processed dataset
python -m src.dataset

# 3. Train baseline + LSTM + walk-forward evaluation
python -m src.train

# 4. Backtest strategy
python -m src.backtest
```

---

## Outputs

| File | Description |
|------|-------------|
| `data/processed/dataset.csv` | 1380 rows, 22 columns, TSLA features + label |
| `outputs/results/metrics_baseline.json` | Logistic regression test metrics |
| `outputs/results/metrics_lstm.json` | LSTM test metrics |
| `outputs/results/predictions_baseline.csv` | Baseline predictions with probabilities |
| `outputs/results/predictions_lstm.csv` | LSTM predictions with probabilities |
| `outputs/results/confusion_matrix_baseline.png` | Baseline confusion matrix |
| `outputs/results/confusion_matrix_lstm.png` | LSTM confusion matrix |
| `outputs/results/walkforward_metrics.csv` | 3-fold walk-forward results (baseline) |
| `outputs/results/backtest_results.csv` | Daily strategy vs benchmark returns |
| `outputs/results/performance.json` | CAGR, Sharpe, max drawdown |
| `outputs/results/equity_curve.png` | Cumulative return chart |
| `outputs/models/baseline.pkl` | Serialized sklearn pipeline |
| `outputs/models/lstm.pt` | PyTorch LSTM state dict |

---

## Results (test period: Jun 2022 – Jul 2023)

| Model | Accuracy | Precision | Recall | F1 |
|-------|----------|-----------|--------|----|
| Logistic Regression | 0.50 | 0.68 | 0.61 | 0.64 |
| LSTM (seq=30, hidden=64) | 0.63 | 0.72 | 0.84 | 0.77 |

Backtest (long-only on LSTM predictions):
- Strategy CAGR: 43.7% vs Buy & Hold: 49.7%
- Sharpe: 1.27 | Max Drawdown: -28.6%

---

## Notes / Limitations

- TSLA only — no multi-asset generalization
- Synthetic OHLCV data used for development (replace with live yfinance data via `src/data.py`)
- No transaction costs or slippage in backtest
- No hyperparameter tuning — models use sensible defaults
- Educational / portfolio project — not financial advice

---

## StockSage Web App

This repo also contains **StockSage**, a full-stack paper trading platform built with React, Node.js, and FastAPI. See below for setup.

### Quick Start (Docker)
```bash
docker compose up --build
# Open http://localhost:5173
```

### Manual Setup
```bash
# ML service
cd ml-service && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt && python main.py

# Backend
cd server && npm install && npm run dev

# Frontend
cd client && npm install && npm run dev
```
