import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface SectorData {
  sector: string;
  etf: string;
  price: number;
  change_pct: number;
  month_return_pct: number;
  error?: string;
}

function getHeatColor(pct: number): string {
  if (pct >= 3) return 'bg-green-600 text-white';
  if (pct >= 1.5) return 'bg-green-700/80 text-white';
  if (pct >= 0.5) return 'bg-green-800/70 text-green-200';
  if (pct >= 0) return 'bg-green-900/60 text-green-300';
  if (pct >= -0.5) return 'bg-red-900/60 text-red-300';
  if (pct >= -1.5) return 'bg-red-800/70 text-red-200';
  if (pct >= -3) return 'bg-red-700/80 text-white';
  return 'bg-red-600 text-white';
}

function getMonthColor(pct: number): string {
  if (pct >= 10) return 'text-green-400';
  if (pct >= 5) return 'text-green-500';
  if (pct >= 0) return 'text-green-600';
  if (pct >= -5) return 'text-red-500';
  return 'text-red-400';
}

const SectorHeatmap: React.FC = () => {
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSectors = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/stock/sectors');
      setSectors(res.data);
      setLastUpdated(new Date());
    } catch {
      toast.error('Could not load sector data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSectors();
    const interval = setInterval(() => fetchSectors(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const bestSector = sectors.reduce((best, s) => s.change_pct > (best?.change_pct ?? -Infinity) ? s : best, sectors[0]);
  const worstSector = sectors.reduce((worst, s) => s.change_pct < (worst?.change_pct ?? Infinity) ? s : worst, sectors[0]);
  const positiveCount = sectors.filter(s => s.change_pct > 0).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Sector Heatmap</h1>
          <p className="text-sm text-gray-400">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Fetching live data...'}
          </p>
        </div>
        <button
          onClick={() => fetchSectors()}
          disabled={loading}
          className="secondary p-2 rounded-xl hover:bg-brand-border transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="text-center">
            <Loader2 className="animate-spin text-brand-green mx-auto mb-3" size={36} />
            <p className="text-gray-400 text-sm">Fetching sector data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary row */}
          {sectors.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="glass rounded-2xl p-4">
                <div className="text-xs text-gray-400 mb-1">Sectors Up</div>
                <div className="text-2xl font-bold price-up">{positiveCount}/{sectors.length}</div>
              </div>
              <div className="glass rounded-2xl p-4">
                <div className="text-xs text-gray-400 mb-1">Best Sector Today</div>
                <div className="font-bold text-green-400">{bestSector?.sector}</div>
                <div className="text-sm font-mono text-green-400">+{bestSector?.change_pct?.toFixed(2)}%</div>
              </div>
              <div className="glass rounded-2xl p-4">
                <div className="text-xs text-gray-400 mb-1">Worst Sector Today</div>
                <div className="font-bold text-red-400">{worstSector?.sector}</div>
                <div className="text-sm font-mono text-red-400">{worstSector?.change_pct?.toFixed(2)}%</div>
              </div>
            </div>
          )}

          {/* Heatmap grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
            {sectors.map(s => (
              <div
                key={s.sector}
                className={`rounded-2xl p-5 transition-all hover:scale-105 cursor-default ${getHeatColor(s.change_pct)}`}
              >
                <div className="text-xs font-medium opacity-80 mb-2">{s.etf}</div>
                <div className="font-bold text-sm mb-3 leading-tight">{s.sector}</div>
                <div className="text-2xl font-bold font-mono mb-1">
                  {s.change_pct >= 0 ? '+' : ''}{s.change_pct.toFixed(2)}%
                </div>
                <div className="text-xs opacity-70">${s.price.toFixed(2)}</div>
              </div>
            ))}
          </div>

          {/* Detail table */}
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-brand-border bg-brand-dark/50">
                  <th className="text-left py-4 px-5">Sector</th>
                  <th className="text-left py-4 px-5">ETF</th>
                  <th className="text-right py-4 px-5">Price</th>
                  <th className="text-right py-4 px-5">Today</th>
                  <th className="text-right py-4 px-5">1 Month</th>
                </tr>
              </thead>
              <tbody>
                {[...sectors].sort((a, b) => b.change_pct - a.change_pct).map(s => (
                  <tr key={s.sector} className="border-b border-brand-border/30 hover:bg-brand-border/20 transition-colors">
                    <td className="py-3 px-5 font-medium">{s.sector}</td>
                    <td className="py-3 px-5 text-gray-400 font-mono">{s.etf}</td>
                    <td className="py-3 px-5 text-right font-mono">${s.price.toFixed(2)}</td>
                    <td className={`py-3 px-5 text-right font-mono font-bold ${s.change_pct >= 0 ? 'price-up' : 'price-down'}`}>
                      {s.change_pct >= 0 ? '+' : ''}{s.change_pct.toFixed(2)}%
                    </td>
                    <td className={`py-3 px-5 text-right font-mono ${getMonthColor(s.month_return_pct)}`}>
                      {s.month_return_pct >= 0 ? '+' : ''}{s.month_return_pct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default SectorHeatmap;
