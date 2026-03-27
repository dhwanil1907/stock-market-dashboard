import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { RefreshCw, Loader2 } from 'lucide-react';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

const TRENDING = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'SPY'];

function sentiment(title: string): 'pos' | 'neg' | 'neu' {
  const t = title.toLowerCase();
  if (/\b(surge|soar|jump|rally|beat|gain|rise|bull|growth|profit|record|strong|up)\b/.test(t)) return 'pos';
  if (/\b(fall|drop|crash|plunge|miss|loss|bear|decline|cut|warn|down|weak|risk)\b/.test(t)) return 'neg';
  return 'neu';
}

const relTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const Intel: React.FC = () => {
  const [news, setNews]             = useState<NewsItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quotes, setQuotes]         = useState<Record<string, any>>({});
  const [filter, setFilter]         = useState('');

  const fetchNews = useCallback(async (spin = false) => {
    if (spin) setRefreshing(true);
    try {
      const res = await api.get('/stock/news');
      setNews(res.data);
    } catch {
      /* silent fail */
    } finally {
      setLoading(false);
      if (spin) setRefreshing(false);
    }
  }, []);

  const fetchQuotes = useCallback(async () => {
    const results = await Promise.allSettled(
      TRENDING.map(t => api.get(`/stock/${t}/quote`).then(r => ({ ticker: t, data: r.data })))
    );
    const q: Record<string, any> = {};
    results.forEach(r => { if (r.status === 'fulfilled') q[r.value.ticker] = r.value.data; });
    setQuotes(q);
  }, []);

  useEffect(() => {
    fetchNews();
    fetchQuotes();
    const interval = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNews, fetchQuotes]);

  const filtered = filter
    ? news.filter(n => n.title.toLowerCase().includes(filter.toLowerCase()))
    : news;

  return (
    <div>
      <div className="t-page-header">
        <span className="t-section-title t-mb-0">INTELLIGENCE_FEED</span>
        <div className="t-page-actions">
          <span className="t-page-meta">YAHOO FINANCE RSS · UPDATES EVERY 5MIN</span>
          <button type="button" className="t-btn t-btn-ghost" onClick={() => fetchNews(true)} disabled={refreshing}>
            <RefreshCw size={10} className={refreshing ? 't-spin' : ''} /> REFRESH
          </button>
        </div>
      </div>

      <div className="intel-body">
        {/* News feed */}
        <div className="intel-feed">
          <div className="th-filter-bar">
            <span className="t-card-label t-mb-0">NEWS ({filtered.length})</span>
            <input
              type="text"
              className="t-input th-filter-input"
              placeholder="FILTER..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="pf-empty"><Loader2 size={18} className="t-spin t-green" /></div>
          ) : filtered.length === 0 ? (
            <div className="pf-empty t-muted2">NO_ARTICLES_FOUND</div>
          ) : (
            filtered.map((item, i) => {
              const s = sentiment(item.title);
              return (
                <a
                  key={i}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="intel-article"
                >
                  <div className="intel-article-meta">
                    <span className={`intel-sentiment intel-sentiment--${s}`}>
                      {s === 'pos' ? '▲ BULLISH' : s === 'neg' ? '▼ BEARISH' : '◆ NEUTRAL'}
                    </span>
                    <span className="intel-source">{item.source}</span>
                  </div>
                  <div className="intel-article-title">{item.title}</div>
                  <div className="intel-article-time">{item.pubDate ? relTime(item.pubDate) : ''}</div>
                </a>
              );
            })
          )}
        </div>

        {/* Trending sidebar */}
        <div className="intel-sidebar">
          <div className="mo-table-header">
            <span className="t-card-label t-mb-0">TRENDING</span>
          </div>
          {TRENDING.map(sym => {
            const q = quotes[sym];
            const up = (q?.change_percent ?? 0) >= 0;
            return (
              <Link key={sym} to={`/stock/${sym}`} className="intel-ticker-chip">
                <span className="intel-ticker-chip-sym">{sym}</span>
                {q && (
                  <span className={`intel-ticker-chip-chg ${up ? 't-green' : 't-red'}`}>
                    {up ? '+' : ''}{q.change_percent?.toFixed(2)}%
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Intel;
