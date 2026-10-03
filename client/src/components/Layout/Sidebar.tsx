import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart2, List, PieChart, Clock, Bell, FlaskConical, Zap, TrendingUp,
  LogOut, Settings, Home,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Brand } from '../ui/Brand';

const NAV = [
  { to: '/dashboard', icon: BarChart2, label: 'Market' },
  { to: '/watchlist', icon: List, label: 'Watchlist' },
  { to: '/portfolio', icon: PieChart, label: 'Portfolio' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/intel', icon: Zap, label: 'Intel' },
  { to: '/sectors', icon: TrendingUp, label: 'Sectors' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/backtest', icon: FlaskConical, label: 'Lab' },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { logout } = useAuthStore();

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <aside className="t-sidebar">
      <Link to="/" className="t-sidebar-brand t-sidebar-brand--link" title="Home">
        <Brand tagline="short" />
      </Link>

      <nav className="t-sidebar-nav" aria-label="Primary">
        {NAV.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`t-sidebar-item${isActive(to) ? ' active' : ''}`}
          >
            <Icon size={18} strokeWidth={1.75} />
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
          <Home size={16} strokeWidth={1.75} />
          <span className="t-sidebar-label">Home</span>
        </Link>
        <Link to="/portfolio" className="t-sidebar-item" title="Portfolio settings">
          <Settings size={16} strokeWidth={1.75} />
          <span className="t-sidebar-label">Settings</span>
        </Link>
        <button type="button" className="t-sidebar-item" onClick={logout} title="Log out">
          <LogOut size={16} strokeWidth={1.75} />
          <span className="t-sidebar-label">Log out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
