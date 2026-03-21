import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWatchlistStore } from '../stores/watchlistStore';
import { toast } from 'sonner';
import api from '../lib/api';
import { Eye, Plus, Trash2, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

const Watchlist: React.FC = () => {
  const { tickers, addTicker, removeTicker, init } = useWatchlistStore();
  const [quotes, setQuotes] = useState<Record<string, any>>({});
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
    toast(`Removed ${ticker} from watchlist`, {
      action: {
        label: 'Undo',
        onClick: () => addTicker(ticker),
      },
      duration: 5000,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Watchlist</h1>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add ticker..."
            className="py-2 px-4 rounded-full text-sm w-40"
            value={newTicker}
            onChange={e => setNewTicker(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} className="primary px-4 py-2 rounded-full text-sm flex items-center gap-1">
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-brand-green" size={32} />
        </div>
      ) : tickers.length === 0 ? (
        <div className="text-center py-24 glass rounded-2xl">
          <Eye className="mx-auto mb-4 text-gray-600" size={48} />
          <p className="text-gray-400 font-medium">Your watchlist is empty</p>
          <p className="text-gray-600 text-sm mt-1">Type a ticker above and press Enter to add your first stock.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {tickers.map(t => {
            const q = quotes[t];
            return (
              <div key={t} className="glass rounded-2xl p-5 flex items-center justify-between hover:border-brand-green/30 transition-all">
                <Link to={`/stock/${t}`} className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center text-brand-green font-bold text-sm">
                    {t.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold">{t}</div>
                    <div className="text-xs text-gray-400">{q?.company_name || '—'}</div>
                  </div>
                </Link>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div className="font-mono font-bold">${q?.price?.toFixed(2) || '--'}</div>
                    <div className={`text-sm flex items-center justify-end gap-1 ${(q?.change_percent ?? 0) >= 0 ? 'price-up' : 'price-down'}`}>
                      {(q?.change_percent ?? 0) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {q?.change_percent?.toFixed(2) || '--'}%
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemove(t)}
                    className="p-2 text-gray-500 hover:text-brand-red transition-colors"
                    aria-label={`Remove ${t} from watchlist`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Watchlist;
