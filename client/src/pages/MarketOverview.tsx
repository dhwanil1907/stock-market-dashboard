import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { RefreshCw } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { usePortfolioStore } from '../stores/portfolioStore';
import { formatPrice, formatVolume } from '../lib/format';
import { ChangeBadge } from '../components/ui/ChangeBadge';
import { StatCard } from '../components/ui/StatCard';
import { DataTable } from '../components/ui/DataTable';

const TICKERS = [
  'AAPL', 'TSLA', 'MSFT', 'AMZN', 'GOOGL', 'NVDA', 'META', 'JPM',
  'NFLX', 'AMD', 'V', 'COIN', 'PLTR', 'XOM', 'SPY', 'QQQ', 'IWM',
];

const INDICES = ['SPY', 'QQQ', 'IWM'];

const INDEX_NAMES: Record<string, string> = {
  SPY: 'S&P 500',
  QQQ: 'Nasdaq 100',
  IWM: 'Russell 2000',
};

function MiniSpark({ up }: { up: boolean }) {
  const d = up
    ? 'M0,28 L20,24 L36,18 L52,12 L72,6'
    : 'M0,8 L20,12 L36,18 L52,22 L72,28';
  return (
    <svg className={`mo-index-spark ${up ? 't-green' : 't-red'}`} viewBox="0 0 72 32" preserveAspectRatio="none" aria-hidden>
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
        TICKERS.map(ticker => api.get(`/stock/${ticker}/quote`).then(r => r.data)),
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
      holdings.map(h => api.get(`/stock/${h.ticker}/quote`).then(r => ({ t: h.ticker, p: r.data.price }))),
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
    const plPct = cost > 0 ? (pl / cost) * 100 : 0;
    return { total, pl, plPct, mkt };
  }, [holdings, hPrices, cashBalance]);

  const indices = quotes.filter(q => INDICES.includes(q.symbol));
  const stocks = quotes.filter(q => !INDICES.includes(q.symbol));
  const gainers = [...stocks].sort((a, b) => (b.change_percent ?? 0) - (a.change_percent ?? 0)).slice(0, 3);
  const losers = [...stocks].sort((a, b) => (a.change_percent ?? 0) - (b.change_percent ?? 0)).slice(0, 3);

  const liveMeta = lastUpdated
    ? `Live · updated ${lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    : 'Syncing quotes…';

  return (
    <div className="mo-page">
      <div className="mo-toolbar">
        <p className="mo-live-meta"><span className="t-dot-live" aria-hidden /> {liveMeta}</p>
        <button
          type="button"
          className="t-btn t-btn-ghost"
          onClick={() => fetchQuotes(true)}
          disabled={refreshing}
        >
          <RefreshCw size={14} className={refreshing ? 't-spin' : ''} />
          Refresh
        </button>
      </div>

      {token && (
        <StatCard
          label="Your portfolio"
          value={loading ? '—' : formatPrice(portfolioMetrics.total)}
          sub={(
            <>
              <ChangeBadge value={portfolioMetrics.plPct} decimals={2} />
              <span className="mo-portfolio-sub"> vs cost basis ({formatPrice(Math.abs(portfolioMetrics.pl))})</span>
            </>
          )}
          className="mo-portfolio-stat"
        />
      )}

      {token && (
        <Link to="/portfolio" className="mo-portfolio-link-inline">View full portfolio</Link>
      )}

      <section aria-label="Major indices">
        <h2 className="ui-section-label">Indices</h2>
        <div className="mo-indices">
          {INDICES.map(sym => {
            const q = indices.find(x => x.symbol === sym);
            const up = (q?.change_percent ?? 0) >= 0;
            return (
              <div key={sym} className="mo-index-card">
                <div className="mo-index-head">
                  <span className="mo-index-name">{sym}</span>
                  {!loading && q != null && (
                    <ChangeBadge value={q.change_percent} decimals={2} />
                  )}
                  {loading && <span className="t-skeleton t-skeleton-md" />}
                </div>
                <div className="mo-index-fullname">{INDEX_NAMES[sym] ?? 'ETF'}</div>
                <div className="mo-index-mid">
                  <div className="mo-index-price t-num">
                    {loading ? <span className="t-skeleton t-skeleton-md" /> : formatPrice(q?.price)}
                  </div>
                  {!loading && q && <MiniSpark up={up} />}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {!loading && (
        <div className="mo-split">
          <div className="mo-split-card">
            <h2 className="ui-section-label">Top gainers</h2>
            {gainers.map(q => (
              <Link key={q.symbol} to={`/stock/${q.symbol}`} className="mo-mini-row mo-mini-row--gainer">
                <span className="mo-mini-symbol">{q.symbol}</span>
                <ChangeBadge value={q.change_percent} decimals={2} />
              </Link>
            ))}
          </div>
          <div className="mo-split-card">
            <h2 className="ui-section-label">Top losers</h2>
            {losers.map(q => (
              <Link key={q.symbol} to={`/stock/${q.symbol}`} className="mo-mini-row mo-mini-row--loser">
                <span className="mo-mini-symbol">{q.symbol}</span>
                <ChangeBadge value={q.change_percent} decimals={2} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <section aria-label="All tickers">
        <DataTable bare className="mo-table-card">
          <div className="mo-table-header">
            <h2 className="ui-section-label t-mb-0">All tickers</h2>
          </div>
          <table className="t-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Price</th>
                <th>Change</th>
                <th title="Shares traded today">Day volume</th>
                <th>Action</th>
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
                : stocks.map(q => (
                    <tr key={q.symbol}>
                      <td>
                        <Link to={`/stock/${q.symbol}`} className="mo-sym-link">{q.symbol}</Link>
                        <span className="mo-company">
                          {q.company_name?.length > 22
                            ? `${q.company_name.slice(0, 22)}…`
                            : q.company_name}
                        </span>
                      </td>
                      <td className="t-num">{formatPrice(q.price)}</td>
                      <td><ChangeBadge value={q.change_percent} decimals={2} /></td>
                      <td className="t-num t-muted">{formatVolume(q.volume)}</td>
                      <td>
                        <Link to={`/stock/${q.symbol}`} className="t-btn t-btn-outline mo-trade-btn">
                          Trade
                        </Link>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </DataTable>
      </section>
    </div>
  );
};

export default MarketOverview;
