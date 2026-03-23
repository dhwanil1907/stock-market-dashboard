import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen pt-16">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children ?? <Outlet />}
      </main>
      <footer className="border-t border-brand-border mt-12 py-8 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} TradeRookie. Data powered by yfinance. For educational use only.</p>
      </footer>
    </div>
  );
};

export default Layout;
