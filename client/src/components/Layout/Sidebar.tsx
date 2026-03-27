import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart2, List, PieChart, Clock,
  Bell, FlaskConical, Zap, TrendingUp, LogOut, Home,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const NAV = [
  { to: '/dashboard', icon: BarChart2,    label: 'MARKET'    },
  { to: '/sectors',   icon: TrendingUp,   label: 'SECTORS'   },
  { to: '/watchlist', icon: List,          label: 'WATCHLIST' },
  { to: '/portfolio', icon: PieChart,      label: 'PORTFOLIO' },
  { to: '/history',   icon: Clock,         label: 'HISTORY'   },
  { to: '/alerts',    icon: Bell,          label: 'ALERTS'    },
  { to: '/backtest',  icon: FlaskConical,  label: 'LAB'       },
  { to: '/intel',     icon: Zap,           label: 'INTEL'     },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { logout } = useAuthStore();

  return (
    <aside className="t-sidebar">
      {/* Logo */}
      <div className="t-sidebar-logo">TR</div>

      {/* Nav */}
      <nav className="t-sidebar-nav">
        {NAV.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`t-sidebar-item${location.pathname === to || location.pathname.startsWith(to + '/') ? ' active' : ''}`}
            title={label}
          >
            <Icon size={18} strokeWidth={1.5} />
            <span className="t-sidebar-label">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="t-sidebar-bottom">
        <Link
          to="/"
          className="t-sidebar-item"
          title="HOME"
        >
          <Home size={16} strokeWidth={1.5} />
          <span className="t-sidebar-label">HOME</span>
        </Link>
        <button
          className="t-sidebar-item"
          onClick={logout}
          title="LOGOUT"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0' }}
        >
          <LogOut size={16} strokeWidth={1.5} />
          <span className="t-sidebar-label">LOGOUT</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
