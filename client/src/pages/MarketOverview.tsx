import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { TrendingUp, TrendingDown, RefreshCw, Home } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { usePortfolioStore } from '../stores/portfolioStore';

const TICKERS = [
  'AAPL', 'TSLA', 'MSFT', 'AMZN', 'GOOGL', 'NVDA', 'META', 'JPM',
  'NFLX', 'AMD', 'V', 'COIN', 'PLTR', 'XOM', 'SPY', 'QQQ', 'IWM',
];

const INDICES = ['SPY', 'QQQ', 'IWM'];

const INDEX_NAMES: Record<string, string> = {
  SPY: 'S&P 500 ETF TRUST',
  QQQ: 'INVESCO QQQ TRUST',
  IWM: 'ISHARES RUSSELL 2000 ETF',
};

const fmt = (n: number) => (n?.toFixed(2) ?? '--');
const fmtUSD = (n: number) => (n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--');
const fmtVol = (n: number) => (n != null ? `${(n / 1_000_000).toFixed(1)}M` : '--');

function MiniSpark({ up }: { up: boolean }) {
  const d = up
    ? 'M0,28 L20,24 L36,18 L52,12 L72,6'
    : 'M0,8 L20,12 L36,18 L52,22 L72,28';
  return (
    <svg className={`mo-index-spark ${up ? 't-green' : 't-red'}`} viewBox="0 0 72 32" preserveAspectRatio="none">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

const MarketOverview: React.FC = () => {
  const { token } = useAuthStore();
  const { cashBalance, holdings, fetchPortfolio } = usePortfolioStore();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [hPrices, setHPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQuotes = async (showSpin = false) => {
    if (showSpin) setRefreshing(true);
    try {
      const results = await Promise.allSettled(
        TICKERS.map(ticker => api.get(`/stock/${ticker}/quote`).then(r => r.data))
      );
      const loaded = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value);
      setQuotes(loaded);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      if (showSpin) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchPortfolio(token);
  }, [token, fetchPortfolio]);

  const fetchHoldPrices = useCallback(async () => {
    if (!holdings.length) return;
    const entries = await Promise.allSettled(
      holdings.map(h => api.get(`/stock/${h.ticker}/quote`).then(r => ({ t: h.ticker, p: r.data.price })))
    );
    const p: Record<string, number> = {};
    entries.forEach(r => { if (r.status === 'fulfilled') p[r.value.t] = r.value.p; });
    setHPrices(p);
  }, [holdings]);

  useEffect(() => {
    fetchHoldPrices();
    const id = setInterval(fetchHoldPrices, 15000);
    return () => clearInterval(id);
  }, [fetchHoldPrices]);

  const portfolioMetrics = useMemo(() => {
    const mkt = holdings.reduce((s, h) => s + h.shares * (hPrices[h.ticker] ?? h.avg_cost), 0);
    const cost = holdings.reduce((s, h) => s + h.shares * h.avg_cost, 0);
    const total = cashBalance + mkt;
    const pl = mkt - cost;
    return { total, pl, mkt };
  }, [holdings, hPrices, cashBalance]);

  const indices = quotes.filter(q => INDICES.includes(q.symbol));
  const stocks = quotes.filter(q => !INDICES.includes(q.symbol));
  const gainers = [...stocks].sort((a, b) => (b.change_percent ?? 0) - (a.change_percent ?? 0)).slice(0, 3);
  const losers = [...stocks].sort((a, b) => (a.change_percent ?? 0) - (b.change_percent ?? 0)).slice(0, 3);

  const liveLine = lastUpdated
    ? `● LIVE FEED // UTC: ${lastUpdated.toISOString().slice(11, 19)}`
    : '● LIVE FEED // SYNCING…';

  return (
    <div>
      <div className="mo-page-head">
        <div>
          <h1 className="t-page-hero-title">MARKET</h1>
          <div className="t-live-line">{liveLine}</div>
        </div>
        <Link to="/" className="t-btn t-btn-ghost mo-home-btn" title="Landing page">
          <Home size={14} strokeWidth={1.5} />
          HOME
        </Link>
      </div>

      {token && (
        <div className="mo-portfolio-strip">
          <div className="mo-portfolio-strip-copy">
            <div className="t-card-label t-mb-0">YOUR PORTFOLIO</div>
            <div className="mo-portfolio-val">
              {loading ? '—' : fmtUSD(portfolioMetrics.total)}
            </div>
            <div className={`mo-portfolio-chg ${portfolioMetrics.pl >= 0 ? 't-green' : 't-red'}`}>
              {portfolioMetrics.pl >= 0 ? '▲ +' : '▼ '}
              {fmtUSD(Math.abs(portfolioMetrics.pl))} vs cost basis
            </div>
            <Link to="/portfolio" className="mo-portfolio-link">
              VIEW PORTFOLIO →
            </Link>
          </div>
          <button
            type="button"
            className="t-btn t-btn-ghost"
            onClick={() => fetchQuotes(true)}
            disabled={refreshing}
          >
            <RefreshCw size={10} className={refreshing ? 't-spin' : ''} />
            REFRESH
          </button>
        </div>
      )}

      <div className="mo-indices">
        {INDICES.map(sym => {
          const q = indices.find(x => x.symbol === sym);
          const up = (q?.change_percent ?? 0) >= 0;
          return (
            <div key={sym} className="t-card mo-index-card">
              <div className="mo-index-head">
                <span className="mo-index-name">{sym}</span>
                {loading ? (
                  <span className="t-skeleton t-skeleton-md" />
                ) : (
                  <span className={`${up ? 't-green' : 't-red'} t-fw7`}>
                    {up ? '+' : ''}{fmt(q?.change_percent)}%
                  </span>
                )}
              </div>
              <div className="mo-index-fullname">{INDEX_NAMES[sym] ?? 'ETF'}</div>
              <div className="mo-index-mid">
                <div className="t-card-value" style={{ fontSize: '1.35rem' }}>
                  {loading ? <span className="t-skeleton t-skeleton-md" /> : fmtUSD(q?.price)}
                </div>
                {!loading && q && <MiniSpark up={up} />}
              </div>
            </div>
          );
        })}
      </div>

      {!loading && (
        <div className="mo-split">
          <div className="mo-split-card">
            <div className="t-card-label">TOP_GAINERS</div>
            {gainers.map(q => (
              <Link key={q.symbol} to={`/stock/${q.symbol}`} className="mo-mini-row mo-mini-row--gainer">
                <span className="mo-mini-symbol">{q.symbol}</span>
                <span className="mo-mini-chg t-green">+{fmt(q.change_percent)}%</span>
              </Link>
            ))}
          </div>
          <div className="mo-split-card">
            <div className="t-card-label">TOP_LOSERS</div>
            {losers.map(q => (
              <Link key={q.symbol} to={`/stock/${q.symbol}`} className="mo-mini-row mo-mini-row--loser">
                <span className="mo-mini-symbol">{q.symbol}</span>
                <span className="mo-mini-chg t-red">{fmt(q.change_percent)}%</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="t-card-bare">
        <div className="mo-table-header">
          <span className="t-card-label t-mb-0">ALL TICKERS</span>
          <div className="mo-table-actions">
            <button type="button" className="t-btn t-btn-ghost">FILTER</button>
            <button type="button" className="t-btn t-btn-ghost">EXPORT</button>
          </div>
        </div>
        <div className="mo-table-wrap">
          <table className="t-table">
            <thead>
              <tr>
                <th>TICKER</th>
                <th>PRICE</th>
                <th>CHANGE</th>
                <th title="Shares traded in the current trading day">DAY VOLUME</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array(10).fill(0).map((_, i) => (
                    <tr key={i}>
                      {Array(5).fill(0).map((_, j) => (
                        <td key={j}><span className="t-skeleton t-skeleton-sm" /></td>
                      ))}
                    </tr>
                  ))
                : stocks.map(q => {
                    const up = (q.change_percent ?? 0) >= 0;
                    return (
                      <tr key={q.symbol}>
                  <td>
                    <Link to={`/stock/${q.symbol}`} className="mo-sym-link">{q.symbol}</Link>
                    <span className="mo-company">
                      {q.company_name?.length > 22
                        ? `${q.company_name.slice(0, 22)}…`
                        : q.company_name}
                    </span>
                  </td>
                  <td>{fmtUSD(q.price)}</td>
                  <td className={`${up ? 't-green' : 't-red'} t-fw7`}>
                    {up ? '+' : ''}{fmt(q.change_percent)}%
                  </td>
                  <td>{fmtVol(q.volume)}</td>
                  <td>
                    <Link to={`/stock/${q.symbol}`} className="t-btn t-btn-outline" style={{ padding: '6px 12px', fontSize: '9px' }}>
                      TRADE
                    </Link>
                  </td>
                    </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;
