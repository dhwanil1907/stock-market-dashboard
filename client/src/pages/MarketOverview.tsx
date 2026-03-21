import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { TrendingUp, TrendingDown, ArrowRight, BarChart3, Zap, Shield } from 'lucide-react';

const TRENDING = ['AAPL', 'TSLA', 'MSFT', 'AMZN', 'GOOGL', 'NVDA', 'META', 'JPM'];

const MarketOverview: React.FC = () => {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchQuotes = async () => {
    const results = await Promise.allSettled(
      TRENDING.map(ticker => api.get(`/stock/${ticker}/quote`).then(r => r.data))
    );
    const loaded = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value);
    setQuotes(loaded);
    setLoading(false);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <div className="text-center py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-green/5 to-transparent pointer-events-none" />
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-brand-green to-emerald-400 bg-clip-text text-transparent">
          Market Intelligence
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          AI-powered stock analysis with ARIMA + LSTM ensemble predictions, real-time data, and paper trading.
        </p>

        <div className="flex justify-center gap-8 mt-10">
          <div className="glass rounded-2xl px-8 py-5 text-center">
            <BarChart3 className="mx-auto mb-2 text-brand-green" size={28} />
            <div className="text-sm text-gray-400">ML Predictions</div>
            <div className="font-bold text-lg">ARIMA + LSTM</div>
          </div>
          <div className="glass rounded-2xl px-8 py-5 text-center">
            <Zap className="mx-auto mb-2 text-yellow-400" size={28} />
            <div className="text-sm text-gray-400">Paper Trading</div>
            <div className="font-bold text-lg">$100K Virtual</div>
          </div>
          <div className="glass rounded-2xl px-8 py-5 text-center">
            <Shield className="mx-auto mb-2 text-blue-400" size={28} />
            <div className="text-sm text-gray-400">Data Source</div>
            <div className="font-bold text-lg">yfinance</div>
          </div>
        </div>
      </div>

      {/* Trending Stocks */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Trending Stocks</h2>
          <span className="text-xs text-gray-500">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                <div className="h-6 bg-brand-border rounded w-20 mb-3" />
                <div className="h-8 bg-brand-border rounded w-28 mb-2" />
                <div className="h-4 bg-brand-border rounded w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quotes.map((q) => (
              <Link
                key={q.symbol}
                to={`/stock/${q.symbol}`}
                className="glass rounded-2xl p-6 hover:border-brand-green/50 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-brand-green font-bold text-lg">{q.symbol}</span>
                  <ArrowRight size={16} className="text-gray-600 group-hover:text-brand-green transition-colors" />
                </div>
                <div className="text-2xl font-bold font-mono">${q.price?.toFixed(2)}</div>
                <div className={`mt-2 flex items-center gap-1 text-sm font-medium ${q.change_percent >= 0 ? 'price-up' : 'price-down'}`}>
                  {q.change_percent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{q.change_percent >= 0 ? '+' : ''}{q.change_percent?.toFixed(2)}%</span>
                </div>
                <div className="text-xs text-gray-500 mt-2 truncate">{q.company_name}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="mt-16 text-center text-xs text-gray-600 glass rounded-xl p-4">
        ⚠️ Disclaimer: StockSage is for educational purposes only. Not financial advice. Past performance does not guarantee future results.
      </div>
    </div>
  );
};

export default MarketOverview;
