import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWatchlistStore } from '../stores/watchlistStore';
import { toast } from 'sonner';
import api from '../lib/api';
import { TrendingUp, TrendingDown, Trash2, Loader2, Plus } from 'lucide-react';

const Watchlist: React.FC = () => {
  const { tickers, addTicker, removeTicker, init } = useWatchlistStore();
  const [quotes, setQuotes]   = useState<Record<string, any>>({});
  const [newTicker, setNewTicker] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init().then(() => setLoading(false));
  }, []);

  const fetchAll = useCallback(async () => {
    if (!tickers.length) return;
    const results = await Promise.allSettled(
      tickers.map(t => api.get(`/stock/${t}/quote`).then(r => ({ ticker: t, data: r.data })))
    );
    const q: Record<string, any> = {};
    results.forEach(r => { if (r.status === 'fulfilled') q[r.value.ticker] = r.value.data; });
    setQuotes(q);
  }, [tickers]);

  useEffect(() => {
    if (loading) return;
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, [fetchAll, loading]);

  const handleAdd = async () => {
    const t = newTicker.trim().toUpperCase();
    if (!t) return;
    setNewTicker('');
    await addTicker(t);
  };

  const handleRemove = (ticker: string) => {
    removeTicker(ticker);
    toast(`Removed ${ticker}`, {
      action: { label: 'Undo', onClick: () => addTicker(ticker) },
      duration: 5000,
    });
  };

  return (
    <div>
      <div className="t-page-header">
        <span className="t-section-title t-mb-0">WATCHLIST</span>
        <div className="wl-add-row">
          <input
            type="text"
            className="wl-add-input"
            placeholder="Add ticker…"
            value={newTicker}
            onChange={e => setNewTicker(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button type="button" className="t-btn t-btn-accent" onClick={handleAdd}>
            <Plus size={12} /> ADD
          </button>
        </div>
      </div>

      {loading ? (
        <div className="t-card pf-empty">
          <Loader2 size={20} className="t-spin t-green" />
        </div>
      ) : tickers.length === 0 ? (
        <div className="t-card wl-empty">
          <div className="wl-empty-icon">◈</div>
          <div className="t-muted2">WATCHLIST_EMPTY</div>
          <div className="t-muted2 wl-empty-sub">
            Type a ticker above and press Enter.
          </div>
        </div>
      ) : (
        <div className="t-card-bare">
          <table className="t-table">
            <thead>
              <tr>
                <th>SYMBOL</th>
                <th>COMPANY</th>
                <th>PRICE</th>
                <th>CHG%</th>
                <th>52W_HI</th>
                <th>52W_LO</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {tickers.map(t => {
                const q = quotes[t];
                const up = (q?.change_percent ?? 0) >= 0;
                return (
                  <tr key={t}>
                    <td>
                      <Link to={`/stock/${t}`} className="mo-sym-link">{t}</Link>
                    </td>
                    <td className="t-muted2 wl-company-cell">
                      {q?.company_name ?? '—'}
                    </td>
                    <td>{q?.price != null ? `$${q.price.toFixed(2)}` : '—'}</td>
                    <td className={`t-fw7 ${up ? 't-green' : 't-red'}`}>
                      {q?.change_percent != null
                        ? `${up ? '+' : ''}${q.change_percent.toFixed(2)}%`
                        : '—'}
                    </td>
                    <td>{q?.week_52_high != null ? `$${q.week_52_high.toFixed(2)}` : '—'}</td>
                    <td>{q?.week_52_low  != null ? `$${q.week_52_low.toFixed(2)}`  : '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="t-btn t-btn-ghost t-btn-icon"
                        onClick={() => handleRemove(t)}
                        aria-label={`Remove ${t}`}
                      >
                        <Trash2 size={11} className="t-red" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
