import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { usePortfolioStore } from '../stores/portfolioStore';
import api from '../lib/api';
import { TrendingUp, TrendingDown, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#FF7070', '#EC4899', '#14B8A6', '#F97316'];

type SortKey = 'ticker' | 'shares' | 'value' | 'pl';
type SortDir = 'asc' | 'desc';

const fmtUSD = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Portfolio: React.FC = () => {
  const { token } = useAuthStore();
  const { cashBalance, holdings, fetchPortfolio } = usePortfolioStore();
  const [prices, setPrices]           = useState<Record<string, number>>({});
  const [loading, setLoading]         = useState(true);
  const [snapHistory, setSnapHistory] = useState<any[]>([]);
  const [sortKey, setSortKey]         = useState<SortKey>('value');
  const [sortDir, setSortDir]         = useState<SortDir>('desc');

  const fetchPrices = useCallback(async () => {
    if (!holdings.length) return;
    const entries = await Promise.allSettled(
      holdings.map(h => api.get(`/stock/${h.ticker}/quote`).then(r => ({ ticker: h.ticker, price: r.data.price })))
    );
    const p: Record<string, number> = {};
    entries.forEach(r => { if (r.status === 'fulfilled') p[r.value.ticker] = r.value.price; });
    setPrices(p);
  }, [holdings]);

  useEffect(() => {
    if (!token) return;
    fetchPortfolio(token).then(() => setLoading(false));
    api.get('/portfolio/history').then(r => {
      setSnapHistory(r.data.map((s: any) => ({
        value: s.total_value,
        date: format(new Date(s.timestamp), 'MMM d'),
      })));
    }).catch(() => toast.error('Could not load portfolio history'));
  }, [token]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 15000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const totalInvested = holdings.reduce((sum, h) => sum + h.shares * h.avg_cost, 0);
  const totalValue    = holdings.reduce((sum, h) => sum + h.shares * (prices[h.ticker] || h.avg_cost), 0);
  const totalPL       = totalValue - totalInvested;
  const portfolioValue = cashBalance + totalValue;

  const pieData = holdings.map(h => ({
    name: h.ticker,
    value: h.shares * (prices[h.ticker] || h.avg_cost),
  }));
  if (cashBalance > 0) pieData.push({ name: 'CASH', value: cashBalance });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      const aP = prices[a.ticker] || a.avg_cost;
      const bP = prices[b.ticker] || b.avg_cost;
      let av: any, bv: any;
      if (sortKey === 'ticker')  { av = a.ticker; bv = b.ticker; }
      else if (sortKey === 'shares') { av = a.shares; bv = b.shares; }
      else if (sortKey === 'value')  { av = a.shares * aP; bv = b.shares * bP; }
      else { av = (aP - a.avg_cost) / a.avg_cost; bv = (bP - b.avg_cost) / b.avg_cost; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [holdings, prices, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col
      ? <ChevronUp size={11} className="t-muted2" />
      : sortDir === 'asc'
        ? <ChevronUp size={11} className="t-green" />
        : <ChevronDown size={11} className="t-green" />;

  if (!token) return (
    <div className="t-card pf-empty">AUTH_REQUIRED — Please sign in to view your portfolio.</div>
  );

  return (
    <div>
      <div className="t-page-header">
        <span className="t-section-title t-mb-0">PORTFOLIO</span>
        <span className="t-page-meta">
          {loading ? 'LOADING...' : `${holdings.length} POSITION${holdings.length !== 1 ? 'S' : ''}`}
        </span>
      </div>

      {/* Stat cards */}
      <div className="pf-stats">
        {[
          { label: 'TOTAL_VALUE',    value: `$${fmtUSD(portfolioValue)}`,  color: '' },
          { label: 'CASH_BALANCE',   value: `$${fmtUSD(cashBalance)}`,      color: 't-green' },
          { label: 'INVESTED',       value: `$${fmtUSD(totalInvested)}`,    color: '' },
          {
            label: 'UNREALIZED_P&L',
            value: `${totalPL >= 0 ? '+' : ''}$${fmtUSD(Math.abs(totalPL))}`,
            color: totalPL >= 0 ? 't-green' : 't-red',
            icon: totalPL >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />,
          },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="t-card">
            <div className="t-card-label">{label}</div>
            <div className={`t-card-value ${color}`}>
              {icon && <>{icon} </>}{value}
            </div>
          </div>
        ))}
      </div>

      {/* Equity curve */}
      {snapHistory.length > 1 && (
        <div className="t-card-bare">
          <div className="pf-chart-wrap">
            <div className="pf-chart-title">EQUITY_CURVE</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={snapHistory}>
                <defs>
                  <linearGradient id="pfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10B981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2328" />
                <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}K`}
                  width={52}
                />
                <Tooltip
                  contentStyle={{ background: '#0D1117', border: '1px solid #1E2328', fontFamily: 'JetBrains Mono', fontSize: 11 }}
                  formatter={(v: number) => [`$${fmtUSD(v)}`, 'VALUE']}
                />
                <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={1.5} fill="url(#pfGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Holdings + Allocation */}
      <div className="pf-body">
        {/* Holdings table */}
        <div className="t-card-bare">
          <div className="mo-table-header">
            <span className="t-card-label t-mb-0">HOLDINGS</span>
          </div>
          {holdings.length === 0 ? (
            <div className="pf-empty">No positions yet. Buy a stock to get started.</div>
          ) : (
            <table className="t-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('ticker')} className="t-th-sort">
                    TICKER <SortIcon col="ticker" />
                  </th>
                  <th onClick={() => handleSort('shares')} className="t-th-sort">
                    SHARES <SortIcon col="shares" />
                  </th>
                  <th>AVG_COST</th>
                  <th>CURRENT</th>
                  <th onClick={() => handleSort('value')} className="t-th-sort">
                    VALUE <SortIcon col="value" />
                  </th>
                  <th onClick={() => handleSort('pl')} className="t-th-sort">
                    P&L <SortIcon col="pl" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedHoldings.map(h => {
                  const cur  = prices[h.ticker] || h.avg_cost;
                  const val  = h.shares * cur;
                  const pl   = val - h.shares * h.avg_cost;
                  const plPct = ((cur - h.avg_cost) / h.avg_cost * 100);
                  return (
                    <tr key={h.ticker}>
                      <td className="t-green t-fw7">{h.ticker}</td>
                      <td>{h.shares}</td>
                      <td>${h.avg_cost.toFixed(2)}</td>
                      <td>${cur.toFixed(2)}</td>
                      <td>${val.toFixed(2)}</td>
                      <td className={`t-fw7 ${pl >= 0 ? 't-green' : 't-red'}`}>
                        {pl >= 0 ? '+' : ''}${pl.toFixed(2)} ({plPct.toFixed(1)}%)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pie allocation */}
        <div className="t-card-bare">
          <div className="mo-table-header">
            <span className="t-card-label t-mb-0">ALLOCATION</span>
          </div>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0D1117', border: '1px solid #1E2328', fontFamily: 'JetBrains Mono', fontSize: 11 }}
                    formatter={(v: number) => [`$${fmtUSD(v)}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pf-alloc-legend">
                {pieData.map((d, i) => (
                  <div key={d.name} className="pf-legend-item">
                    <div className="pf-legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                    {d.name}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="pf-empty">No allocation data.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
