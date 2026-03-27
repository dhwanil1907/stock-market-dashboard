import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

const TICKERS = ['AAPL', 'TSLA', 'MSFT', 'AMZN', 'GOOGL', 'NVDA', 'META', 'JPM',
                  'NFLX', 'AMD', 'V', 'COIN', 'PLTR', 'XOM', 'SPY', 'QQQ'];

const INDICES = ['SPY', 'QQQ'];

const fmt    = (n: number) => n?.toFixed(2) ?? '--';
const fmtUSD = (n: number) => n != null ? `$${n.toFixed(2)}` : '--';
const fmtVol = (n: number) => n != null ? `${(n / 1_000_000).toFixed(1)}M` : '--';

const MarketOverview: React.FC = () => {
  const [quotes, setQuotes]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
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

  const indices = quotes.filter(q => INDICES.includes(q.symbol));
  const stocks  = quotes.filter(q => !INDICES.includes(q.symbol));
  const gainers = [...stocks].sort((a, b) => (b.change_percent ?? 0) - (a.change_percent ?? 0)).slice(0, 3);
  const losers  = [...stocks].sort((a, b) => (a.change_percent ?? 0) - (b.change_percent ?? 0)).slice(0, 3);

  return (
    <div>
      {/* Header */}
      <div className="t-page-header">
        <span className="t-section-title t-mb-0">MARKET_OVERVIEW</span>
        <div className="t-page-actions">
          {lastUpdated && (
            <span className="t-page-meta">UPD {lastUpdated.toLocaleTimeString()}</span>
          )}
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
      </div>

      {/* Index cards */}
      <div className="mo-indices">
        {INDICES.map(sym => {
          const q = indices.find(x => x.symbol === sym);
          const up = (q?.change_percent ?? 0) >= 0;
          return (
            <div key={sym} className="t-card mo-index-card">
              <div className="t-card-label">{sym}</div>
              {loading
                ? <div className="t-card-value"><span className="t-skeleton t-skeleton-md" /></div>
                : (
                  <>
                    <div className="t-card-value">{fmtUSD(q?.price)}</div>
                    <div className={`t-card-sub ${up ? 't-green' : 't-red'}`}>
                      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {up ? '+' : ''}{fmt(q?.change_percent)}%
                    </div>
                  </>
                )
              }
            </div>
          );
        })}
      </div>

      {/* Gainers / Losers */}
      {!loading && (
        <div className="mo-split">
          <div className="mo-split-card">
            <div className="t-card-label">▲ TOP GAINERS</div>
            {gainers.map(q => (
              <Link key={q.symbol} to={`/stock/${q.symbol}`} className="mo-mini-row">
                <span className="mo-mini-symbol">{q.symbol}</span>
                <span className="mo-mini-chg t-green">+{fmt(q.change_percent)}%</span>
              </Link>
            ))}
          </div>
          <div className="mo-split-card">
            <div className="t-card-label">▼ TOP LOSERS</div>
            {losers.map(q => (
              <Link key={q.symbol} to={`/stock/${q.symbol}`} className="mo-mini-row">
                <span className="mo-mini-symbol">{q.symbol}</span>
                <span className="mo-mini-chg t-red">{fmt(q.change_percent)}%</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Full stock table */}
      <div className="t-card-bare">
        <div className="mo-table-header">
          <span className="t-card-label t-mb-0">ALL TICKERS</span>
        </div>
        <div className="mo-table-wrap">
          <table className="t-table">
            <thead>
              <tr>
                <th>SYMBOL</th>
                <th>PRICE</th>
                <th>CHG%</th>
                <th>52W_HI</th>
                <th>52W_LO</th>
                <th>VOLUME</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array(12).fill(0).map((_, i) => (
                    <tr key={i}>
                      {Array(6).fill(0).map((_, j) => (
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
                            {q.company_name?.length > 20
                              ? q.company_name.slice(0, 20) + '…'
                              : q.company_name}
                          </span>
                        </td>
                        <td>{fmtUSD(q.price)}</td>
                        <td className={`${up ? 't-green' : 't-red'} t-fw7`}>
                          {up ? '+' : ''}{fmt(q.change_percent)}%
                        </td>
                        <td>{fmtUSD(q.week_52_high)}</td>
                        <td>{fmtUSD(q.week_52_low)}</td>
                        <td>{fmtVol(q.volume)}</td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;
