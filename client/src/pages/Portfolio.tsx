import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { usePortfolioStore } from '../stores/portfolioStore';
import api from '../lib/api';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { format } from 'date-fns';
import { formatPrice } from '../lib/format';
import { formatChange } from '../lib/format';
import { StatCard } from '../components/ui/StatCard';
import { DataTable } from '../components/ui/DataTable';
import { chartTooltipUsd, useChartTheme } from '../lib/chartTheme';

type SortKey = 'ticker' | 'shares' | 'value' | 'pl';
type SortDir = 'asc' | 'desc';

const Portfolio: React.FC = () => {
  const { token } = useAuthStore();
  const { cashBalance, holdings, fetchPortfolio } = usePortfolioStore();
  const chart = useChartTheme();
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [snapHistory, setSnapHistory] = useState<{ value: number; date: string }[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fetchPrices = useCallback(async () => {
    if (!holdings.length) return;
    const entries = await Promise.allSettled(
      holdings.map(h => api.get(`/stock/${h.ticker}/quote`).then(r => ({ ticker: h.ticker, price: r.data.price }))),
    );
    const p: Record<string, number> = {};
    entries.forEach(r => { if (r.status === 'fulfilled') p[r.value.ticker] = r.value.price; });
    setPrices(p);
  }, [holdings]);

  useEffect(() => {
    if (!token) return;
    fetchPortfolio(token).then(() => setLoading(false));
    api.get('/portfolio/history').then(r => {
      setSnapHistory(r.data.map((s: { total_value: number; timestamp: string }) => ({
        value: s.total_value,
        date: format(new Date(s.timestamp), 'MMM d'),
      })));
    }).catch(() => toast.error('Could not load portfolio history'));
  }, [token, fetchPortfolio]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 15000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const totalInvested = holdings.reduce((sum, h) => sum + h.shares * h.avg_cost, 0);
  const totalValue = holdings.reduce((sum, h) => sum + h.shares * (prices[h.ticker] || h.avg_cost), 0);
  const totalPL = totalValue - totalInvested;
  const plPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
  const portfolioValue = cashBalance + totalValue;

  const pieData = holdings.map(h => ({
    name: h.ticker,
    value: h.shares * (prices[h.ticker] || h.avg_cost),
  }));
  if (cashBalance > 0) pieData.push({ name: 'Cash', value: cashBalance });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      const aP = prices[a.ticker] || a.avg_cost;
      const bP = prices[b.ticker] || b.avg_cost;
      let av: string | number;
      let bv: string | number;
      if (sortKey === 'ticker') { av = a.ticker; bv = b.ticker; }
      else if (sortKey === 'shares') { av = a.shares; bv = b.shares; }
      else if (sortKey === 'value') { av = a.shares * aP; bv = b.shares * bP; }
      else { av = (aP - a.avg_cost) / a.avg_cost; bv = (bP - b.avg_cost) / b.avg_cost; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [holdings, prices, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col
      ? <ChevronUp size={11} className="t-muted2" aria-hidden />
      : sortDir === 'asc'
        ? <ChevronUp size={11} className="t-green" aria-hidden />
        : <ChevronDown size={11} className="t-green" aria-hidden />;

  if (!token) {
    return (
      <div className="t-card pf-empty">Sign in to view your portfolio.</div>
    );
  }

  return (
    <div className="pf-page">
      <p className="pf-page-meta">
        {loading ? 'Loading…' : `${holdings.length} position${holdings.length !== 1 ? 's' : ''}`}
      </p>

      <div className="pf-stats">
        <StatCard label="Total value" value={formatPrice(portfolioValue)} />
        <StatCard label="Cash balance" value={formatPrice(cashBalance)} />
        <StatCard label="Invested" value={formatPrice(totalInvested)} />
        <StatCard
          label="Unrealized P&L"
          value={formatPrice(Math.abs(totalPL))}
          change={plPct}
          sub={totalPL >= 0 ? 'Gain on open positions' : 'Loss on open positions'}
        />
      </div>

      {snapHistory.length > 1 && (
        <DataTable bare className="pf-chart-card">
          <div className="pf-chart-wrap">
            <h2 className="ui-section-label">Equity curve</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={snapHistory}>
                <defs>
                  <linearGradient id="pfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chart.gain} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={chart.gain} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: chart.tickFill, fontSize: 11, fontFamily: chart.fontMono }}
                  axisLine={{ stroke: chart.grid }}
                  tickLine={false}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fill: chart.tickFill, fontSize: 11, fontFamily: chart.fontMono }}
                  tickFormatter={v => `$${(Number(v) / 1000).toFixed(0)}k`}
                  width={52}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: chart.tooltipBg,
                    border: `1px solid ${chart.tooltipBorder}`,
                    fontFamily: chart.fontMono,
                    fontSize: 12,
                    borderRadius: 8,
                  }}
                  formatter={chartTooltipUsd}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={chart.gain}
                  strokeWidth={2}
                  fill="url(#pfGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DataTable>
      )}

      <div className="pf-body">
        <DataTable bare className="pf-holdings-card">
          <div className="mo-table-header">
            <h2 className="ui-section-label t-mb-0">Holdings</h2>
          </div>
          {holdings.length === 0 ? (
            <div className="pf-empty">No positions yet. Buy a stock to get started.</div>
          ) : (
            <table className="t-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('ticker')} className="t-th-sort">
                    Ticker <SortIcon col="ticker" />
                  </th>
                  <th onClick={() => handleSort('shares')} className="t-th-sort">
                    Shares <SortIcon col="shares" />
                  </th>
                  <th>Avg cost</th>
                  <th>Current</th>
                  <th onClick={() => handleSort('value')} className="t-th-sort">
                    Value <SortIcon col="value" />
                  </th>
                  <th onClick={() => handleSort('pl')} className="t-th-sort">
                    P&L <SortIcon col="pl" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedHoldings.map(h => {
                  const cur = prices[h.ticker] || h.avg_cost;
                  const val = h.shares * cur;
                  const pl = val - h.shares * h.avg_cost;
                  const plPctRow = ((cur - h.avg_cost) / h.avg_cost) * 100;
                  return (
                    <tr key={h.ticker}>
                      <td className="t-fw7 mo-sym-link">{h.ticker}</td>
                      <td className="t-num">{h.shares}</td>
                      <td className="t-num">{formatPrice(h.avg_cost)}</td>
                      <td className="t-num">{formatPrice(cur)}</td>
                      <td className="t-num">{formatPrice(val)}</td>
                      <td className={`t-num t-fw7 ${pl >= 0 ? 't-green' : 't-red'}`}>
                        {pl >= 0 ? '+' : '−'}{formatPrice(Math.abs(pl))}
                        <span className="pf-pl-pct"> {formatChange(plPctRow, { decimals: 1 })}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </DataTable>

        <DataTable bare className="pf-alloc-card">
          <div className="mo-table-header">
            <h2 className="ui-section-label t-mb-0">Allocation</h2>
          </div>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={chart.pieColors[i % chart.pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: chart.tooltipBg,
                      border: `1px solid ${chart.tooltipBorder}`,
                      fontFamily: chart.fontMono,
                      fontSize: 12,
                      borderRadius: 8,
                    }}
                    formatter={chartTooltipUsd}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pf-alloc-legend">
                {pieData.map((d, i) => (
                  <div key={d.name} className="pf-legend-item">
                    <div
                      className="pf-legend-dot"
                      style={{ background: chart.pieColors[i % chart.pieColors.length] }}
                    />
                    {d.name}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="pf-empty">No allocation data.</div>
          )}
        </DataTable>
      </div>
    </div>
  );
};

export default Portfolio;
