import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '../lib/format';
import { ChangeBadge } from '../components/ui/ChangeBadge';
import { DataTable } from '../components/ui/DataTable';

interface SectorData {
  sector: string;
  etf: string;
  price: number;
  change_pct: number;
  month_return_pct: number;
  error?: string;
}

function heatClass(pct: number): string {
  if (pct >= 3)    return 'sh-cell--g3';
  if (pct >= 1.5)  return 'sh-cell--g2';
  if (pct >= 0.5)  return 'sh-cell--g1';
  if (pct >= 0)    return 'sh-cell--g0';
  if (pct >= -0.5) return 'sh-cell--r0';
  if (pct >= -1.5) return 'sh-cell--r1';
  if (pct >= -3)   return 'sh-cell--r2';
  return 'sh-cell--r3';
}

const SectorHeatmap: React.FC = () => {
  const [sectors, setSectors]         = useState<SectorData[]>([]);
  const [loading, setLoading]         = useState(true);
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

  const best  = sectors.reduce((b, s) => s.change_pct > (b?.change_pct ?? -Infinity) ? s : b, sectors[0]);
  const worst = sectors.reduce((w, s) => s.change_pct < (w?.change_pct ?? Infinity)  ? s : w, sectors[0]);
  const posCount = sectors.filter(s => s.change_pct > 0).length;

  return (
    <div>
      <div className="t-page-header">
        <p className="wl-page-meta t-mb-0">
          Sector ETFs by day change{lastUpdated ? ` · Updated ${lastUpdated.toLocaleTimeString()}` : ''}
        </p>
        <div className="t-page-actions">
          <button
            type="button"
            className="t-btn t-btn-ghost"
            onClick={() => fetchSectors()}
            disabled={loading}
            aria-label="Refresh sectors"
          >
            <RefreshCw size={10} className={loading ? 't-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="t-card pf-empty"><Loader2 size={20} className="t-spin t-green" /></div>
      ) : (
        <>
          {sectors.length > 0 && (
            <div className="sh-summary">
              <div className="t-card">
                <div className="t-card-label">Sectors up</div>
                <div className="t-card-value t-green">{posCount}/{sectors.length}</div>
              </div>
              <div className="t-card">
                <div className="t-card-label">Best today</div>
                <div className="t-card-value">{best?.sector?.split(' ')[0]}</div>
                <div className="t-card-sub"><ChangeBadge value={best?.change_pct} decimals={2} /></div>
              </div>
              <div className="t-card">
                <div className="t-card-label">Worst today</div>
                <div className="t-card-value">{worst?.sector?.split(' ')[0]}</div>
                <div className="t-card-sub"><ChangeBadge value={worst?.change_pct} decimals={2} /></div>
              </div>
            </div>
          )}

          <div className="sh-grid">
            {sectors.map(s => (
              <div key={s.sector} className={`sh-cell ${heatClass(s.change_pct)}`}>
                <div className="sh-cell-etf">{s.etf}</div>
                <div className="sh-cell-name">{s.sector}</div>
                <div className="sh-cell-chg">{s.change_pct >= 0 ? '+' : ''}{s.change_pct.toFixed(2)}%</div>
                <div className="sh-cell-price">{formatPrice(s.price)}</div>
              </div>
            ))}
          </div>

          <div className="t-card-bare t-mt-1px">
            <DataTable bare>
              <table className="t-table">
                <thead>
                  <tr>
                    <th>Sector</th>
                    <th>ETF</th>
                    <th>Price</th>
                    <th>Today</th>
                    <th>1 month</th>
                  </tr>
                </thead>
                <tbody>
                  {[...sectors].sort((a, b) => b.change_pct - a.change_pct).map(s => (
                    <tr key={s.sector}>
                      <td>{s.sector}</td>
                      <td className="mo-sym-link">{s.etf}</td>
                      <td className="t-num">{formatPrice(s.price)}</td>
                      <td><ChangeBadge value={s.change_pct} decimals={2} /></td>
                      <td><ChangeBadge value={s.month_return_pct} decimals={2} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTable>
          </div>
        </>
      )}
    </div>
  );
};

export default SectorHeatmap;
