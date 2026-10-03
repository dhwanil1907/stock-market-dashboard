import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout/Layout';
import Landing from './pages/Landing';
import MarketOverview from './pages/MarketOverview';
import StockDetail from './pages/StockDetail';
import Portfolio from './pages/Portfolio';
import Watchlist from './pages/Watchlist';
import TradeHistory from './pages/TradeHistory';
import Alerts from './pages/Alerts';
import Backtest from './pages/Backtest';
import SectorHeatmap from './pages/SectorHeatmap';
import Intel from './pages/Intel';
import Login from './pages/Login';
import { useThemeStore } from './stores/themeStore';
import './index.css';

const AppLayout: React.FC = () => (
  <Layout>
    <Outlet />
  </Layout>
);

const App: React.FC = () => {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-caption)',
          },
        }}
      />
      <Routes>
        {/* Public — no layout */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* App — sidebar layout */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard"  element={<MarketOverview />} />
          <Route path="/stock/:ticker" element={<StockDetail />} />
          <Route path="/sectors"    element={<SectorHeatmap />} />
          <Route path="/portfolio"  element={<Portfolio />} />
          <Route path="/watchlist"  element={<Watchlist />} />
          <Route path="/history"    element={<TradeHistory />} />
          <Route path="/alerts"     element={<Alerts />} />
          <Route path="/backtest"   element={<Backtest />} />
          <Route path="/intel"      element={<Intel />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
