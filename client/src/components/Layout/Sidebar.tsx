import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart2, List, PieChart, Clock, Bell, FlaskConical, Zap, TrendingUp,
  LogOut, Settings, Home,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const NAV = [
  { to: '/dashboard', icon: BarChart2, label: 'MARKET' },
  { to: '/watchlist', icon: List, label: 'WATCHLIST' },
  { to: '/portfolio', icon: PieChart, label: 'PORTFOLIO' },
  { to: '/history', icon: Clock, label: 'HISTORY' },
  { to: '/intel', icon: Zap, label: 'INTEL' },
  { to: '/sectors', icon: TrendingUp, label: 'SECTORS' },
  { to: '/alerts', icon: Bell, label: 'ALERTS' },
  { to: '/backtest', icon: FlaskConical, label: 'LAB' },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { logout } = useAuthStore();

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <aside className="t-sidebar">
      <Link to="/" className="t-sidebar-brand t-sidebar-brand--link" title="Home / landing">
        <span className="t-sidebar-brand-name">STOCKSAGE</span>
        <span className="t-sidebar-brand-sub">PAPER_TRADING_MODE</span>
      </Link>

      <nav className="t-sidebar-nav" aria-label="Primary">
        {NAV.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`t-sidebar-item${isActive(to) ? ' active' : ''}`}
          >
            <Icon size={18} strokeWidth={1.5} />
            <span className="t-sidebar-label">{label}</span>
          </Link>
        ))}
      </nav>

      <div className="t-sidebar-bottom">
        <Link
          to="/"
          className={`t-sidebar-item${location.pathname === '/' ? ' active' : ''}`}
          title="Landing page"
        >
          <Home size={16} strokeWidth={1.5} />
          <span className="t-sidebar-label">HOME</span>
        </Link>
        <Link to="/portfolio" className="t-sidebar-item" title="Settings">
          <Settings size={16} strokeWidth={1.5} />
          <span className="t-sidebar-label">SETTINGS</span>
        </Link>
        <button
          type="button"
          className="t-sidebar-item"
          onClick={logout}
          title="Logout"
        >
          <LogOut size={16} strokeWidth={1.5} />
          <span className="t-sidebar-label">LOGOUT</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
