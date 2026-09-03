# StockSage

A full-stack paper trading platform with live market data, machine-learning price forecasts, and strategy backtesting. Trade a simulated $100,000 portfolio against real prices, forecast where a stock is headed, and test technical strategies against historical data — all behind a terminal-inspired interface.

**Stack:** React 19 + TypeScript (Vite) · Node + Express + SQLite · FastAPI + scikit-learn · Docker Compose

> Educational project. Nothing here is financial advice, and no real money is involved.

---

## Contents

- [Architecture](#architecture)
- [Features](#features)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Data sources](#data-sources)
- [How the forecast works](#how-the-forecast-works)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Research pipeline](#research-pipeline)
- [Known limitations](#known-limitations)

---

## Architecture

Three services talk to each other over an internal Docker network. The browser only ever talks to the Node API, which fans out to the ML service and to upstream market data providers.

```
Browser  ──▶  client        (Vite dev server, port 5173)
                 │
                 ▼
              server        (Express + SQLite, port 3001)
                 │  ├──▶ Yahoo Finance chart API   (quotes, sectors)
                 │  ├──▶ Finnhub                   (news)
                 ▼
              ml-service    (FastAPI, port 8000)
                    ├──▶ Finnhub                   (company profile, search)
                    └──▶ yfinance                  (history, options, model input)
```

**Why the split?** The Node server owns everything stateful — auth, portfolio, orders, alerts — and keeps SQLite as the single source of truth. The Python service owns everything numeric, so pandas and scikit-learn stay out of the request path for ordinary page loads. Forecasting is CPU-bound, so it runs in a thread pool executor and its results are cached.

---

## Features

### Trading

Market orders against live prices, with a $100,000 starting cash balance. Buys and sells are wrapped in a SQLite transaction that updates cash, recalculates weighted-average cost basis, writes the order log, and snapshots portfolio value — so a partial failure can't leave the books inconsistent.

### Portfolio and history

Holdings table with unrealized P&L, allocation pie chart, and an equity curve built from portfolio snapshots. A cron job snapshots every user's total value on weekdays at 4:30 PM. Full trade log with a summary stats row and CSV export.

### Forecasting

Blended ARIMA and neural-network forecasts over a 7–90 day horizon, with confidence bands and a calibrated confidence score. Predictions are cached, and five major tickers are pre-warmed on startup so the first page view isn't slow.

### Backtesting

Three technical strategies over 1, 2, or 5 years of history:

| Strategy | Signal |
|---|---|
| `SMA_CROSS` | Long while the 20-day SMA is above the 50-day |
| `RSI` | Buy below RSI 30, sell above RSI 70 |
| `MACD` | Long while MACD is above its 9-period signal line |

Each run returns an equity curve, a trade log, and performance metrics.

### Market data and research

Index and quote grids, a multi-period price chart, an options chain, an 11-sector heatmap built from SPDR sector ETFs, and a Finnhub news feed filterable by ticker.

### Alerts

Price alerts with `above` / `below` conditions. A server-side cron job checks conditions every five minutes and marks alerts triggered, so firing does not depend on the browser being open. The frontend polls every 30 seconds and raises a toast.

### Pages

| Page | Route |
|---|---|
| Landing | `/` |
| Login / register | `/login` |
| Market overview | `/dashboard` |
| Stock detail | `/stock/:ticker` |
| Sector heatmap | `/sectors` |
| Portfolio | `/portfolio` |
| Watchlist | `/watchlist` |
| Trade history | `/history` |
| Alerts | `/alerts` |
| Backtest lab | `/backtest` |
| Intel (news) | `/intel` |

---

## Quick start

### Docker

```bash
cp .env.example .env      # then set JWT_SECRET
docker compose up --build
```

Open <http://localhost:5173>.

Note that `docker-compose.yml` does not currently forward `FINNHUB_API_KEY` to either service, so news, symbol search, and order execution will fail under Docker until you add it to the `environment` blocks for `server` and `ml-service`.

### Manual setup

Requires Node 20+ and Python 3.11+.

```bash
# ML service
cd ml-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cd ..

# API and frontend
cd server && npm install && cd ..
cd client && npm install && cd ..

# Root, for the combined dev script
npm install
```

Create the two env files described in the next section, then start everything with one command:

```bash
npm run dev
```

This runs all three services concurrently with color-coded, prefixed logs. To run them separately instead:

```bash
cd ml-service && source venv/bin/activate && python3 main.py   # :8000
cd server && npm run dev                                       # :3001
cd client && npm run dev                                       # :5173
```

### Signing in

Click **Try demo — no sign-up** on the login page, or use `demo@stocksage.com` / `demo1234`. The demo account is seeded automatically on first server boot.

---

## Environment variables

`server/.env`:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `JWT_SECRET` | **yes** | — | Signs auth tokens. The server refuses to boot without it. |
| `FINNHUB_API_KEY` | yes | — | Company news, and quote lookups used to price orders. |
| `ML_SERVICE_URL` | no | `http://localhost:8000` | Where to reach the FastAPI service. |
| `PORT` | no | `3001` | API port. |
| `DB_PATH` | no | `server/data/stocksage.db` | SQLite file location. |

`ml-service/.env`:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `FINNHUB_API_KEY` | yes | — | Quotes, company profiles, symbol search. |
| `ALLOWED_ORIGINS` | no | `http://localhost:5173,http://localhost:3001` | Comma-separated CORS allowlist. |

`client/.env`:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `VITE_API_URL` | yes | — | API base URL, e.g. `http://localhost:3001/api`. |

Get a free Finnhub key at [finnhub.io](https://finnhub.io/register). Without it, quotes and the sector heatmap still render from Yahoo Finance, but news, search, and order execution will fail.

---

## Data sources

Two upstream providers, reached three different ways.

**Yahoo Finance chart API** — the Node server calls `query1.finance.yahoo.com/v8/finance/chart/{ticker}` directly. No key required. This is the primary source for displayed prices: batch quotes, the sector heatmap, and the price and 52-week range on the stock detail page.

**Finnhub** — requires an API key. The Node server uses it for company and general news, cached five minutes to conserve the free-tier quota. The ML service uses it for company name, market cap, sector, and symbol search, cached 60 seconds to stay inside the 60 requests/minute limit.

**yfinance** — the Python library, also wrapping Yahoo. Used for anything needing bulk history: chart history, options chains, sector ETF series, and the two-year window fed to the forecasting models. Finnhub's free tier does not include candles, which is why history goes through yfinance instead.

---

## How the forecast works

Two models run over two years of daily closes and their outputs are blended.

**ARIMA** — `pmdarima.auto_arima` selects the order via stepwise search and produces a forecast with confidence intervals.

**Neural network** — a scikit-learn `MLPRegressor` trained on 30-day sliding windows of close, volume, SMA-20, SMA-50, and RSI, all min-max scaled. The module is named `lstm_model.py` for historical reasons, but there is no recurrent layer and no PyTorch dependency in the service; this was a deliberate swap away from TensorFlow to keep the container light and platform-independent.

**Confidence score** — not a softmax output. It is assembled from three signals: whether the two models agree on direction, how wide the prediction band is relative to price, and whether RSI corroborates the predicted direction. The result is clamped to 0.30–0.93, because a forecast this simple should never claim near-certainty.

Predictions are keyed by ticker and horizon in a TTL cache, and the predict endpoint is rate limited to 3 requests per minute per user.

---

## API reference

All app routes are prefixed `/api`. Endpoints marked 🔒 require an `Authorization: Bearer <token>` header.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Create an account. Requires a valid email and a 6+ character password. |
| `POST` | `/auth/login` | Exchange credentials for a 24-hour JWT. Limited to 10 attempts per 15 minutes. |
| `POST` | `/auth/demo` | Issue a token for the shared demo account. |

### Market data

| Method | Path | Description |
|---|---|---|
| `GET` | `/stock/quotes/batch?symbols=AAPL,MSFT` | Batch quotes, up to 25 symbols. |
| `GET` | `/stock/search?q=appl` | Symbol search. |
| `GET` | `/stock/news?ticker=AAPL` | Company news, or general market news when `ticker` is omitted. |
| `GET` | `/stock/sectors` | Sector performance, sorted by daily change. |
| `GET` | `/stock/:ticker/quote` | Full quote with session OHLC and fundamentals. |
| `GET` | `/stock/:ticker/history?period=1y` | Daily OHLCV series. |
| `GET` | `/stock/:ticker/options?expiration=` | Options chain; nearest expiry by default. |
| `GET` 🔒 | `/stock/:ticker/predict?horizon=30` | Blended forecast. Horizon 7–90 days. |
| `GET` 🔒 | `/stock/:ticker/backtest?strategy=SMA_CROSS&period=2y` | Run a strategy backtest. |

### Trading and portfolio

| Method | Path | Description |
|---|---|---|
| `POST` 🔒 | `/trade/order` | Place an order. Body: `{ ticker, action, quantity, orderType }`. Only `MARKET` is implemented. |
| `GET` 🔒 | `/trade/history` | Full order log, newest first. |
| `GET` 🔒 | `/portfolio` | Cash balance and current holdings. |
| `GET` 🔒 | `/portfolio/history` | Portfolio value snapshots for the equity curve. |

### Watchlist and alerts

| Method | Path | Description |
|---|---|---|
| `GET` 🔒 | `/watchlist` | Tracked tickers. |
| `POST` 🔒 | `/watchlist/:ticker` | Add a ticker. |
| `DELETE` 🔒 | `/watchlist/:ticker` | Remove a ticker. |
| `GET` 🔒 | `/alerts` | Active alerts. |
| `POST` 🔒 | `/alerts` | Create an alert. Body: `{ ticker, condition, target_price }`. |
| `DELETE` 🔒 | `/alerts/:id` | Delete an alert. |
| `PUT` 🔒 | `/alerts/:id/dismiss` | Dismiss a triggered alert. |

`GET /api/health` returns `{ status: 'ok' }`.

### ML service (internal, port 8000)

Not exposed to the browser; the Node API proxies to it. Interactive docs at <http://localhost:8000/docs>.

| Method | Path |
|---|---|
| `GET` | `/health` |
| `GET` | `/market/quote/{ticker}` |
| `GET` | `/market/history/{ticker}?period=1y` |
| `GET` | `/market/search?q=` |
| `GET` | `/market/options/{ticker}?expiration=` |
| `GET` | `/market/sectors` |
| `GET` | `/predict/{ticker}?horizon=30` |
| `GET` | `/backtest/{ticker}?strategy=SMA_CROSS&period=2y` |

---

## Project structure

```
.
├── client/                      React + TypeScript frontend
│   └── src/
│       ├── pages/               One component per route
│       ├── components/Layout/   Sidebar, top bar, page shell
│       ├── stores/              Zustand: auth, portfolio, watchlist, theme
│       ├── lib/api.ts           Axios instance, token + 401 interceptors
│       └── styles/terminal.css  Terminal design system
│
├── server/                      Express API
│   └── src/
│       ├── routes/              auth, stock, trade, watchlist, alerts
│       ├── services/trading.ts  Transactional order execution
│       ├── middleware/auth.ts   JWT verification
│       ├── db/                  Schema and connection
│       └── index.ts             App setup, portfolio + alert cron jobs
│
├── ml-service/                  FastAPI service
│   ├── app/
│   │   ├── routes/              market, predict, backtest
│   │   ├── utils/               models, market data, caching
│   │   └── models/schemas.py    Pydantic request/response models
│   ├── seed.py                  Pre-warm the prediction cache
│   └── main.py                  App entrypoint
│
├── src/                         Standalone research pipeline (see below)
├── data/, outputs/              Pipeline inputs and results
└── docker-compose.yml
```

---

## Research pipeline

The `src/` directory holds an earlier, self-contained experiment that predates the web app and runs independently of it. It asks a narrower question: can 60-day directional moves in TSLA be predicted from technical indicators alone?

- **Asset:** TSLA only
- **Features:** returns, volatility, RSI, MACD, SMA gaps, volume z-score — no fundamentals or sentiment
- **Label:** 1 if the 60-day forward log return is positive, else 0
- **Models:** logistic regression baseline and a PyTorch LSTM (sequence length 30, hidden size 64)
- **Validation:** three-fold walk-forward

```bash
python -m src.data       # fetch raw prices     → data/raw/prices.csv
python -m src.dataset    # engineer features   → data/processed/dataset.csv
python -m src.train      # train and evaluate  → outputs/results/
python -m src.backtest   # simulate strategy   → equity curve + metrics
```

Results on the June 2022 – July 2023 test window:

| Model | Accuracy | Precision | Recall | F1 |
|---|---|---|---|---|
| Logistic regression | 0.50 | 0.68 | 0.61 | 0.64 |
| LSTM | 0.63 | 0.72 | 0.84 | 0.77 |

Backtesting long-only on the LSTM signal returned a 43.7% CAGR against 49.7% for buy-and-hold, with a Sharpe of 1.27 and a 28.6% maximum drawdown. In other words, the model beat a coin flip but not the underlying stock.

This pipeline needs `torch` and `matplotlib`, which are not in `ml-service/requirements.txt`; install them separately if you want to run it. It also carries the caveats you would expect: a single asset, no transaction costs or slippage in the backtest, and no hyperparameter tuning.

---

## Known limitations

Honest accounting of what isn't done yet.

**Auth and routing.** There are no route guards, so unauthenticated users can navigate to `/dashboard` or `/portfolio` and see an empty shell while the API calls fail. The sidebar's Settings link points at `/portfolio` because no settings page exists. The Axios interceptor logs out on `401` but not on `403`, which is what an invalid token actually returns.

**Price consistency.** Displayed prices come from Yahoo Finance, but orders are priced through the ML service, and therefore Finnhub. The two can disagree by a few cents, so a fill may not exactly match the quote on screen.

**Persistence.** Watchlist notes live only in `localStorage` and do not sync to the server, so they are lost on another browser or device. The watchlist itself writes to both `localStorage` and the API, and can drift if a request fails silently.

**Not yet built.** Limit and stop-loss orders are in the database schema but the API rejects them with `501`. Triggered alerts are recorded server-side but there is no email or push delivery. There is no mobile layout, and no test suite anywhere in the repo.

**Not production-ready.** SQLite, in-memory rate limiting that resets on restart, a default `JWT_SECRET` in `docker-compose.yml`, no HTTPS or reverse proxy config, and no CI. Yahoo Finance's chart endpoint is also undocumented and unversioned, so it can change without warning.

See [`plan.md`](plan.md) for the working roadmap.

---

## License

ISC
