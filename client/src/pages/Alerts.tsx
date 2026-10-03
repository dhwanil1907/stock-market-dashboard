import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2 } from 'lucide-react';
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
  const [alerts, setAlerts]         = useState<Alert[]>([]);
  const [loading, setLoading]       = useState(true);
  const [ticker, setTicker]         = useState('');
  const [condition, setCondition]   = useState<'above' | 'below'>('above');
  const [targetPrice, setTargetPrice] = useState('');
  const [creating, setCreating]     = useState(false);

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
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [token, fetchAlerts]);

  useEffect(() => {
    alerts.forEach(a => {
      if (a.triggered && !a.dismissed) {
        toast.success(`${a.ticker} hit $${a.target_price.toFixed(2)}`, { duration: 8000 });
      }
    });
  }, [alerts.filter(a => a.triggered).length]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    const price = parseFloat(targetPrice);
    if (!t || isNaN(price) || price <= 0) {
      toast.error('Enter a valid ticker and price');
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
    <div className="t-card pf-empty">Sign in to manage price alerts.</div>
  );

  const active    = alerts.filter(a => !a.triggered);
  const triggered = alerts.filter(a => a.triggered);

  return (
    <div>
      <p className="wl-page-meta">Price targets · checks every 30s</p>

      <div className="al-body">
        {/* Create form */}
        <form className="al-form" onSubmit={handleCreate}>
          <div className="t-card-label al-form-title">New alert</div>

          <div className="al-form-row">
            <label className="t-label">Ticker</label>
            <input
              type="text"
              className="t-input"
              placeholder="AAPL"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              required
            />
          </div>

          <div className="al-form-row">
            <label className="t-label">Condition</label>
            <select
              className="t-select"
              value={condition}
              onChange={e => setCondition(e.target.value as 'above' | 'below')}
            >
              <option value="above">Price rises above</option>
              <option value="below">Price falls below</option>
            </select>
          </div>

          <div className="al-form-row">
            <label className="t-label">Target price ($)</label>
            <input
              type="number"
              className="t-input"
              placeholder="150.00"
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              step="0.01"
              min="0.01"
              required
            />
          </div>

          <button type="submit" className="t-btn t-btn-accent al-submit" disabled={creating}>
            {creating
              ? <><Loader2 size={11} className="t-spin" /> Creating…</>
              : <><Plus size={11} /> Create alert</>
            }
          </button>
        </form>

        {/* Alert list */}
        <div className="al-list">
          {loading ? (
            <div className="pf-empty"><Loader2 size={18} className="t-spin t-green" /></div>
          ) : alerts.length === 0 ? (
            <div className="pf-empty t-muted2">No alerts yet — create one to get notified.</div>
          ) : (
            <>
              {/* Triggered */}
              {triggered.length > 0 && (
                <div>
                  <div className="th-filter-bar">
                    <span className="t-card-label t-mb-0 t-green">Triggered ({triggered.length})</span>
                  </div>
                  <table className="t-table">
                    <thead>
                      <tr>
                        <th>Ticker</th>
                        <th>Condition</th>
                        <th>Target</th>
                        <th>Triggered at</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {triggered.map(a => (
                        <tr key={a.id}>
                          <td className="t-green t-fw7">{a.ticker}</td>
                          <td className="t-muted2">{a.condition === 'above' ? 'Above' : 'Below'}</td>
                          <td>${a.target_price.toFixed(2)}</td>
                          <td className="t-muted2">
                            {a.triggered_at ? format(new Date(a.triggered_at), 'MMM d, h:mm a') : '—'}
                          </td>
                          <td>
                            <button type="button" className="t-btn t-btn-ghost t-btn-icon" onClick={() => handleDismiss(a.id)}>
                              Dismiss
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Active */}
              {active.length > 0 && (
                <div>
                  <div className="th-filter-bar">
                    <span className="t-card-label t-mb-0">Active ({active.length})</span>
                  </div>
                  <table className="t-table">
                    <thead>
                      <tr>
                        <th>Ticker</th>
                        <th>Condition</th>
                        <th>Target</th>
                        <th>Created</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {active.map(a => (
                        <tr key={a.id}>
                          <td className="t-green t-fw7">{a.ticker}</td>
                          <td className="t-muted2">{a.condition === 'above' ? 'Above' : 'Below'}</td>
                          <td>${a.target_price.toFixed(2)}</td>
                          <td className="t-muted2">{format(new Date(a.created_at), 'MMM d')}</td>
                          <td>
                            <button type="button" className="t-btn t-btn-ghost t-btn-icon" onClick={() => handleDelete(a.id)} title={`Delete alert for ${a.ticker}`}>
                              <Trash2 size={11} className="t-red" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Alerts;
