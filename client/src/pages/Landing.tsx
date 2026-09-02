import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import './landing.css';

const TICKERS = [
  'TSLA', 'AAPL', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'SPY',
  'JPM', 'BRK-B', 'V', 'UNH', 'XOM', 'JNJ', 'WMT', 'NFLX', 'AMD', 'COIN', 'PLTR', 'UBER',
];

interface Quote { symbol: string; price: number; change_percent: number; }
interface HistoryPoint { date: string; close: number; }

function isMarketOpen(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const minutes = et.getHours() * 60 + et.getMinutes();
  return minutes >= 570 && minutes < 960;
}

function useTickerPrices(): Quote[] {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/stock/quotes/batch?symbols=${TICKERS.join(',')}`);
        setQuotes(res.data.map((q: Quote) => ({
          symbol: String(q.symbol),
          price: Number(q.price) || 0,
          change_percent: isFinite(Number(q.change_percent)) ? Number(q.change_percent) : 0,
        })));
      } catch { /* keep previous */ }
    };
    load();
    if (!isMarketOpen()) return;
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);
  return quotes;
}

const PREVIEW_PERIODS = [
  { api: '5d' as const, label: '1W' },
  { api: '1mo' as const, label: '1M' },
  { api: '3mo' as const, label: '3M' },
];

function useLiveChart(ticker: string, period: string) {
  const [quote, setQuote] = useState<any>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  useEffect(() => {
    Promise.all([
      api.get(`/stock/${ticker}/quote`).then(r => r.data),
      api.get(`/stock/${ticker}/history?period=${period}`).then(r => r.data),
    ]).then(([q, h]) => {
      setQuote(q);
      setHistory(Array.isArray(h) ? h : []);
    }).catch(() => {});
  }, [ticker, period]);
  return { quote, history };
}

type ChartPoint = { x: number; y: number; date: string; close: number };

function buildPath(
  history: HistoryPoint[],
  w: number,
  h: number,
): { line: string; area: string; points: ChartPoint[] } {
  if (history.length < 2) return { line: '', area: '', points: [] };
  const prices = history.map(p => p.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pad = 6;
  const points = history.map((pt, i) => {
    const p = pt.close;
    return {
      x: pad + (i / (history.length - 1)) * (w - pad * 2),
      y: pad + (1 - (p - min) / range) * (h - pad * 2 - 4),
      date: pt.date,
      close: pt.close,
    };
  });
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1].x.toFixed(1)},${h} L${points[0].x.toFixed(1)},${h} Z`;
  return { line, area, points };
}

function formatChartDate(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const FEATURES = [
  {
    num: '01',
    title: 'Paper Trading',
    desc: 'Execute simulated buys and sells with $100K in virtual capital. Real fills, real prices, zero financial risk.',
  },
  {
    num: '02',
    title: 'AI Predictions',
    desc: 'ML ensemble models forecast 30-day price direction with confidence scores. Powered by historical OHLCV data.',
  },
  {
    num: '03',
    title: 'Strategy Backtesting',
    desc: 'Test SMA crossover, RSI, and MACD strategies against up to 5 years of real historical price data.',
  },
  {
    num: '04',
    title: 'Market Intel',
    desc: 'Ticker-filtered news feed from live financial sources. Stay ahead of what\'s moving the market.',
  },
  {
    num: '05',
    title: 'Price Alerts',
    desc: 'Set price thresholds on any ticker. Get notified the moment a stock crosses your target.',
  },
  {
    num: '06',
    title: 'Sector Heatmap',
    desc: 'Visualize sector leadership and lagging areas with live daily and monthly return data.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Is this completely free?',
    a: 'Yes. StockSage is 100% free — no credit card, no subscription, no real money required at any point.',
  },
  {
    q: 'How accurate is the market data?',
    a: "Prices come from live market feeds with a short delay typical of free data tiers. They closely mirror what you'd see on a real broker.",
  },
  {
    q: 'Can I lose real money here?',
    a: 'No. Every trade uses virtual cash. Nothing you do on StockSage affects your real finances.',
  },
  {
    q: 'What are the AI predictions based on?',
    a: "Models are trained on historical price and volume data using statistical and ML methods. They're research tools — not financial advice.",
  },
  {
    q: 'Do I need prior trading experience?',
    a: "None. That's the point — StockSage is designed as a safe space to learn how markets work before you ever risk real money.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`ln-faq-item${open ? ' ln-faq-item--open' : ''}`}>
      <button className="ln-faq-q" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>{q}</span>
        <span className="ln-faq-chevron" aria-hidden>{open ? '−' : '+'}</span>
      </button>
      {open && <p className="ln-faq-a">{a}</p>}
    </div>
  );
}

const Landing: React.FC = () => {
  const quotes = useTickerPrices();
  const tickerData = quotes.length > 0 ? quotes : TICKERS.map(s => ({ symbol: s, price: 0, change_percent: 0 }));
  const doubled = [...tickerData, ...tickerData];
  const [previewPeriod, setPreviewPeriod] = useState<(typeof PREVIEW_PERIODS)[number]['api']>('1mo');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const { quote: aaplQuote, history: aaplHistory } = useLiveChart('AAPL', previewPeriod);
  const chartGeo = useMemo(() => buildPath(aaplHistory, 800, 160), [aaplHistory]);
  const { line: aaplLine, area: aaplArea, points: chartPoints } = chartGeo;
  const chartUp = aaplQuote ? aaplQuote.change_percent >= 0 : true;
  const strokeCol = chartUp ? '#10b981' : '#ff7070';
  const gradId = `ln-area-${previewPeriod}-${chartUp ? 'u' : 'd'}`;

  useEffect(() => {
    setHoverIdx(null);
  }, [previewPeriod, aaplHistory]);

  const updateHoverFromClient = useCallback(
    (svg: SVGSVGElement, clientX: number, clientY: number) => {
      if (chartPoints.length < 2) return;
      const p = svg.createSVGPoint();
      p.x = clientX;
      p.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      let loc: DOMPoint;
      try {
        loc = p.matrixTransform(ctm.inverse());
      } catch {
        return;
      }
      const xm = loc.x;
      const pad = 6;
      const w = 800;
      const inner = w - pad * 2;
      const t = (xm - pad) / inner;
      const idx = Math.round(Math.max(0, Math.min(1, t)) * (chartPoints.length - 1));
      setHoverIdx(idx);
    },
    [chartPoints],
  );

  const onChartMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      updateHoverFromClient(e.currentTarget, e.clientX, e.clientY);
    },
    [updateHoverFromClient],
  );

  const onChartTouch = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      const t = e.touches[0];
      if (!t) return;
      updateHoverFromClient(e.currentTarget, t.clientX, t.clientY);
    },
    [updateHoverFromClient],
  );

  const hoverPt = hoverIdx != null && chartPoints[hoverIdx] ? chartPoints[hoverIdx] : null;

  return (
    <div className="ln-root">

      {/* ── NAV ── */}
      <nav className="ln-nav" aria-label="Main">
        <span className="ln-nav-logo">STOCKSAGE</span>
        <div className="ln-nav-links">
          <a href="#features" className="ln-nav-link">Features</a>
          <a href="#how" className="ln-nav-link">How it works</a>
          <a href="#pricing" className="ln-nav-link">Pricing</a>
        </div>
        <div className="ln-nav-actions">
          <Link to="/login" className="ln-nav-link">Log in</Link>
          <Link to="/login" className="ln-btn-primary ln-btn-sm">Sign up free</Link>
        </div>
      </nav>

      {/* ── TICKER STRIP ── */}
      <div className="ln-ticker-strip" aria-hidden>
        <div className="ln-ticker-label">
          <span className="ln-badge-dot" /> LIVE
        </div>
        <div className="ln-ticker-overflow">
          <div className="ln-ticker-scroll">
            {doubled.map((q, i) => {
              const up = q.change_percent >= 0;
              const price = q.price > 0 ? `$${q.price.toFixed(2)}` : '—';
              const pct = q.price > 0 ? `${up ? '▲' : '▼'} ${Math.abs(q.change_percent).toFixed(2)}%` : '';
              return (
                <div key={`${q.symbol}-${i}`} className="ln-ticker-item">
                  <span className="ln-ticker-sym">{q.symbol}</span>
                  <span className="ln-ticker-px">{price}</span>
                  {pct && <span className={up ? 'ln-ticker-up' : 'ln-ticker-dn'}>{pct}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <main>

        {/* ── HERO ── */}
        <section className="ln-hero">
          <div className="ln-hero-inner">
            <p className="ln-eyebrow ln-anim ln-anim--1">PAPER TRADING · AI PREDICTIONS · REAL DATA</p>
            <h1 className="ln-hero-h1 ln-anim ln-anim--2">
              Your trading edge,<br />before you go live.
            </h1>
            <p className="ln-hero-sub ln-anim ln-anim--3">
              Practice with $100K in simulated capital. ML-powered price forecasts.
              Backtest any strategy against real historical data. Zero risk.
            </p>
            <div className="ln-hero-ctas ln-anim ln-anim--4">
              <Link to="/login" className="ln-btn-primary ln-btn-hero">Create free account</Link>
              <Link to="/login" className="ln-btn-outline ln-btn-hero">Try demo →</Link>
            </div>
            <p className="ln-hero-note ln-anim ln-anim--4">No credit card. No real money. Ever.</p>
            <div className="ln-hero-stats ln-anim ln-anim--5">
              <div className="ln-hero-stat">
                <span className="ln-hero-stat-val">$100K</span>
                <span className="ln-hero-stat-lbl">Starting capital</span>
              </div>
              <div className="ln-hero-stat-div" />
              <div className="ln-hero-stat">
                <span className="ln-hero-stat-val">20+</span>
                <span className="ln-hero-stat-lbl">Tickers tracked</span>
              </div>
              <div className="ln-hero-stat-div" />
              <div className="ln-hero-stat">
                <span className="ln-hero-stat-val">3</span>
                <span className="ln-hero-stat-lbl">Backtest strategies</span>
              </div>
              <div className="ln-hero-stat-div" />
              <div className="ln-hero-stat">
                <span className="ln-hero-stat-val">Free</span>
                <span className="ln-hero-stat-lbl">To start</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="ln-features">
          <div className="ln-section-inner">
            <p className="ln-eyebrow">WHAT YOU GET</p>
            <h2 className="ln-section-h2">Everything you need<br />to trade with confidence.</h2>
            <div className="ln-feat-grid">
              {FEATURES.map(f => (
                <div key={f.num} className="ln-feat-card">
                  <span className="ln-feat-num">{f.num}</span>
                  <h3 className="ln-feat-title">{f.title}</h3>
                  <p className="ln-feat-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how" className="ln-how">
          <div className="ln-section-inner">
            <p className="ln-eyebrow">HOW IT WORKS</p>
            <h2 className="ln-section-h2">Up and running<br />in minutes.</h2>
            <div className="ln-steps">
              {[
                { n: '01', title: 'Create a free account', desc: 'Sign up in seconds or jump straight in with the demo account. No credit card needed.' },
                { n: '02', title: 'Explore the market', desc: 'Browse live quotes, check AI predictions, build your watchlist, and set price alerts.' },
                { n: '03', title: 'Trade and improve', desc: 'Execute paper trades, backtest strategies, and measure your performance over time.' },
              ].map(s => (
                <div key={s.n} className="ln-step">
                  <div className="ln-step-bg-num">{s.n}</div>
                  <div className="ln-step-content">
                    <div className="ln-step-num">{s.n}</div>
                    <h3 className="ln-step-title">{s.title}</h3>
                    <p className="ln-step-desc">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── LIVE PREVIEW ── */}
        <section className="ln-preview">
          <div className="ln-section-inner">
            <p className="ln-eyebrow ln-eyebrow--light">LIVE DATA</p>
            <h2 className="ln-section-h2 ln-section-h2--light">Real prices.<br />Right now.</h2>
            <p className="ln-preview-sub">The same data feed powering your portfolio — live from Yahoo Finance &amp; Finnhub.</p>
            <div className="ln-chart-shell">
              <Link to="/stock/AAPL" className="ln-chart-header ln-chart-header--link">
                <div>
                  <div className="ln-chart-ticker">
                    AAPL
                    {aaplQuote && (
                      <span className="ln-chart-name"> · {aaplQuote.company_name || 'Apple Inc.'}</span>
                    )}
                  </div>
                  <div className={`ln-chart-change ${chartUp ? 'ln-chart-change--up' : 'ln-chart-change--dn'}`}>
                    {aaplQuote
                      ? `${chartUp ? '▲' : '▼'} ${Math.abs(aaplQuote.change_percent).toFixed(2)}% TODAY`
                      : 'LOADING…'}
                  </div>
                </div>
                <div className={`ln-chart-price ${chartUp ? 'ln-chart-price--up' : 'ln-chart-price--dn'}`}>
                  {aaplQuote ? `$${aaplQuote.price.toFixed(2)}` : '—'}
                </div>
              </Link>
              <div
                className="ln-chart-body"
                role="group"
                aria-label="Apple stock price preview — drag or hover on the chart for date and close"
              >
                {aaplLine ? (
                  <>
                    <svg
                      viewBox="0 0 800 160"
                      preserveAspectRatio="none"
                      className="ln-chart-svg ln-chart-svg--interactive"
                      onMouseMove={onChartMouseMove}
                      onMouseLeave={() => setHoverIdx(null)}
                      onTouchMove={onChartTouch}
                      onTouchEnd={() => setHoverIdx(null)}
                      role="img"
                      aria-label="AAPL closing prices over the selected range"
                    >
                      <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={strokeCol} stopOpacity="0.25" />
                          <stop offset="100%" stopColor={strokeCol} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={aaplArea} fill={`url(#${gradId})`} />
                      <path d={aaplLine} fill="none" stroke={strokeCol} strokeWidth="2.5" />
                      {hoverPt && (
                        <g className="ln-chart-crosshair" pointerEvents="none">
                          <line
                            x1={hoverPt.x}
                            y1={0}
                            x2={hoverPt.x}
                            y2={160}
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="1"
                          />
                          <circle cx={hoverPt.x} cy={hoverPt.y} r="5" fill={strokeCol} stroke="#000" strokeWidth="1.5" />
                        </g>
                      )}
                    </svg>
                    {hoverPt && (
                      <div
                        className="ln-chart-tooltip"
                        style={{ left: `${(hoverPt.x / 800) * 100}%` }}
                      >
                        <span className="ln-chart-tooltip-date">{formatChartDate(hoverPt.date)}</span>
                        <span className="ln-chart-tooltip-price">${hoverPt.close.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="ln-chart-placeholder">LOADING CHART DATA…</div>
                )}
              </div>
              <div className="ln-chart-footer">
                <Link to="/stock/AAPL" className="ln-chart-ai-badge ln-chart-ai-badge--link">
                  🧠 AI MODEL · 30-DAY FORECAST ON STOCK DETAIL →
                </Link>
                <div className="ln-chart-period-btns" role="group" aria-label="Chart range">
                  {PREVIEW_PERIODS.map(({ api, label }) => (
                    <button
                      key={api}
                      type="button"
                      className={`ln-chart-period-btn${previewPeriod === api ? ' ln-chart-period-btn--on' : ''}`}
                      onClick={() => setPreviewPeriod(api)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" className="ln-pricing">
          <div className="ln-section-inner">
            <p className="ln-eyebrow">PRICING</p>
            <h2 className="ln-section-h2">Simple, transparent pricing.</h2>
            <div className="ln-price-grid">
              <div className="ln-price-card">
                <div className="ln-price-tier">FREE</div>
                <div className="ln-price-amount">$0</div>
                <div className="ln-price-period">forever</div>
                <ul className="ln-price-features">
                  <li>$100K paper trading capital</li>
                  <li>Live market quotes</li>
                  <li>Watchlist &amp; price alerts</li>
                  <li>Sector heatmap</li>
                  <li>Trade history &amp; CSV export</li>
                </ul>
                <Link to="/login" className="ln-price-cta">Get started</Link>
              </div>
              <div className="ln-price-card ln-price-card--featured">
                <div className="ln-price-tier">PRO</div>
                <div className="ln-price-amount">$9</div>
                <div className="ln-price-period">per month</div>
                <ul className="ln-price-features">
                  <li>Everything in Free</li>
                  <li>AI price predictions</li>
                  <li>Strategy backtesting</li>
                  <li>Options chain data</li>
                  <li>Priority data refresh</li>
                </ul>
                <Link to="/login" className="ln-price-cta ln-price-cta--featured">Start free trial</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="ln-faq">
          <div className="ln-section-inner ln-section-inner--narrow">
            <p className="ln-eyebrow">FAQ</p>
            <h2 className="ln-section-h2">Questions answered.</h2>
            <div className="ln-faq-list">
              {FAQ_ITEMS.map(item => <FaqItem key={item.q} {...item} />)}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="ln-final-cta">
          <div className="ln-section-inner">
            <h2 className="ln-final-h2">Ready to sharpen<br />your edge?</h2>
            <p className="ln-final-sub">Join traders practicing with real data, zero risk.</p>
            <div className="ln-final-actions">
              <Link to="/login" className="ln-btn-dark ln-btn-hero">Create free account</Link>
              <Link to="/login" className="ln-btn-dark-outline ln-btn-hero">Try demo first →</Link>
            </div>
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer className="ln-footer">
        <div className="ln-footer-inner">
          <div className="ln-footer-brand">
            <span className="ln-footer-logo">STOCKSAGE</span>
            <p className="ln-footer-disclaimer">
              Simulator only — for education and practice. Not investment advice.
              Market data may be delayed.
            </p>
          </div>
          <div className="ln-footer-col">
            <span className="ln-footer-col-head">PLATFORM</span>
            <Link to="/dashboard">Market</Link>
            <Link to="/watchlist">Watchlist</Link>
            <Link to="/intel">Intel</Link>
          </div>
          <div className="ln-footer-col">
            <span className="ln-footer-col-head">LEGAL</span>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">API</a>
          </div>
        </div>
        <div className="ln-footer-bar">
          <span>© {new Date().getFullYear()} STOCKSAGE</span>
          <span>PAPER_TRADING_MODE — NO REAL MONEY</span>
        </div>
      </footer>

    </div>
  );
};

export default Landing;
