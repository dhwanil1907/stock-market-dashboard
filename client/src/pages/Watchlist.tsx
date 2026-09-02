import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWatchlistStore } from '../stores/watchlistStore';
import { toast } from 'sonner';
import api from '../lib/api';
import { Trash2, Loader2, Plus } from 'lucide-react';

const fmtVol = (n: number) => (n != null ? `${(n / 1_000_000).toFixed(1)}M` : '—');

const Watchlist: React.FC = () => {
  const { tickers, addTicker, removeTicker, init } = useWatchlistStore();
  const [quotes, setQuotes] = useState<Record<string, any>>({});
  const [newTicker, setNewTicker] = useState('');
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('wl_notes') ?? '{}'); } catch { return {}; }
  });

  const updateNote = (ticker: string, value: string) => {
    const updated = { ...notes, [ticker]: value };
    setNotes(updated);
    localStorage.setItem('wl_notes', JSON.stringify(updated));
  };

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
      <div className="t-page-header" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="t-page-hero-title" style={{ marginBottom: 6 }}>WATCHLIST</h1>
          <p className="wl-sub">
            TRACKING {tickers.length} ASSETS
          </p>
        </div>
        <div className="wl-hero-actions">
          <input
            type="text"
            className="wl-add-input"
            style={{ width: 160 }}
            placeholder="TICKER…"
            value={newTicker}
            onChange={e => setNewTicker(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button type="button" className="t-btn t-btn-accent" onClick={handleAdd}>
            <Plus size={12} /> ADD STOCK +
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
        <>
          <div className="t-card-bare">
            <table className="t-table">
              <thead>
                <tr>
                  <th>TICKER</th>
                  <th>PRICE</th>
                  <th>CHANGE</th>
                  <th title="Shares traded in the current trading day">DAY VOLUME</th>
                  <th>NOTE</th>
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
                        <span className="mo-company" style={{ display: 'block', marginTop: 4, marginLeft: 0 }}>
                          {q?.company_name ?? '—'}
                        </span>
                      </td>
                      <td>{q?.price != null ? `$${q.price.toFixed(2)}` : '—'}</td>
                      <td className={`t-fw7 ${up ? 't-green' : 't-red'}`}>
                        {q?.change_percent != null
                          ? `${up ? '+' : ''}${q.change_percent.toFixed(2)}%`
                          : '—'}
                      </td>
                      <td>{fmtVol(q?.volume)}</td>
                      <td style={{ maxWidth: 160 }}>
                        <input
                          type="text"
                          className="wl-note-input"
                          placeholder="Why are you watching this?"
                          value={notes[t] ?? ''}
                          onChange={e => updateNote(t, e.target.value)}
                        />
                      </td>
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

          <div className="wl-widgets">
            <div className="wl-widget">
              <div className="t-card-label t-mb-0">WATCHLIST_PERFORMANCE_HEATMAP</div>
              <div className="wl-heat">
                {tickers.map(sym => {
                  const q = quotes[sym];
                  const pct = q?.change_percent ?? 0;
                  const up = pct >= 0;
                  const intensity = Math.min(1, Math.abs(pct) / 5);
                  const bg = q
                    ? up
                      ? `rgba(0, 255, 136, ${0.15 + intensity * 0.45})`
                      : `rgba(255, 96, 96, ${0.18 + intensity * 0.5})`
                    : '#1a1a1a';
                  return (
                    <div
                      key={sym}
                      className="wl-heat-cell"
                      style={{ background: bg }}
                    >
                      <span className="wl-heat-sym">{sym}</span>
                      <span className="wl-heat-pct">
                        {q ? `${up ? '+' : ''}${pct.toFixed(2)}%` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="wl-widget">
              <div className="t-card-label t-mb-0">MARKET_PULSE</div>
              <p style={{ margin: '12px 0 8px', fontSize: 10, color: 'var(--t-muted)' }}>
                <span className="t-red">VIX_VOLATILITY</span> ELEVATED ·{' '}
                <span className="t-green">SPY_LEVEL</span> STABLE · BTC_INDEX TRACKING RISK-ON
              </p>
              <p className="t-muted2" style={{ fontSize: 9, lineHeight: 1.55, margin: 0 }}>
                ANALYSIS: RANGE-BOUND ACTION EXPECTED UNTIL CPI PRINT. WATCH MOVING AVERAGE STACKS.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Watchlist;
