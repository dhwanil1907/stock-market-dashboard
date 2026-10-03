import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { RefreshCw, Loader2, Search, Sparkles } from 'lucide-react';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  image?: string;
  summary?: string;
}

const TRENDING = ['AAPL', 'TSLA', 'NVDA', 'AMD', 'MSFT', 'AMZN', 'META', 'GOOGL'];

const relTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

function badgeFromTitle(title: string): string {
  const upper = title.toUpperCase();
  for (const t of TRENDING) {
    if (upper.includes(t)) return t;
  }
  return 'Mkt';
}

const Intel: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');
  const [trendFilter, setTrendFilter] = useState<string | null>('AAPL');

  const fetchNews = useCallback(async (spin = false) => {
    if (spin) setRefreshing(true);
    try {
      const params = trendFilter ? `?ticker=${trendFilter}` : '';
      const res = await api.get(`/stock/news${params}`);
      setNews(res.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
      if (spin) setRefreshing(false);
    }
  }, [trendFilter]);

  useEffect(() => {
    setLoading(true);
    fetchNews();
    const interval = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  const filtered = news.filter(n => {
    if (filter && !n.title.toLowerCase().includes(filter.toLowerCase())) return false;
    if (trendFilter && !n.title.toUpperCase().includes(trendFilter)) return false;
    return true;
  });

  return (
    <div>
      <p className="intel-page-meta">Headlines and sentiment from major feeds · refreshes every 5 min</p>

      <div className="intel-layout">
        <div className="intel-main">
          <div className="intel-filter-row">
            <Search size={14} className="t-muted2" />
            <input
              type="text"
              className="t-input"
              placeholder="Filter by ticker or keyword…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
            <button type="button" className="t-btn t-btn-ghost" onClick={() => fetchNews(true)} disabled={refreshing}>
              <RefreshCw size={12} className={refreshing ? 't-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="intel-trending-row">
            <span className="intel-trending-label">Trending</span>
            {TRENDING.map(sym => (
              <button
                key={sym}
                type="button"
                className={`intel-trend-pill${trendFilter === sym ? ' intel-trend-pill--on' : ''}`}
                onClick={() => setTrendFilter(trendFilter === sym ? null : sym)}
              >
                {sym}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="pf-empty">
              <Loader2 size={18} className="t-spin t-green" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="pf-empty t-muted2">No stories match your filters.</div>
          ) : (
            filtered.map((item, i) => (
              <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="intel-card">
                <div className="intel-card-meta">
                  <span className="t-muted2">
                    {item.source ?? 'Feed'} · {item.pubDate ? relTime(item.pubDate) : ''}
                  </span>
                  <span className="intel-card-badge">{badgeFromTitle(item.title)}</span>
                </div>
                <div className="intel-card-title">{item.title}</div>
                {item.summary && (
                  <p className="intel-card-summary">{item.summary.slice(0, 160)}{item.summary.length > 160 ? '…' : ''}</p>
                )}
                <span className="intel-card-cta">Read more →</span>
              </a>
            ))
          )}

        </div>

        <aside className="intel-widgets">
          <div className="intel-widget">
            <div className="intel-widget-title ui-section-label">Market sentiment (demo)</div>
            <div className="intel-sentiment-big">78</div>
            <div className="intel-sentiment-lbl">Extreme greed</div>
            <div className="intel-meter">
              <div className="intel-meter-fill" style={{ width: '78%' }} />
            </div>
            <p className="t-muted2" style={{ fontSize: 'var(--text-caption)', lineHeight: 1.6, margin: 0 }}>
              Risk appetite elevated — rotation into growth names. Monitor yields.
            </p>
          </div>

          <div className="intel-widget">
            <div className="intel-widget-title intel-widget-title--row">
              <Sparkles size={12} aria-hidden />
              Sage advisory
            </div>
            <blockquote className="intel-quote">
              Sentiment can decouple from fundamental P/E ratios in late cycle. Watch real rates and the 10Y.
            </blockquote>
          </div>

          <div className="intel-widget" style={{ minHeight: 120, opacity: 0.45 }}>
            <div className="intel-widget-title ui-section-label">Trending symbols</div>
            <svg viewBox="0 0 200 60" width="100%" height="60" preserveAspectRatio="none" aria-hidden>
              <path
                d="M0,45 Q40,40 80,30 T160,15 L200,10"
                fill="none"
                stroke="var(--color-gain)"
                strokeWidth="1"
                opacity="0.6"
              />
            </svg>
            <div style={{ marginTop: 8 }}>
              {TRENDING.slice(0, 3).map(t => (
                <Link key={t} to={`/stock/${t}`} className="intel-trend-pill intel-trend-pill--on" style={{ marginRight: 6, marginTop: 6 }}>
                  {t}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Intel;
