import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import { toast } from 'sonner';
import { Loader2, FlaskConical } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
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
  { id: 'SMA_CROSS', label: 'SMA_CROSSOVER', desc: '20-day MA crosses above 50-day MA' },
  { id: 'RSI',       label: 'RSI_STRATEGY',  desc: 'Buy RSI<30, sell RSI>70' },
  { id: 'MACD',      label: 'MACD_STRATEGY', desc: 'MACD line vs signal line crossover' },
];

const PERIODS = [
  { id: '1y', label: '1Y' },
  { id: '2y', label: '2Y' },
  { id: '5y', label: '5Y' },
];

const fmtK = (v: number) => `$${(v / 1000).toFixed(0)}K`;

const Backtest: React.FC = () => {
  const { token } = useAuthStore();
  const [ticker, setTicker]     = useState('AAPL');
  const [strategy, setStrategy] = useState('SMA_CROSS');
  const [period, setPeriod]     = useState('2y');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<BacktestResult | null>(null);

  if (!token) return (
    <div className="t-card pf-empty">AUTH_REQUIRED — Please sign in to use backtesting.</div>
  );

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

  const stats = result ? [
    { label: 'TOTAL_RETURN',    value: `${result.total_return_pct >= 0 ? '+' : ''}${result.total_return_pct.toFixed(1)}%`,  color: result.total_return_pct >= 0 ? 't-green' : 't-red' },
    { label: 'BUY_HOLD_RETURN', value: `${result.buy_hold_return_pct >= 0 ? '+' : ''}${result.buy_hold_return_pct.toFixed(1)}%`, color: result.buy_hold_return_pct >= 0 ? 't-green' : 't-red' },
    { label: 'SHARPE_RATIO',    value: result.sharpe_ratio.toFixed(2), color: result.sharpe_ratio >= 1 ? 't-green' : result.sharpe_ratio >= 0 ? 't-yellow' : 't-red' },
    { label: 'MAX_DRAWDOWN',    value: `${result.max_drawdown_pct.toFixed(1)}%`, color: 't-red' },
    { label: 'WIN_RATE',        value: `${result.win_rate.toFixed(1)}%`, color: result.win_rate >= 50 ? 't-green' : 't-red' },
    { label: 'TOTAL_TRADES',    value: String(result.total_trades), color: '' },
    { label: 'FINAL_VALUE',     value: `$${result.final_value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: '' },
    { label: 'INITIAL_CAPITAL', value: `$${result.initial_capital.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: 't-muted2' },
  ] : [];

  return (
    <div>
      <div className="t-page-header">
        <span className="t-section-title t-mb-0">STRATEGY_BACKTESTER</span>
        <span className="t-page-meta">HISTORICAL_SIMULATION</span>
      </div>

      <div className="bt-body">
        {/* Config form */}
        <form className="bt-form" onSubmit={run}>
          <div className="t-card-label al-form-title">PARAMETERS</div>

          <div className="al-form-row">
            <label className="t-label">TICKER</label>
            <input
              type="text"
              className="t-input"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              placeholder="AAPL"
              required
            />
          </div>

          <div className="al-form-row">
            <label className="t-label">PERIOD</label>
            <div className="bt-period-group">
              {PERIODS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`bt-period-btn ${period === p.id ? 't-btn t-btn-accent' : 't-btn t-btn-ghost'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="al-form-row">
            <label className="t-label">STRATEGY</label>
            {STRATEGIES.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStrategy(s.id)}
                className={`bt-strategy-btn ${strategy === s.id ? 't-btn t-btn-outline' : 't-btn t-btn-ghost'}`}
              >
                <span>{s.label}</span>
              </button>
            ))}
            {STRATEGIES.find(s => s.id === strategy) && (
              <div className="t-muted2 bt-strategy-desc">
                {STRATEGIES.find(s => s.id === strategy)!.desc}
              </div>
            )}
          </div>

          <button type="submit" className="t-btn t-btn-accent al-submit" disabled={loading}>
            {loading
              ? <><Loader2 size={11} className="t-spin" /> RUNNING...</>
              : <><FlaskConical size={11} /> RUN_BACKTEST</>
            }
          </button>
        </form>

        {/* Results */}
        <div className="bt-results">
          {loading ? (
            <div className="pf-empty"><Loader2 size={20} className="t-spin t-green" /></div>
          ) : !result ? (
            <div className="pf-empty t-muted2">Configure parameters and run a backtest.</div>
          ) : (
            <>
              {/* Stats grid */}
              <div className="bt-stat-grid">
                {stats.map(({ label, value, color }) => (
                  <div key={label} className="t-card">
                    <div className="t-card-label">{label}</div>
                    <div className={`t-card-value ${color}`}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Equity curve */}
              {result.equity_curve.length > 0 && (
                <div className="pf-chart-wrap">
                  <div className="pf-chart-title">EQUITY_CURVE — {result.ticker} · {STRATEGIES.find(s => s.id === result.strategy)?.label ?? result.strategy}</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={result.equity_curve}>
                      <defs>
                        <linearGradient id="btGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#10B981" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E2328" />
                      <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickFormatter={d => d.slice(0, 7)} interval="preserveStartEnd" />
                      <YAxis tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickFormatter={fmtK} domain={['auto', 'auto']} width={50} />
                      <Tooltip
                        contentStyle={{ background: '#0D1117', border: '1px solid #1E2328', fontFamily: 'JetBrains Mono', fontSize: 11 }}
                        formatter={(v: number) => [`$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'VALUE']}
                      />
                      <ReferenceLine y={result.initial_capital} stroke="#2A2E33" strokeDasharray="4 4" />
                      <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={1.5} fill="url(#btGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Trade log */}
              {result.trades.length > 0 && (
                <>
                  <div className="th-filter-bar">
                    <span className="t-card-label t-mb-0">TRADE_LOG ({result.trades.length})</span>
                  </div>
                  <table className="t-table">
                    <thead>
                      <tr>
                        <th>DATE</th>
                        <th>ACTION</th>
                        <th>SHARES</th>
                        <th>PRICE</th>
                        <th>VALUE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.trades.map((t, i) => (
                        <tr key={i}>
                          <td className="t-muted2">{t.date}</td>
                          <td className={t.action === 'BUY' ? 't-green t-fw7' : 't-red t-fw7'}>{t.action}</td>
                          <td>{t.shares}</td>
                          <td>${t.price.toFixed(2)}</td>
                          <td>${t.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Backtest;
