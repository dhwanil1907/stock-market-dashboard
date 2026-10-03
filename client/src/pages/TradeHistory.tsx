import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice, formatCash } from '../lib/format';
import { DataTable } from '../components/ui/DataTable';

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
    <div className="t-card pf-empty">Sign in to view trade history.</div>
  );

  return (
    <div>
      <p className="wl-page-meta">{filtered.length} {filtered.length === 1 ? 'record' : 'records'} in view</p>

      <div className="th-stats-row">
        <div className="th-stat-card">
          <div className="th-stat-label">Total trades</div>
          <div className="th-stat-value">{filtered.length}</div>
        </div>
        <div className="th-stat-card">
          <div className="th-stat-label">Buy orders</div>
          <div className="th-stat-value t-green">{buys}</div>
        </div>
        <div className="th-stat-card">
          <div className="th-stat-label">Sell orders</div>
          <div className="th-stat-value t-red">{sells}</div>
        </div>
        <div className="th-stat-card">
          <div className="th-stat-label">Notional (filtered)</div>
          <div className="th-stat-value">{formatCash(notion)}</div>
        </div>
      </div>

      <div className="t-card-bare">
        <div className="th-filter-bar">
          <div className="th-filter-bar-left">
            <span className="t-card-label t-mb-0">Filter</span>
            <input
              type="text"
              className="t-input th-filter-input"
              placeholder="Ticker…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <div className="t-page-actions">
            <button type="button" className="t-btn t-btn-ghost" onClick={exportCsv}>
              <Download size={10} /> Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="pf-empty"><Loader2 size={18} className="t-spin t-green" /></div>
        ) : filtered.length === 0 ? (
          <div className="pf-empty t-muted2">{filter ? 'No trades match this filter.' : 'No trades yet.'}</div>
        ) : (
          <DataTable bare>
            <table className="t-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ticker</th>
                  <th>Action</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={t.id || i}>
                    <td className="t-muted2">{i + 1}</td>
                    <td><Link to={`/stock/${t.ticker}`} className="mo-sym-link">{t.ticker}</Link></td>
                    <td>
                      <span className={t.action === 'BUY' ? 't-green t-fw7' : 't-red t-fw7'}>
                        {t.action === 'BUY' ? 'Buy' : 'Sell'}
                      </span>
                    </td>
                    <td className="t-num">{t.quantity}</td>
                    <td className="t-num">{formatPrice(t.price)}</td>
                    <td className="t-num">{formatPrice(t.quantity * t.price)}</td>
                    <td className="t-muted2">{t.order_type}</td>
                    <td>
                      <span className={t.status === 'FILLED' ? 't-green' : 't-yellow'}>
                        {t.status === 'FILLED' ? 'Filled' : t.status}
                      </span>
                    </td>
                    <td className="t-muted2">{new Date(t.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        )}
      </div>
    </div>
  );
};

export default TradeHistory;
