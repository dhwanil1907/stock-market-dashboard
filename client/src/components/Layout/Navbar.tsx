import React, { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp, LogOut, Menu, X, Sun, Moon } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import api from '../../lib/api';

function formatCash(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

const NAV_LINKS = [
  { to: '/dashboard', label: 'Market' },
  { to: '/sectors', label: 'Sectors' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/watchlist', label: 'Watchlist' },
  { to: '/history', label: 'History' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/backtest', label: 'Backtest' },
];

const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (query.length > 1) {
      const timer = setTimeout(async () => {
        try {
          const res = await api.get(`/stock/search?q=${query}`);
          setResults(res.data);
        } catch {
          setResults([]);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
    }
  }, [query]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (symbol: string) => {
    setQuery('');
    setResults([]);
    navigate(`/stock/${symbol}`);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 glass z-50 px-6 flex items-center justify-between">
        {/* Left: Logo + Desktop Nav */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 text-brand-green font-bold text-xl tracking-tight shrink-0">
            <TrendingUp size={28} />
            <span>StockSage</span>
          </Link>

          {user && (
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
              {NAV_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`hover:text-white transition-colors ${location.pathname === to ? 'text-white' : ''}`}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-md mx-4 md:mx-8 relative" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search tickers..."
              className="w-full pl-10 pr-4 py-2 bg-brand-dark bg-opacity-50 border border-brand-border rounded-full text-sm focus:ring-1 focus:ring-brand-green outline-none transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 glass rounded-xl overflow-hidden shadow-2xl z-50">
              {results.map((res) => (
                <div
                  key={res.symbol}
                  className="px-4 py-3 hover:bg-brand-border cursor-pointer flex justify-between items-center transition-colors"
                  onMouseDown={() => handleSelect(res.symbol)}
                >
                  <div>
                    <div className="font-bold text-brand-green">{res.symbol}</div>
                    <div className="text-xs text-gray-400">{res.name}</div>
                  </div>
                  <TrendingUp size={14} className="text-gray-600" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: User info + hamburger */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium">{user.email.split('@')[0]}</div>
                <div className="text-xs text-brand-green font-mono">{formatCash(user.cash_balance ?? 0)}</div>
              </div>
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="p-2 text-gray-400 hover:text-white transition-colors hidden md:block"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button
                onClick={logout}
                aria-label="Logout"
                className="p-2 text-gray-400 hover:text-brand-red transition-colors hidden md:block"
              >
                <LogOut size={20} />
              </button>
              <button
                onClick={() => setMobileOpen(o => !o)}
                aria-label="Toggle menu"
                className="p-2 text-gray-400 hover:text-white transition-colors md:hidden"
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </>
          ) : (
            <Link to="/login" className="primary px-6 py-2 rounded-full text-sm">Sign In</Link>
          )}
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && user && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute top-16 left-0 right-0 glass border-t border-brand-border py-4 px-6 space-y-1"
            onClick={e => e.stopPropagation()}
          >
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`block py-3 text-sm font-medium border-b border-brand-border/40 hover:text-white transition-colors ${location.pathname === to ? 'text-white' : 'text-gray-400'}`}
              >
                {label}
              </Link>
            ))}
            <button
              onClick={toggleTheme}
              className="w-full text-left py-3 text-sm font-medium border-b border-brand-border/40 hover:text-white transition-colors flex items-center gap-2 text-gray-400"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button
              onClick={logout}
              className="w-full text-left py-3 text-sm font-medium text-brand-red hover:opacity-80 transition-colors flex items-center gap-2"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
