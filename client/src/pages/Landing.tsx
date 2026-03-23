import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import './landing.css';

const TICKERS = [
  'TSLA','AAPL','NVDA','MSFT','GOOGL','AMZN','META','SPY',
  'JPM','BRK-B','V','UNH','XOM','JNJ','WMT','NFLX','AMD','COIN','PLTR','UBER',
];

interface Quote { symbol: string; price: number; change_percent: number; }

function useTickerPrices(): Quote[] {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/stock/quotes/batch?symbols=${TICKERS.join(',')}`);
        setQuotes(res.data.map((q: any) => ({
          symbol: String(q.symbol),
          price: Number(q.price) || 0,
          change_percent: isFinite(Number(q.change_percent)) ? Number(q.change_percent) : 0,
        })));
      } catch { /* keep previous */ }
    };
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  return quotes;
}

const CANDLES: [number, number, string][] = [
  [30,185,'#10B981'],[60,170,'#10B981'],[90,155,'#EF4444'],[120,145,'#10B981'],[150,125,'#10B981'],
  [180,118,'#EF4444'],[210,108,'#10B981'],[240,98,'#10B981'],[270,88,'#EF4444'],[300,78,'#10B981'],
  [330,68,'#10B981'],[360,75,'#EF4444'],[390,65,'#10B981'],[420,55,'#10B981'],[450,62,'#EF4444'],
  [480,50,'#10B981'],[510,58,'#EF4444'],[540,46,'#10B981'],[570,38,'#10B981'],[600,44,'#EF4444'],
  [630,35,'#10B981'],[660,42,'#10B981'],[690,32,'#10B981'],[720,38,'#EF4444'],[750,28,'#10B981'],
];

const FEATURES = [
  { title: 'ML Predictions',  body: '60-day price direction forecasts powered by LSTM neural networks trained on real TSLA data. F1 score of 0.77 — not a toy model.' },
  { title: 'Paper Trading',   body: 'Trade with $100K virtual capital. No risk, real market data, real execution logic. Build confidence before you go live.' },
  { title: 'Backtesting',     body: 'Test your strategies against years of historical data. See CAGR, Sharpe ratio, and max drawdown before risking a single dollar.' },
  { title: 'Price Alerts',    body: 'Set custom price alerts for any ticker. Get notified the moment a stock hits your target — never miss a move.' },
];



const Landing: React.FC = () => {
  const quotes = useTickerPrices();
  const tickerData = quotes.length > 0 ? quotes : TICKERS.map(s => ({ symbol: s, price: 0, change_percent: 0 }));
  const doubled = [...tickerData, ...tickerData];

  const tsla = quotes.find(q => q.symbol === 'TSLA');

  return (
    <div className="tr-root">

      {/* Navbar */}
      <nav className="tr-nav">
        <span className="tr-nav-logo">TradeRookie</span>
        <div className="tr-nav-links">
          <a href="#features" className="tr-nav-link">Terminal</a>
          <a href="#how"      className="tr-nav-link">Markets</a>
          <a href="#cta"      className="tr-nav-link">Pricing</a>
        </div>
        <div className="tr-nav-actions">
          <Link to="/login" className="tr-nav-link">Log In</Link>
          <Link to="/login" className="tr-btn-primary">Start Trading</Link>
        </div>
      </nav>

      {/* Ticker Strip */}
      <div className="tr-ticker-strip">
        <div className="tr-ticker-live">
          <span className="tr-badge-dot" /> LIVE
        </div>
        <div className="tr-ticker-overflow">
          <div className="tr-ticker-scroll">
            {doubled.map((q, i) => {
              const up = q.change_percent >= 0;
              const price = q.price > 0 ? `$${q.price.toFixed(2)}` : '—';
              const pct   = q.price > 0 ? `${up ? '▲' : '▼'} ${Math.abs(q.change_percent).toFixed(2)}%` : '';
              return (
                <div key={i} className="tr-ticker-item">
                  <span className="tr-ticker-symbol">{q.symbol}</span>
                  <span className="tr-ticker-price">{price}</span>
                  {pct && <span className={up ? 'tr-ticker-up' : 'tr-ticker-down'}>{pct}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="tr-hero">
        <h1 className="tr-hero-h1">
          Trade Smarter.<br />
          Start <span className="tr-accent">For Free.</span>
        </h1>
        <p className="tr-hero-sub">
          An ML-powered trading platform built for the next generation of investors.
          Paper trade, backtest, and grow.
        </p>
        <div className="tr-hero-ctas">
          <Link to="/login" className="tr-btn-primary">Launch Terminal</Link>
          <a href="#how" className="tr-btn-ghost">View How It Works &nbsp;→</a>
        </div>
      </section>

      {/* Chart Visual */}
      <div className="tr-chart-section">
        <div className="tr-chart-container">
          <div className="tr-chart-topbar">
            <span><span className="tr-chart-ticker">TSLA</span> &nbsp;·&nbsp; 1D</span>
            <span className="tr-chart-price">{tsla ? `$${tsla.price.toFixed(2)}` : '$—'}</span>
            <span className="tr-chart-change">
              {tsla ? `${tsla.change_percent >= 0 ? '▲' : '▼'} ${Math.abs(tsla.change_percent).toFixed(2)}%` : '—'}
            </span>
            <span>ML Signal: <span className="tr-chart-signal">LONG ↑</span></span>
          </div>
          <div className="tr-chart-body">
            <svg viewBox="0 0 780 280" preserveAspectRatio="none" className="tr-chart-svg">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
              <line x1="0" y1="70"  x2="780" y2="70"  stroke="#1E2328" strokeWidth="1"/>
              <line x1="0" y1="140" x2="780" y2="140" stroke="#1E2328" strokeWidth="1"/>
              <line x1="0" y1="210" x2="780" y2="210" stroke="#1E2328" strokeWidth="1"/>
              <path d="M0,200 C60,180 100,160 140,140 C180,120 200,130 240,110 C280,90 310,100 350,80 C390,60 420,90 460,70 C500,50 530,80 570,60 C610,40 650,70 700,50 C730,38 760,44 780,40 L780,280 L0,280 Z"
                fill="url(#areaGrad)" opacity="0.25"/>
              <path d="M0,200 C60,180 100,160 140,140 C180,120 200,130 240,110 C280,90 310,100 350,80 C390,60 420,90 460,70 C500,50 530,80 570,60 C610,40 650,70 700,50 C730,38 760,44 780,40"
                fill="none" stroke="#10B981" strokeWidth="2"/>
              {CANDLES.map(([x, y, color]) => (
                <rect key={x} x={x} y={y} width={8} height={20} fill={color} opacity={0.8} />
              ))}
            </svg>
            <div className="tr-chart-fade" />
          </div>
        </div>
      </div>

      {/* Features */}
      <section id="features" className="tr-features">
        <div className="tr-features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="tr-feature-card">
              <h3 className="tr-feature-title">{f.title}</h3>
              <p className="tr-feature-body">{f.body}</p>
            </div>
          ))}
        </div>
      </section>


      {/* Risk-Free Pitch */}
      <section className="tr-riskfree">
        <div className="tr-section-label">Zero Risk</div>
        <h2 className="tr-riskfree-h2">
          No Real Money.<br />
          <span className="tr-accent">Ever.</span>
        </h2>
        <p className="tr-riskfree-sub">
          TradeRookie is a pure learning environment. There is no way to deposit,
          lose, or risk real money — by design.
        </p>
        <div className="tr-riskfree-grid">
          {[
            { icon: '🔒', title: 'No Deposits', body: 'You never connect a bank account or enter payment info. $100K virtual cash is credited instantly on signup.' },
            { icon: '📉', title: 'Losses Stay Virtual', body: 'Bad trade? You learn from it. Close the position, review what happened, and start fresh. No real consequences.' },
            { icon: '🧠', title: 'Learn Before You Burn', body: 'Practice ML-powered strategies, run backtests, and build conviction before you ever touch a real brokerage.' },
            { icon: '🎯', title: 'Built for Beginners', body: 'No jargon walls. No overwhelming options chains. Just a clean terminal for learning the fundamentals that matter.' },
          ].map(c => (
            <div key={c.title} className="tr-riskfree-card">
              <div className="tr-riskfree-icon">{c.icon}</div>
              <h4>{c.title}</h4>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="tr-compare">
        <div className="tr-compare-header">
          <div className="tr-section-label">How We Stack Up</div>
          <h2 className="tr-compare-h2">Honest Comparison</h2>
          <p className="tr-compare-sub">We only highlighted things that are genuinely true about each platform.</p>
        </div>
        <table className="tr-compare-table">
          <thead>
            <tr>
              <th className="tr-col-feature">Feature</th>
              <th className="tr-col-us">TradeRookie</th>
              <th>Robinhood</th>
              <th>Webull</th>
              <th>ThinkorSwim</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                feature: 'Paper Trading',
                us: '✓ Full',
                rh: '⚠ Options only',
                wb: '✓ Full ($1M virtual)',
                tos: '✓ Full ($100K virtual)',
              },
              {
                feature: 'ML Price Predictions',
                us: '✓ LSTM model, F1 = 0.77',
                rh: '✗ None',
                wb: '⚠ AI market insights (not forecasts)',
                tos: '✗ None',
              },
              {
                feature: 'Strategy Backtesting',
                us: '✓ Built-in',
                rh: '✗ None',
                wb: '⚠ Added via 3rd party (2026)',
                tos: '✓ Advanced (thinkBack, OnDemand)',
              },
              {
                feature: 'Price Alerts',
                us: '✓',
                rh: '✓',
                wb: '✓',
                tos: '✓',
              },
              {
                feature: 'Free to Use',
                us: '✓ Always',
                rh: '✓ Commission-free',
                wb: '✓ Commission-free',
                tos: '✓ Free platform',
              },
              {
                feature: 'Real Money Required',
                us: '✗ Never',
                rh: '⚠ To trade live',
                wb: '⚠ To trade live',
                tos: '⚠ To trade live',
              },
              {
                feature: 'Educational Focus',
                us: '✓ Primary purpose',
                rh: '⚠ Secondary (Learn hub)',
                wb: '⚠ Secondary (library)',
                tos: '⚠ Secondary (200+ videos)',
              },
            ].map(row => (
              <tr key={row.feature}>
                <td className="tr-col-feature">{row.feature}</td>
                <td className="tr-col-us">
                  <span className={row.us.startsWith('✓') ? 'tr-check' : row.us.startsWith('✗') ? 'tr-cross' : 'tr-partial'}>
                    {row.us}
                  </span>
                </td>
                <td>
                  <span className={row.rh.startsWith('✓') ? 'tr-check' : row.rh.startsWith('✗') ? 'tr-cross' : 'tr-partial'}>
                    {row.rh}
                  </span>
                </td>
                <td>
                  <span className={row.wb.startsWith('✓') ? 'tr-check' : row.wb.startsWith('✗') ? 'tr-cross' : 'tr-partial'}>
                    {row.wb}
                  </span>
                </td>
                <td>
                  <span className={row.tos.startsWith('✓') ? 'tr-check' : row.tos.startsWith('✗') ? 'tr-cross' : 'tr-partial'}>
                    {row.tos}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="tr-compare-note">
          ✓ = Available &nbsp;·&nbsp; ✗ = Not available &nbsp;·&nbsp; ⚠ = Partial or limited &nbsp;·&nbsp;
          Data based on publicly available platform information as of early 2026.
          Robinhood paper trading limited to options simulation only.
          Webull backtesting added via Level2 partnership Jan 2026.
        </p>
      </section>

      {/* CTA */}
      <section id="cta" className="tr-cta">
        <h2 className="tr-cta-h2">
          Ready to Start Your<br />
          <span className="tr-accent">Trading Journey?</span>
        </h2>
        <Link to="/login" className="tr-btn-outline">Create Free Account</Link>
      </section>

      {/* Footer */}
      <footer className="tr-footer">
        <span>© {new Date().getFullYear()} TradeRookie · All rights reserved</span>
        <div className="tr-footer-links">
          <a href="#">Legal</a>
          <a href="#">Privacy</a>
          <a href="#">API</a>
        </div>
        <span className="tr-footer-live">
          <span className="tr-badge-dot" /> Live Feed
        </span>
      </footer>

    </div>
  );
};

export default Landing;
