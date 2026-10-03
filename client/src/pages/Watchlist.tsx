import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWatchlistStore } from '../stores/watchlistStore';
import { toast } from 'sonner';
import api from '../lib/api';
import { Trash2, Loader2, Plus } from 'lucide-react';
import { formatPrice, formatVolume } from '../lib/format';
import { ChangeBadge } from '../components/ui/ChangeBadge';
import { DataTable } from '../components/ui/DataTable';

function heatBackground(up: boolean, intensity: number): string {
  const pct = Math.round(14 + intensity * 40);
  const color = up ? 'var(--color-gain)' : 'var(--color-loss)';
  return `color-mix(in srgb, ${color} ${pct}%, var(--color-surface))`;
}

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
  }, [init]);

  const fetchAll = useCallback(async () => {
    if (!tickers.length) return;
    const results = await Promise.allSettled(
      tickers.map(t => api.get(`/stock/${t}/quote`).then(r => ({ ticker: t, data: r.data }))),
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
    <div className="wl-page">
      <div className="t-page-header" style={{ flexWrap: 'wrap', gap: 16 }}>
        <p className="wl-page-meta">Tracking {tickers.length} {tickers.length === 1 ? 'symbol' : 'symbols'}</p>
        <div className="wl-hero-actions">
          <input
            type="text"
            className="wl-add-input"
            style={{ width: 160 }}
            placeholder="Ticker…"
            value={newTicker}
            onChange={e => setNewTicker(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button type="button" className="t-btn t-btn-accent" onClick={handleAdd}>
            <Plus size={12} /> Add symbol
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
          <div className="t-muted2">Your watchlist is empty</div>
          <div className="t-muted2 wl-empty-sub">Type a ticker above and press Enter.</div>
        </div>
      ) : (
        <>
          <DataTable bare>
            <table className="t-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Price</th>
                  <th>Change</th>
                  <th title="Shares traded today">Day volume</th>
                  <th>Note</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tickers.map(t => {
                  const q = quotes[t];
                  return (
                    <tr key={t}>
                      <td>
                        <Link to={`/stock/${t}`} className="mo-sym-link">{t}</Link>
                        <span className="mo-company" style={{ display: 'block', marginTop: 4, marginLeft: 0 }}>
                          {q?.company_name ?? '—'}
                        </span>
                      </td>
                      <td className="t-num">{q?.price != null ? formatPrice(q.price) : '—'}</td>
                      <td><ChangeBadge value={q?.change_percent} decimals={2} /></td>
                      <td className="t-num t-muted">{formatVolume(q?.volume)}</td>
                      <td style={{ maxWidth: 160 }}>
                        <input
                          type="text"
                          className="wl-note-input"
                          placeholder="Why watch?"
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
          </DataTable>

          <div className="wl-widgets">
            <div className="wl-widget">
              <h2 className="ui-section-label">Day performance</h2>
              <div className="wl-heat">
                {tickers.map(sym => {
                  const q = quotes[sym];
                  const pct = q?.change_percent ?? 0;
                  const up = pct >= 0;
                  const intensity = Math.min(1, Math.abs(pct) / 5);
                  const bg = q ? heatBackground(up, intensity) : 'var(--color-surface-elevated)';
                  return (
                    <div key={sym} className="wl-heat-cell" style={{ background: bg }}>
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
              <h2 className="ui-section-label">Notes</h2>
              <p className="t-muted2" style={{ fontSize: 'var(--text-caption)', lineHeight: 1.55, margin: 0 }}>
                Add a short note per symbol in the table to capture your thesis.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Watchlist;
