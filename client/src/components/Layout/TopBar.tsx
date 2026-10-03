import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { formatCash } from '../../lib/format';
import { pageTitleForPath } from '../../lib/routeTitles';
import api from '../../lib/api';

const TopBar: React.FC = () => {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ symbol: string; name?: string }[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const pageTitle = pageTitleForPath(location.pathname);

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
    ? user.email.split('@')[0].slice(0, 2).toUpperCase()
    : '—';

  return (
    <header className="t-topbar">
      <div className="t-topbar-left">
        <h1 className="t-topbar-page">{pageTitle}</h1>
      </div>

      <div className="t-topbar-right">
        <div className="t-topbar-search-wrap" ref={ref}>
          <div className="t-topbar-search">
            <Search size={14} strokeWidth={1.75} aria-hidden />
            <input
              type="search"
              aria-label="Search markets"
              placeholder="Search markets…"
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

        <button
          type="button"
          className="t-icon-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
        </button>

        {user && (
          <div className="t-user-info">
            <div className="t-user-email">{user.email.split('@')[0]}</div>
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
