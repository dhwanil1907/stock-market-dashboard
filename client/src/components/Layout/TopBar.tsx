import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'MARKET_OVERVIEW',
  '/sectors':   'SECTOR_HEATMAP',
  '/watchlist': 'WATCHLIST',
  '/portfolio': 'PORTFOLIO',
  '/history':   'TRADE_HISTORY',
  '/alerts':    'ALERT_MONITOR',
  '/backtest':  'SIMULATION_LAB',
  '/intel':     'INTELLIGENCE_FEED',
};

function formatCash(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

const TopBar: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const pageLabel = PAGE_LABELS[location.pathname] ?? 'TERMINAL';

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/stock/search?q=${query}`);
        setResults(res.data.slice(0, 6));
      } catch { setResults([]); }
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setResults([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (symbol: string) => {
    setQuery(''); setResults([]);
    navigate(`/stock/${symbol}`);
  };

  return (
    <header className="t-topbar">
      <div className="t-topbar-left">
        <span className="t-muted2">▸</span>
        <span className="t-topbar-page">{pageLabel}</span>
      </div>

      <div className="t-topbar-right">
        {/* Search */}
        <div style={{ position: 'relative' }} ref={ref}>
          <div className="t-topbar-search">
            <Search size={12} color="var(--t-muted2)" />
            <input
              placeholder="SEARCH_TICKER..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          {results.length > 0 && (
            <div className="t-search-results">
              {results.map(r => (
                <div key={r.symbol} className="t-search-result-item" onMouseDown={() => handleSelect(r.symbol)}>
                  <span className="t-search-result-symbol">{r.symbol}</span>
                  <span className="t-search-result-name">{r.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User */}
        {user && (
          <div className="t-user-info">
            <div className="t-user-email">{user.email.split('@')[0].toUpperCase()}</div>
            <div className="t-user-cash">{formatCash(user.cash_balance ?? 0)}</div>
          </div>
        )}

        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, letterSpacing: '0.1em', color: 'var(--t-accent)' }}>
          <span className="t-dot-live" />
          LIVE
        </div>
      </div>
    </header>
  );
};

export default TopBar;
