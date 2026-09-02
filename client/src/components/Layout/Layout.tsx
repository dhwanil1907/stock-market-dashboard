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
      </div>
    </div>
  );
};

export default Layout;
