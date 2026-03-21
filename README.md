# StockSage — Full-Stack Stock Market Intelligence Platform

StockSage is a production-grade web application for stock exploration, ML-powered price predictions, and paper trading.

## Features
- **Stock Explorer**: Real-time stats and interactive candlestick charts (yfinance).
- **ML Predictions**: ARIMA + LSTM ensemble models with confidence bands.
- **Paper Trading**: Virtual $100,000 account to practice trading.
- **Portfolio Analytics**: Track performance, allocation, and P&L history.

## Architecture
- **Frontend**: React 18, Vite, TypeScript, TailwindCSS, Zustand, Recharts.
- **API Gateway**: Node.js, Express, TypeScript, SQLite.
- **ML Service**: Python, FastAPI, yfinance, TensorFlow/Keras, statsmodels.

## Quick Start (Docker)
1. Clone the repository.
2. Run `docker-compose up --build`.
3. Open `http://localhost:5173` in your browser.

## Manual Setup

### ML Service
```bash
cd ml-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Server
```bash
cd server
npm install
npm run dev
```

### Client
```bash
cd client
npm install
npm run dev
```

## Disclaimer
This application is for educational purposes only. It does NOT provide real financial advice.
