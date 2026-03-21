import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout/Layout';
import MarketOverview from './pages/MarketOverview';
import StockDetail from './pages/StockDetail';
import Portfolio from './pages/Portfolio';
import Watchlist from './pages/Watchlist';
import TradeHistory from './pages/TradeHistory';
import Alerts from './pages/Alerts';
import Backtest from './pages/Backtest';
import SectorHeatmap from './pages/SectorHeatmap';
import Login from './pages/Login';
import './index.css';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="dark">
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1E2328', border: '1px solid #2A2E33', color: '#fff' },
          }}
        />
        <Layout>
          <Routes>
            <Route path="/" element={<MarketOverview />} />
            <Route path="/stock/:ticker" element={<StockDetail />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/history" element={<TradeHistory />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/backtest" element={<Backtest />} />
            <Route path="/sectors" element={<SectorHeatmap />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </Layout>
      </div>
    </BrowserRouter>
  );
};

export default App;
