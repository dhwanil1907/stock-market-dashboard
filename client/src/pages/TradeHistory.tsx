import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const TradeHistory: React.FC = () => {
  const { token } = useAuthStore();
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!token) return;
    api.get('/trade/history')
      .then(res => { setTrades(res.data); setLoading(false); })
      .catch(() => { toast.error('Could not load trade history'); setLoading(false); });
  }, [token]);

  const filtered = filter
    ? trades.filter(t => t.ticker.includes(filter.toUpperCase()))
    : trades;

  const buys = filtered.filter(t => t.action === 'BUY').length;
  const sells = filtered.filter(t => t.action === 'SELL').length;
  const notion = filtered.reduce((s, t) => s + (t.quantity ?? 0) * (t.price ?? 0), 0);

  const exportCsv = () => {
    const header = 'Ticker,Action,Quantity,Price,Type,Status,Date\n';
    const rows = filtered.map(t =>
      `${t.ticker},${t.action},${t.quantity},${t.price},${t.order_type},${t.status},${t.created_at}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'trade_history.csv'; a.click();
  };

  if (!token) return (
    <div className="t-card pf-empty">AUTH_REQUIRED — Please sign in to view trade history.</div>
  );

  return (
    <div>
      <h1 className="t-page-hero-title">HISTORY</h1>

      <div className="th-stats-row">
        <div className="th-stat-card">
          <div className="th-stat-label">TOTAL TRADES</div>
          <div className="th-stat-value">{filtered.length}</div>
        </div>
        <div className="th-stat-card">
          <div className="th-stat-label">BUY ORDERS</div>
          <div className="th-stat-value t-green">{buys}</div>
        </div>
        <div className="th-stat-card">
          <div className="th-stat-label">SELL ORDERS</div>
          <div className="th-stat-value t-red">{sells}</div>
        </div>
        <div className="th-stat-card">
          <div className="th-stat-label">NOTIONAL (FILTERED)</div>
          <div className="th-stat-value t-green">${notion.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
        </div>
      </div>

      <div className="t-card-bare">
        <div className="th-filter-bar">
          <div className="th-filter-bar-left">
            <span className="t-card-label t-mb-0">FILTER</span>
            <input
              type="text"
              className="t-input th-filter-input"
              placeholder="SEARCH_MARKETS..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <div className="t-page-actions">
            <span className="t-page-meta">{filtered.length} RECORD{filtered.length !== 1 ? 'S' : ''}</span>
            <button type="button" className="t-btn t-btn-ghost" onClick={exportCsv}>
              <Download size={10} /> EXPORT
            </button>
          </div>
        </div>

        {loading ? (
          <div className="pf-empty"><Loader2 size={18} className="t-spin t-green" /></div>
        ) : filtered.length === 0 ? (
          <div className="pf-empty t-muted2">NO_RECORDS — {filter ? 'Try a different filter.' : 'No trades yet.'}</div>
        ) : (
          <table className="t-table">
            <thead>
              <tr>
                <th>#</th>
                <th>TICKER</th>
                <th>ACTION</th>
                <th>QTY</th>
                <th>PRICE</th>
                <th>TOTAL</th>
                <th>TYPE</th>
                <th>STATUS</th>
                <th>DATE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t.id || i}>
                  <td className="t-muted2">{i + 1}</td>
                  <td className="t-green t-fw7">{t.ticker}</td>
                  <td>
                    <span className={t.action === 'BUY' ? 't-green t-fw7' : 't-red t-fw7'}>
                      {t.action}
                    </span>
                  </td>
                  <td>{t.quantity}</td>
                  <td>${t.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>${(t.quantity * t.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="t-muted2">{t.order_type}</td>
                  <td>
                    <span className={t.status === 'FILLED' ? 't-green' : 't-yellow'}>
                      {t.status}
                    </span>
                  </td>
                  <td className="t-muted2">{new Date(t.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TradeHistory;
