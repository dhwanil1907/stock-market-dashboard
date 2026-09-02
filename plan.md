# StockSage — Project Status & Roadmap

**App:** Paper trading platform with AI price predictions, backtesting, and real-time market data.
**Stack:** React/TypeScript (Vite) · Node/Express/SQLite · FastAPI/Python · Docker Compose

---

## What's Done

### Infrastructure
- [x] Docker Compose with 3 services: `client` (5173), `server` (3001), `ml-service` (8000)
- [x] SQLite database with persistent volume
- [x] JWT auth middleware (Node)
- [x] CORS configuration
- [x] Finnhub + yfinance data sources with in-memory caching

### Auth
- [x] Register / login with email+password
- [x] Demo account (one-click access)
- [x] JWT token stored in localStorage via Zustand `authStore`

### Pages

| Page | Route | Status |
|------|-------|--------|
| Landing | `/` | Done — ticker tape, features grid, pricing section, CTA |
| Login | `/login` | Done — register/login toggle + demo button |
| Market Overview | `/dashboard` | Done — index cards, quote grid, portfolio summary |
| Stock Detail | `/stock/:ticker` | Done — multi-period chart, ML prediction, options chain, buy/sell |
| Portfolio | `/portfolio` | Done — holdings table, P&L, pie chart, equity curve |
| Watchlist | `/watchlist` | Done — add/remove tickers, live quotes, inline notes |
| Trade History | `/history` | Done — full trade log, stats row, CSV export |
| Alerts | `/alerts` | Done — price alerts, 30s polling, toast on trigger |
| Backtest | `/backtest` | Done — SMA/RSI/MACD strategies, equity curve, trade log |
| Intel | `/intel` | Done — Finnhub news feed, ticker filter, auto-refresh |
| Sector Heatmap | `/sectors` | Done — 11 sectors, daily + monthly returns, heat coloring |

### ML Service
- [x] Ensemble prediction (LSTM + gradient boosting) via `ml-service/app/utils/ensemble.py`
- [x] Prediction caching (async, TTL-based)
- [x] Backtesting engine: SMA crossover, RSI, MACD
- [x] Options chain data via yfinance
- [x] Sector ETF data for heatmap
- [x] Rate limiting on predict endpoint (3 req/min per user)

### UI / UX
- [x] Light / dark theme toggle (Zustand `themeStore`)
- [x] Terminal / monospace aesthetic throughout
- [x] Sidebar with active-state highlighting
- [x] Top bar with global search + user badge
- [x] Toast notifications (Sonner)

---

## Known Gaps / Bugs

- [ ] **No `/settings` route** — `Settings` icon in Sidebar is imported but leads nowhere
- [ ] **Watchlist notes are localStorage-only** — not server-persisted, lost on new device/browser
- [ ] **Alert triggering is frontend-only** — alerts only fire if the user has the app open; no background job on server
- [ ] **No JWT expiry / refresh** — expired tokens cause silent 401s with no logout prompt
- [ ] **No route protection** — unauthenticated users can navigate directly to `/dashboard`, `/portfolio`, etc.
- [ ] **No tests** — zero test files in the entire codebase

---

## What's Next

### High Priority

- [ ] **Settings page** (`/settings`)
  - Change display name / password
  - Reset paper trading cash balance
  - Alert notification preferences

- [ ] **Route protection / auth guard**
  - Redirect unauthenticated users to `/login`
  - Handle expired JWT gracefully (auto-logout + toast)

- [ ] **Server-side alert triggering**
  - Cron job in Node server to check alert conditions against live prices
  - Removes dependency on the user having the frontend open

### Medium Priority

- [ ] **Persist watchlist notes to server**
  - Add `notes` column to `watchlist` table
  - PATCH endpoint to update notes

- [ ] **Order types**
  - Limit orders (execute when price hits target)
  - Stop-loss orders
  - Currently only market orders exist

- [ ] **Portfolio benchmarking**
  - Overlay SPY performance on portfolio equity curve
  - Show alpha vs benchmark

- [ ] **Mobile-responsive layout**
  - Sidebar collapses to bottom nav on small screens
  - Cards stack vertically

### Lower Priority

- [ ] **Stock screener**
  - Filter by sector, market cap, % change, volume
  - Link results to `/stock/:ticker`

- [ ] **More backtest strategies**
  - Bollinger Bands mean reversion
  - Momentum (relative strength)

- [ ] **News sentiment scoring**
  - Attach bullish/bearish label to each Intel news item
  - Aggregate sentiment per ticker on Stock Detail

- [ ] **Push / email notifications for alerts**
  - Triggered alerts sent via email or browser push
  - Requires user email verification flow

### Infrastructure / DevOps

- [ ] **Tests**
  - Unit tests for ML prediction utilities (pytest)
  - API route tests for Node server (Jest/Supertest)
  - Component tests for key UI flows (Vitest + Testing Library)

- [ ] **Production deployment**
  - Swap SQLite → Postgres
  - Secure `JWT_SECRET` via environment secrets (not docker-compose default)
  - HTTPS / reverse proxy config (Nginx or Caddy)
  - CI/CD pipeline (GitHub Actions)
