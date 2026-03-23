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
    document.documentElement.className = theme;
  }, [theme]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1E2328', border: '1px solid #2A2E33', color: '#fff' },
        }}
      />
      <Routes>
        {/* Landing — no Layout/Navbar */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* App pages — wrapped in Layout */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<MarketOverview />} />
          <Route path="/stock/:ticker" element={<StockDetail />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/history" element={<TradeHistory />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/backtest" element={<Backtest />} />
          <Route path="/sectors" element={<SectorHeatmap />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
