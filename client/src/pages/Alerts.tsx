import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import { toast } from 'sonner';
import { Bell, BellOff, Plus, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface Alert {
  id: number;
  ticker: string;
  condition: 'above' | 'below';
  target_price: number;
  triggered: number;
  dismissed: number;
  triggered_at: string | null;
  created_at: string;
}

const Alerts: React.FC = () => {
  const { token } = useAuthStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticker, setTicker] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [targetPrice, setTargetPrice] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.get('/alerts');
      setAlerts(res.data);
    } catch {
      toast.error('Could not load alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [token, fetchAlerts]);

  // Show toast for newly triggered alerts
  useEffect(() => {
    alerts.forEach(a => {
      if (a.triggered && !a.dismissed) {
        toast.success(`${a.ticker} hit your target of $${a.target_price.toFixed(2)}!`, {
          icon: '🔔',
          duration: 8000,
        });
      }
    });
  }, [alerts.filter(a => a.triggered).length]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    const price = parseFloat(targetPrice);
    if (!t || isNaN(price) || price <= 0) {
      toast.error('Please enter a valid ticker and price');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post('/alerts', { ticker: t, condition, target_price: price });
      setAlerts(prev => [res.data, ...prev]);
      setTicker('');
      setTargetPrice('');
      toast.success(`Alert created for ${t}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create alert');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/alerts/${id}`);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch {
      toast.error('Failed to delete alert');
    }
  };

  const handleDismiss = async (id: number) => {
    try {
      await api.put(`/alerts/${id}/dismiss`);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch {
      toast.error('Failed to dismiss alert');
    }
  };

  if (!token) return (
    <div className="text-center py-20">
      <Bell className="mx-auto mb-4 text-gray-600" size={48} />
      <p className="text-gray-400">Please sign in to manage alerts.</p>
    </div>
  );

  const active = alerts.filter(a => !a.triggered);
  const triggered = alerts.filter(a => a.triggered);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Price Alerts</h1>
        <div className="text-sm text-gray-400">Checked every 5 minutes</div>
      </div>

      {/* Create Alert Form */}
      <form onSubmit={handleCreate} className="glass rounded-2xl p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">New Alert</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Ticker</label>
            <input
              type="text"
              placeholder="AAPL"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              className="py-2 px-4 rounded-xl text-sm w-28 uppercase"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Condition</label>
            <select
              value={condition}
              onChange={e => setCondition(e.target.value as 'above' | 'below')}
              className="py-2 px-4 rounded-xl text-sm bg-brand-dark border border-brand-border"
            >
              <option value="above">Rises above</option>
              <option value="below">Falls below</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Target Price ($)</label>
            <input
              type="number"
              placeholder="150.00"
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              className="py-2 px-4 rounded-xl text-sm w-32"
              step="0.01"
              min="0.01"
              required
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="primary px-5 py-2 rounded-xl text-sm flex items-center gap-2"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Create Alert
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-brand-green" size={32} />
        </div>
      ) : (
        <>
          {/* Triggered alerts */}
          {triggered.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-brand-green mb-3 flex items-center gap-2">
                <CheckCircle2 size={16} /> Triggered ({triggered.length})
              </h3>
              <div className="grid gap-2">
                {triggered.map(a => (
                  <div key={a.id} className="glass rounded-xl p-4 flex items-center justify-between border border-brand-green/20 bg-brand-green/5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-brand-green/10 rounded-lg flex items-center justify-center text-brand-green font-bold text-xs">
                        {a.ticker.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-brand-green">{a.ticker}</div>
                        <div className="text-xs text-gray-400">
                          Price {a.condition} ${a.target_price.toFixed(2)} — triggered {a.triggered_at ? format(new Date(a.triggered_at), 'MMM d, h:mm a') : ''}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDismiss(a.id)} className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-brand-border hover:bg-brand-border transition-all">
                      Dismiss
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active alerts */}
          {active.length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl">
              <BellOff className="mx-auto mb-4 text-gray-600" size={40} />
              <p className="text-gray-400">No active alerts. Create one above.</p>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Active ({active.length})</h3>
              <div className="grid gap-2">
                {active.map(a => (
                  <div key={a.id} className="glass rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-brand-border rounded-lg flex items-center justify-center text-gray-400 font-bold text-xs">
                        {a.ticker.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold">{a.ticker}</div>
                        <div className="text-xs text-gray-400">
                          Notify when price {a.condition} <span className="text-white font-mono">${a.target_price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{format(new Date(a.created_at), 'MMM d')}</span>
                      <button onClick={() => handleDelete(a.id)} className="p-2 text-gray-500 hover:text-brand-red transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Alerts;
