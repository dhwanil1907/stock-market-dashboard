import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="t-app">
      <Sidebar />
      <div className="t-main">
        <TopBar />
        <main className="t-content">
          {children ?? <Outlet />}
        </main>
        <footer className="t-statusbar">
          <span className="t-statusbar-item">
            <span className="t-dot-live" />
            SYSTEM_OPERATIONAL
          </span>
          <span className="t-statusbar-item t-muted2">
            DATA: YFINANCE
          </span>
          <span className="t-statusbar-item t-muted2">
            © {new Date().getFullYear()} TRADEROOKIE
          </span>
          <span className="t-statusbar-item t-statusbar-item--right t-muted2">
            FOR EDUCATIONAL USE ONLY
          </span>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
