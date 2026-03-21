import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import { History, Download, Filter, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const TradeHistory: React.FC = () => {
  const { token } = useAuthStore();
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (token) {
      api.get('/trade/history').then(res => {
        setTrades(res.data);
        setLoading(false);
      }).catch(() => {
        toast.error('Could not load trade history');
        setLoading(false);
      });
    }
  }, [token]);

  const filteredTrades = filter
    ? trades.filter(t => t.ticker.includes(filter.toUpperCase()))
    : trades;

  const exportCsv = () => {
    const header = 'Ticker,Action,Quantity,Price,Type,Status,Date\n';
    const rows = filteredTrades.map(t =>
      `${t.ticker},${t.action},${t.quantity},${t.price},${t.order_type},${t.status},${t.created_at}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trade_history.csv';
    a.click();
  };

  if (!token) return (
    <div className="text-center py-20">
      <History className="mx-auto mb-4 text-gray-600" size={48} />
      <p className="text-gray-400">Please sign in to view your trade history.</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Trade History</h1>
        <div className="flex gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Filter by ticker..."
              className="pl-10 pr-4 py-2 rounded-full text-sm w-48"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <button onClick={exportCsv} className="secondary px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-brand-green" size={32} />
        </div>
      ) : filteredTrades.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <History className="mx-auto mb-4 text-gray-600" size={48} />
          <p className="text-gray-400">No trades recorded yet.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-brand-border bg-brand-dark/50">
                <th className="text-left py-4 px-5">#</th>
                <th className="text-left py-4 px-5">Ticker</th>
                <th className="text-left py-4 px-5">Action</th>
                <th className="text-right py-4 px-5">Qty</th>
                <th className="text-right py-4 px-5">Price</th>
                <th className="text-right py-4 px-5">Total</th>
                <th className="text-left py-4 px-5">Type</th>
                <th className="text-left py-4 px-5">Status</th>
                <th className="text-left py-4 px-5">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((t, i) => (
                <tr key={t.id || i} className="border-b border-brand-border/30 hover:bg-brand-border/20 transition-colors">
                  <td className="py-4 px-5 text-gray-500">{i + 1}</td>
                  <td className="py-4 px-5 font-bold text-brand-green">{t.ticker}</td>
                  <td className="py-4 px-5">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${t.action === 'BUY' ? 'bg-brand-green/10 text-brand-green' : 'bg-brand-red/10 text-brand-red'}`}>
                      {t.action}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right font-mono">{t.quantity}</td>
                  <td className="py-4 px-5 text-right font-mono">${t.price?.toFixed(2)}</td>
                  <td className="py-4 px-5 text-right font-mono">${(t.quantity * t.price).toFixed(2)}</td>
                  <td className="py-4 px-5 text-gray-400">{t.order_type}</td>
                  <td className="py-4 px-5">
                    <span className={`px-2 py-1 rounded text-xs ${t.status === 'FILLED' ? 'bg-brand-green/10 text-brand-green' : 'bg-yellow-400/10 text-yellow-400'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-gray-400 text-xs">{new Date(t.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TradeHistory;
