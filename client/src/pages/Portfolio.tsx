import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { usePortfolioStore } from '../stores/portfolioStore';
import api from '../lib/api';
import { Wallet, TrendingUp, TrendingDown, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#00C896', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];

type SortKey = 'ticker' | 'shares' | 'value' | 'pl';
type SortDir = 'asc' | 'desc';

const Portfolio: React.FC = () => {
  const { token } = useAuthStore();
  const { cashBalance, holdings, fetchPortfolio } = usePortfolioStore();
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [snapHistory, setSnapHistory] = useState<any[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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
    }).catch(() => {
      toast.error('Could not load portfolio history');
    });
  }, [token]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 15000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const totalInvested = holdings.reduce((sum, h) => sum + h.shares * h.avg_cost, 0);
  const totalValue = holdings.reduce((sum, h) => sum + h.shares * (prices[h.ticker] || h.avg_cost), 0);
  const totalPL = totalValue - totalInvested;
  const portfolioValue = cashBalance + totalValue;

  const pieData = holdings.map(h => ({
    name: h.ticker,
    value: h.shares * (prices[h.ticker] || h.avg_cost),
  }));
  if (cashBalance > 0) pieData.push({ name: 'Cash', value: cashBalance });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      const aPrice = prices[a.ticker] || a.avg_cost;
      const bPrice = prices[b.ticker] || b.avg_cost;
      let aVal: any, bVal: any;
      if (sortKey === 'ticker') { aVal = a.ticker; bVal = b.ticker; }
      else if (sortKey === 'shares') { aVal = a.shares; bVal = b.shares; }
      else if (sortKey === 'value') { aVal = a.shares * aPrice; bVal = b.shares * bPrice; }
      else { aVal = (aPrice - a.avg_cost) / a.avg_cost; bVal = (bPrice - b.avg_cost) / b.avg_cost; }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [holdings, prices, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp size={12} className="text-gray-600" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-brand-green" /> : <ChevronDown size={12} className="text-brand-green" />;
  };

  const SortTh = ({ col, label, align = 'right' }: { col: SortKey; label: string; align?: string }) => (
    <th
      className={`py-3 text-${align} cursor-pointer select-none hover:text-white transition-colors`}
      onClick={() => handleSort(col)}
    >
      <span className="inline-flex items-center gap-1 justify-end">
        {label} <SortIcon col={col} />
      </span>
    </th>
  );

  if (!token) return (
    <div className="text-center py-20">
      <Wallet className="mx-auto mb-4 text-gray-600" size={48} />
      <p className="text-gray-400 text-lg">Please sign in to view your portfolio.</p>
    </div>
  );

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Portfolio Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-2xl p-6">
          <div className="text-sm text-gray-400 mb-1">Total Value</div>
          <div className="text-2xl font-bold font-mono">${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="text-sm text-gray-400 mb-1">Cash Balance</div>
          <div className="text-2xl font-bold font-mono text-brand-green">${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="text-sm text-gray-400 mb-1">Invested</div>
          <div className="text-2xl font-bold font-mono">${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="text-sm text-gray-400 mb-1">Unrealized P&L</div>
          <div className={`text-2xl font-bold font-mono flex items-center gap-1 ${totalPL >= 0 ? 'price-up' : 'price-down'}`}>
            {totalPL >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            {totalPL >= 0 ? '+' : ''}${totalPL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Portfolio Value Over Time */}
      {snapHistory.length > 1 && (
        <div className="glass rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Portfolio Value Over Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={snapHistory}>
              <defs>
                <linearGradient id="pgGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00C896" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00C896" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2E33" />
              <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#888', fontSize: 11 }}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                contentStyle={{ background: '#161A1E', border: '1px solid #2A2E33', borderRadius: 12 }}
                formatter={(v: number) => [`$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Value']}
              />
              <Area type="monotone" dataKey="value" stroke="#00C896" strokeWidth={2} fill="url(#pgGradient)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
        {/* Holdings Table */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Holdings</h3>
          {holdings.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">No holdings yet. Start trading on a stock detail page!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-brand-border">
                    <th
                      className="text-left py-3 cursor-pointer select-none hover:text-white transition-colors"
                      onClick={() => handleSort('ticker')}
                    >
                      <span className="inline-flex items-center gap-1">Ticker <SortIcon col="ticker" /></span>
                    </th>
                    <SortTh col="shares" label="Shares" />
                    <th className="text-right py-3 text-gray-400">Avg Cost</th>
                    <th className="text-right py-3 text-gray-400">Current</th>
                    <SortTh col="value" label="Value" />
                    <SortTh col="pl" label="P&L" />
                  </tr>
                </thead>
                <tbody>
                  {sortedHoldings.map(h => {
                    const curPrice = prices[h.ticker] || h.avg_cost;
                    const value = h.shares * curPrice;
                    const pl = value - h.shares * h.avg_cost;
                    const plPct = ((curPrice - h.avg_cost) / h.avg_cost * 100);
                    return (
                      <tr key={h.ticker} className="border-b border-brand-border/50 hover:bg-brand-border/30 transition-colors">
                        <td className="py-4 font-bold text-brand-green">{h.ticker}</td>
                        <td className="py-4 text-right font-mono">{h.shares}</td>
                        <td className="py-4 text-right font-mono">${h.avg_cost.toFixed(2)}</td>
                        <td className="py-4 text-right font-mono">${curPrice.toFixed(2)}</td>
                        <td className="py-4 text-right font-mono">${value.toFixed(2)}</td>
                        <td className={`py-4 text-right font-mono ${pl >= 0 ? 'price-up' : 'price-down'}`}>
                          {pl >= 0 ? '+' : ''}${pl.toFixed(2)} ({plPct.toFixed(1)}%)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Allocation Chart */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Allocation</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#161A1E', border: '1px solid #2A2E33', borderRadius: 12 }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">No data to display</p>
          )}
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-gray-400">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
