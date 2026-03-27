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
      toast.success(`ALERT_CREATED — ${t}`);
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
    <div className="t-card pf-empty">AUTH_REQUIRED — Please sign in to manage alerts.</div>
  );

  const active    = alerts.filter(a => !a.triggered);
  const triggered = alerts.filter(a => a.triggered);

  return (
    <div>
      <div className="t-page-header">
        <span className="t-section-title t-mb-0">PRICE_ALERTS</span>
        <span className="t-page-meta">POLLING EVERY 30S</span>
      </div>

      <div className="al-body">
        {/* Create form */}
        <form className="al-form" onSubmit={handleCreate}>
          <div className="t-card-label al-form-title">NEW_ALERT</div>

          <div className="al-form-row">
            <label className="t-label">TICKER</label>
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
            <label className="t-label">CONDITION</label>
            <select
              className="t-select"
              value={condition}
              onChange={e => setCondition(e.target.value as 'above' | 'below')}
            >
              <option value="above">PRICE RISES ABOVE</option>
              <option value="below">PRICE FALLS BELOW</option>
            </select>
          </div>

          <div className="al-form-row">
            <label className="t-label">TARGET_PRICE ($)</label>
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
              ? <><Loader2 size={11} className="t-spin" /> CREATING...</>
              : <><Plus size={11} /> CREATE_ALERT</>
            }
          </button>
        </form>

        {/* Alert list */}
        <div className="al-list">
          {loading ? (
            <div className="pf-empty"><Loader2 size={18} className="t-spin t-green" /></div>
          ) : alerts.length === 0 ? (
            <div className="pf-empty t-muted2">NO_ALERTS — Create one to get notified.</div>
          ) : (
            <>
              {/* Triggered */}
              {triggered.length > 0 && (
                <div>
                  <div className="th-filter-bar">
                    <span className="t-card-label t-mb-0 t-green">▲ TRIGGERED ({triggered.length})</span>
                  </div>
                  <table className="t-table">
                    <thead>
                      <tr>
                        <th>TICKER</th>
                        <th>CONDITION</th>
                        <th>TARGET</th>
                        <th>TRIGGERED_AT</th>
                        <th>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {triggered.map(a => (
                        <tr key={a.id}>
                          <td className="t-green t-fw7">{a.ticker}</td>
                          <td className="t-muted2">{a.condition.toUpperCase()}</td>
                          <td>${a.target_price.toFixed(2)}</td>
                          <td className="t-muted2">
                            {a.triggered_at ? format(new Date(a.triggered_at), 'MMM d, h:mm a') : '—'}
                          </td>
                          <td>
                            <button type="button" className="t-btn t-btn-ghost t-btn-icon" onClick={() => handleDismiss(a.id)}>
                              DISMISS
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
                    <span className="t-card-label t-mb-0">ACTIVE ({active.length})</span>
                  </div>
                  <table className="t-table">
                    <thead>
                      <tr>
                        <th>TICKER</th>
                        <th>CONDITION</th>
                        <th>TARGET</th>
                        <th>CREATED</th>
                        <th>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {active.map(a => (
                        <tr key={a.id}>
                          <td className="t-green t-fw7">{a.ticker}</td>
                          <td className="t-muted2">{a.condition.toUpperCase()}</td>
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
