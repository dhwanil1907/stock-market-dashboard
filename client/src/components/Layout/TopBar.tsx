import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, HelpCircle, Bell } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';

function formatCash(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

const TopBar: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ symbol: string; name?: string }[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/stock/search?q=${query}`);
        setResults(res.data.slice(0, 6));
      } catch {
        setResults([]);
      }
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
    setQuery('');
    setResults([]);
    navigate(`/stock/${symbol}`);
  };

  const initials = user?.email
    ? user.email
      .split('@')[0]
      .slice(0, 2)
      .toUpperCase()
    : '—';

  return (
    <header className="t-topbar">
      <div className="t-topbar-left" aria-hidden="true" />

      <div className="t-topbar-right">
        <div style={{ position: 'relative' }} ref={ref}>
          <div className="t-topbar-search">
            <Search size={12} color="var(--t-muted2)" />
            <input
              placeholder="SEARCH_MARKETS..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          {results.length > 0 && (
            <div className="t-search-results">
              {results.map(r => (
                <div
                  key={r.symbol}
                  className="t-search-result-item"
                  onMouseDown={() => handleSelect(r.symbol)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="t-search-result-symbol">{r.symbol}</span>
                  <span className="t-search-result-name">{r.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="t-topbar-icons">
          <button type="button" className="t-icon-btn" aria-label="Help">
            <HelpCircle size={17} strokeWidth={1.5} />
          </button>
          <button type="button" className="t-icon-btn" aria-label="Notifications">
            <Bell size={17} strokeWidth={1.5} />
          </button>
        </div>

        {user && (
          <div className="t-user-info">
            <div className="t-user-email">{user.email.split('@')[0].toUpperCase()}</div>
            <div className="t-user-cash">{formatCash(user.cash_balance ?? 0)}</div>
          </div>
        )}

        <div className="t-user-avatar" aria-hidden>
          {initials}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
