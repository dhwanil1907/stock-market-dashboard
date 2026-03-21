import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import { toast } from 'sonner';
import { FlaskConical, Loader2, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

interface BacktestResult {
  ticker: string;
  strategy: string;
  initial_capital: number;
  final_value: number;
  total_return_pct: number;
  buy_hold_return_pct: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  win_rate: number;
  total_trades: number;
  equity_curve: { date: string; value: number }[];
  trades: { date: string; action: string; price: number; shares: number; value: number }[];
}

const STRATEGIES = [
  { id: 'SMA_CROSS', label: 'SMA Crossover', desc: 'Buy when 20-day MA crosses above 50-day MA, sell on reversal' },
  { id: 'RSI', label: 'RSI Strategy', desc: 'Buy when RSI < 30 (oversold), sell when RSI > 70 (overbought)' },
  { id: 'MACD', label: 'MACD Strategy', desc: 'Buy/sell on MACD line crossing the signal line' },
];

const PERIODS = [
  { id: '1y', label: '1 Year' },
  { id: '2y', label: '2 Years' },
  { id: '5y', label: '5 Years' },
];

const Backtest: React.FC = () => {
  const { token } = useAuthStore();
  const [ticker, setTicker] = useState('AAPL');
  const [strategy, setStrategy] = useState('SMA_CROSS');
  const [period, setPeriod] = useState('2y');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.get(`/stock/${t}/backtest`, { params: { strategy, period } });
      setResult(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Backtest failed');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return (
    <div className="text-center py-20">
      <FlaskConical className="mx-auto mb-4 text-gray-600" size={48} />
      <p className="text-gray-400">Please sign in to use backtesting.</p>
    </div>
  );

  const selectedStrategy = STRATEGIES.find(s => s.id === strategy);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Strategy Backtester</h1>
        <p className="text-gray-400 text-sm">Test trading strategies against historical data</p>
      </div>

      {/* Config Form */}
      <form onSubmit={run} className="glass rounded-2xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Ticker</label>
            <input
              type="text"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              className="py-2 px-4 rounded-xl text-sm w-full uppercase"
              placeholder="AAPL"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Period</label>
            <div className="flex gap-2">
              {PERIODS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${period === p.id ? 'bg-brand-green text-black' : 'glass hover:bg-brand-border'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Strategy selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {STRATEGIES.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStrategy(s.id)}
              className={`p-4 rounded-xl text-left transition-all border ${strategy === s.id ? 'border-brand-green bg-brand-green/10' : 'border-brand-border hover:border-brand-green/30'}`}
            >
              <div className="font-semibold text-sm mb-1">{s.label}</div>
              <div className="text-xs text-gray-400">{s.desc}</div>
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="primary px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />}
          {loading ? 'Running backtest...' : 'Run Backtest'}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold">{result.ticker}</h2>
            <span className="text-sm text-gray-400 glass px-3 py-1 rounded-full">{selectedStrategy?.label}</span>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="glass rounded-2xl p-5">
              <div className="text-xs text-gray-400 mb-1">Total Return</div>
              <div className={`text-2xl font-bold font-mono ${result.total_return_pct >= 0 ? 'price-up' : 'price-down'}`}>
                {result.total_return_pct >= 0 ? '+' : ''}{result.total_return_pct.toFixed(1)}%
              </div>
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="text-xs text-gray-400 mb-1">vs Buy & Hold</div>
              <div className={`text-2xl font-bold font-mono ${result.buy_hold_return_pct >= 0 ? 'price-up' : 'price-down'}`}>
                {result.buy_hold_return_pct >= 0 ? '+' : ''}{result.buy_hold_return_pct.toFixed(1)}%
              </div>
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="text-xs text-gray-400 mb-1">Sharpe Ratio</div>
              <div className={`text-2xl font-bold font-mono ${result.sharpe_ratio >= 1 ? 'price-up' : result.sharpe_ratio >= 0 ? 'text-yellow-400' : 'price-down'}`}>
                {result.sharpe_ratio.toFixed(2)}
              </div>
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="text-xs text-gray-400 mb-1">Max Drawdown</div>
              <div className="text-2xl font-bold font-mono price-down">
                {result.max_drawdown_pct.toFixed(1)}%
              </div>
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="text-xs text-gray-400 mb-1">Win Rate</div>
              <div className={`text-2xl font-bold font-mono ${result.win_rate >= 50 ? 'price-up' : 'price-down'}`}>
                {result.win_rate.toFixed(1)}%
              </div>
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="text-xs text-gray-400 mb-1">Total Trades</div>
              <div className="text-2xl font-bold font-mono">{result.total_trades}</div>
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="text-xs text-gray-400 mb-1">Final Value</div>
              <div className="text-2xl font-bold font-mono">${result.final_value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="text-xs text-gray-400 mb-1">Starting Capital</div>
              <div className="text-2xl font-bold font-mono text-gray-400">${result.initial_capital.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
            </div>
          </div>

          {/* Equity Curve */}
          <div className="glass rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Equity Curve</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={result.equity_curve}>
                <defs>
                  <linearGradient id="btGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C896" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00C896" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2E33" />
                <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} tickFormatter={d => d.slice(0, 7)} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ background: '#161A1E', border: '1px solid #2A2E33', borderRadius: 12 }}
                  formatter={(v: number) => [`$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Portfolio']}
                />
                <ReferenceLine y={result.initial_capital} stroke="#888" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="value" stroke="#00C896" strokeWidth={2} fill="url(#btGradient)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Trades */}
          {result.trades.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 size={18} /> Recent Trades (last {result.trades.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-brand-border text-left">
                      <th className="py-3 pr-6">Date</th>
                      <th className="py-3 pr-6">Action</th>
                      <th className="py-3 pr-6 text-right">Shares</th>
                      <th className="py-3 pr-6 text-right">Price</th>
                      <th className="py-3 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((t, i) => (
                      <tr key={i} className="border-b border-brand-border/30 hover:bg-brand-border/20 transition-colors">
                        <td className="py-3 pr-6 text-gray-400 text-xs">{t.date}</td>
                        <td className="py-3 pr-6">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${t.action === 'BUY' ? 'bg-brand-green/10 text-brand-green' : 'bg-brand-red/10 text-brand-red'}`}>
                            {t.action}
                          </span>
                        </td>
                        <td className="py-3 pr-6 text-right font-mono">{t.shares}</td>
                        <td className="py-3 pr-6 text-right font-mono">${t.price.toFixed(2)}</td>
                        <td className="py-3 text-right font-mono">${t.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Backtest;
