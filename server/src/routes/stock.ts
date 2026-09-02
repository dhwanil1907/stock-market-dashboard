import express from 'express';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || '';
const FINNHUB_BASE = 'https://finnhub.io/api/v1';

// News cache — 5 min TTL to avoid burning Finnhub quota
const newsCache = new Map<string, { data: object[]; ts: number }>();
const NEWS_TTL = 5 * 60 * 1000;

function getCachedNews(key: string) {
    const entry = newsCache.get(key);
    if (entry && Date.now() - entry.ts < NEWS_TTL) return entry.data;
    return null;
}
function setCachedNews(key: string, data: object[]) {
    newsCache.set(key, { data, ts: Date.now() });
}

// Simple in-memory rate limiter for prediction endpoint
const predictRateMap = new Map<number, number[]>();
function isPredictRateLimited(userId: number): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 3;
    const timestamps = (predictRateMap.get(userId) || []).filter(t => now - t < windowMs);
    if (timestamps.length >= maxRequests) return true;
    timestamps.push(now);
    predictRateMap.set(userId, timestamps);
    return false;
}

router.get('/quotes/batch', async (req, res) => {
    const symbols = ((req.query.symbols as string) || '').split(',').filter(Boolean).slice(0, 25).map(s => s.trim().toUpperCase());
    if (symbols.length === 0) return res.json([]);
    try {
        // Fetch directly from Yahoo Finance chart API — no ML service required
        const results = await Promise.allSettled(
            symbols.map(ticker =>
                axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`, {
                    params: { interval: '1d', range: '2d' },
                    timeout: 6000,
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                })
            )
        );
        const quotes = results
            .map((r, i) => {
                if (r.status !== 'fulfilled') return null;
                const meta = r.value.data?.chart?.result?.[0]?.meta;
                if (!meta) return null;
                const result = r.value.data?.chart?.result?.[0];
                const { price, change_percent } = yahooQuoteMetrics(meta, result);
                return { symbol: symbols[i], price, change_percent };
            })
            .filter(Boolean);
        res.json(quotes);
    } catch {
        res.status(500).json({ error: 'Could not fetch quotes' });
    }
});

router.get('/search', async (req, res) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/market/search`, { params: { q: req.query.q } });
        res.json(response.data);
    } catch {
        res.status(500).json({ error: 'ML Service unavailable' });
    }
});

// ── News: Finnhub company news or general market news ──
router.get('/news', async (req, res) => {
    const ticker = (req.query.ticker as string || '').toUpperCase();
    const cacheKey = ticker || 'general';
    const cached = getCachedNews(cacheKey);
    if (cached) return res.json(cached);

    try {
        let items: object[] = [];

        if (ticker) {
            // Company-specific news — last 7 days
            const to = new Date().toISOString().slice(0, 10);
            const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
            const r = await axios.get(`${FINNHUB_BASE}/company-news`, {
                params: { symbol: ticker, from, to, token: FINNHUB_KEY },
                timeout: 8000,
            });
            items = (r.data as any[]).slice(0, 30).map(n => ({
                title:   n.headline,
                link:    n.url,
                pubDate: new Date(n.datetime * 1000).toISOString(),
                source:  n.source || 'Finnhub',
                image:   n.image || null,
                summary: n.summary || null,
            }));
        } else {
            // General market news
            const r = await axios.get(`${FINNHUB_BASE}/news`, {
                params: { category: 'general', token: FINNHUB_KEY },
                timeout: 8000,
            });
            items = (r.data as any[]).slice(0, 30).map(n => ({
                title:   n.headline,
                link:    n.url,
                pubDate: new Date(n.datetime * 1000).toISOString(),
                source:  n.source || 'Finnhub',
                image:   n.image || null,
                summary: n.summary || null,
            }));
        }

        setCachedNews(cacheKey, items);
        res.json(items);
    } catch (err: any) {
        res.status(503).json({ error: 'News feed unavailable' });
    }
});

/** Day change vs prior close: prefer previous daily bar close over chartPreviousClose (often mismatched on multi-day ranges). */
function yahooQuoteMetrics(meta: any, result: any) {
    const closes: number[] =
        result?.indicators?.quote?.[0]?.close?.filter((c: any) => typeof c === 'number' && !Number.isNaN(c)) ?? [];
    let price = Number(meta?.regularMarketPrice);
    if (!Number.isFinite(price)) {
        price = closes.length ? closes[closes.length - 1] : NaN;
    }
    if (!Number.isFinite(price)) {
        price = Number(meta?.chartPreviousClose ?? meta?.previousClose ?? 0) || 0;
    }
    let prevClose = 0;
    if (closes.length >= 2) {
        prevClose = closes[closes.length - 2];
    } else {
        prevClose = Number(meta?.chartPreviousClose ?? meta?.previousClose ?? 0) || 0;
    }
    const change_percent =
        prevClose && price ? ((price - prevClose) / prevClose) * 100 : 0;
    const month_return_pct =
        closes.length >= 2 && closes[0] ? ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100 : 0;
    return {
        price,
        prevClose,
        change_percent: Number.isFinite(change_percent) ? change_percent : 0,
        month_return_pct: Number.isFinite(month_return_pct) ? month_return_pct : 0,
    };
}

/** Session OHLC from chart: day open = last bar open; hi/lo from meta when present. */
function yahooSessionFields(meta: any, result: any) {
    const q = result?.indicators?.quote?.[0];
    const opens = (q?.open ?? []).filter((x: any) => typeof x === 'number' && !Number.isNaN(x));
    const dayOpen = opens.length ? opens[opens.length - 1] : null;
    const high = meta?.regularMarketDayHigh;
    const low = meta?.regularMarketDayLow;
    return {
        open: typeof dayOpen === 'number' && Number.isFinite(dayOpen) ? dayOpen : null,
        high: typeof high === 'number' && Number.isFinite(high) ? high : null,
        low: typeof low === 'number' && Number.isFinite(low) ? low : null,
    };
}

const SECTOR_ETFS: Record<string, string> = {
    'Technology': 'XLK',
    'Financials': 'XLF',
    'Healthcare': 'XLV',
    'Energy': 'XLE',
    'Industrials': 'XLI',
    'Consumer Discretionary': 'XLY',
    'Consumer Staples': 'XLP',
    'Materials': 'XLB',
    'Real Estate': 'XLRE',
    'Utilities': 'XLU',
    'Communication Services': 'XLC',
};

async function fetchYahooQuote(ticker: string) {
    const r = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`, {
        params: { interval: '1d', range: '1mo' },
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const result = r.data?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) throw new Error('No data');
    const { price, prevClose, change_percent, month_return_pct } = yahooQuoteMetrics(meta, result);
    const session = yahooSessionFields(meta, result);
    return { price, prevClose, change_percent, month_return_pct, meta, session };
}

router.get('/sectors', async (_req, res) => {
    try {
        const entries = Object.entries(SECTOR_ETFS);
        const results = await Promise.allSettled(
            entries.map(([, etf]) => fetchYahooQuote(etf))
        );
        const sectors = results.map((r, i) => {
            const [sector, etf] = entries[i];
            if (r.status !== 'fulfilled') return { sector, etf, price: 0, change_pct: 0, month_return_pct: 0 };
            const { price, change_percent, month_return_pct } = r.value;
            return { sector, etf, price: +price.toFixed(2), change_pct: +change_percent.toFixed(2), month_return_pct: +month_return_pct.toFixed(2) };
        });
        sectors.sort((a, b) => b.change_pct - a.change_pct);
        res.json(sectors);
    } catch {
        res.status(500).json({ error: 'Could not fetch sector data' });
    }
});

router.get('/:ticker/quote', async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    try {
        const [yahooSettled, mlSettled] = await Promise.allSettled([
            fetchYahooQuote(ticker),
            axios.get(`${ML_SERVICE_URL}/market/quote/${ticker}`, { timeout: 8000 }),
        ]);
        if (yahooSettled.status !== 'fulfilled') throw new Error('yahoo');
        const { price, change_percent, meta, session } = yahooSettled.value;

        let open = session.open;
        let high = session.high;
        let low = session.low;
        let marketCap: number | null = typeof meta.marketCap === 'number' && meta.marketCap > 0 ? meta.marketCap : null;
        let peRatio: number | null = null;
        let dividendYield: number | null = null;
        let sector: string | null = null;

        if (mlSettled.status === 'fulfilled') {
            const q = mlSettled.value.data as Record<string, unknown>;
            const mo = q.open as number | undefined;
            const mh = q.high as number | undefined;
            const ml = q.low as number | undefined;
            const mc = q.market_cap as number | undefined;
            if (open == null && typeof mo === 'number' && mo > 0) open = mo;
            if (high == null && typeof mh === 'number' && mh > 0) high = mh;
            if (low == null && typeof ml === 'number' && ml > 0) low = ml;
            if (marketCap == null && typeof mc === 'number' && mc > 0) marketCap = mc;
            const pe = q.pe_ratio as number | undefined;
            if (typeof pe === 'number' && Number.isFinite(pe)) peRatio = pe;
            const dy = q.dividend_yield as number | undefined;
            if (typeof dy === 'number' && Number.isFinite(dy)) dividendYield = dy;
            const sec = q.sector as string | undefined;
            if (sec) sector = sec;
        }

        res.json({
            symbol: ticker,
            name: meta.longName ?? meta.shortName ?? ticker,
            company_name: meta.longName ?? meta.shortName ?? ticker,
            price: +price.toFixed(2),
            change_percent: +change_percent.toFixed(2),
            open: open != null ? +open.toFixed(2) : null,
            high: high != null ? +high.toFixed(2) : null,
            low: low != null ? +low.toFixed(2) : null,
            volume: meta.regularMarketVolume ?? 0,
            market_cap: marketCap,
            pe_ratio: peRatio,
            dividend_yield: dividendYield,
            sector,
            week_52_high: meta.fiftyTwoWeekHigh ?? 0,
            week_52_low: meta.fiftyTwoWeekLow ?? 0,
        });
    } catch {
        res.status(404).json({ error: 'Stock not found' });
    }
});

router.get('/:ticker/history', async (req, res) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/market/history/${req.params.ticker}`, { params: { period: req.query.period } });
        res.json(response.data);
    } catch {
        res.status(500).json({ error: 'Could not fetch history' });
    }
});

router.get('/:ticker/options', async (req, res) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/market/options/${req.params.ticker}`, { params: { expiration: req.query.expiration } });
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        res.status(status).json({ error: err.response?.data?.detail || 'Could not fetch options data' });
    }
});

router.get('/:ticker/predict', authenticateToken, async (req: any, res) => {
    if (isPredictRateLimited(req.user.id)) {
        return res.status(429).json({ error: 'Too many prediction requests. Please wait a minute.' });
    }
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/predict/${req.params.ticker}`, { params: { horizon: req.query.horizon }, timeout: 120000 });
        res.json(response.data);
    } catch {
        res.status(500).json({ error: 'Prediction service failed' });
    }
});

router.get('/:ticker/backtest', authenticateToken, async (req, res) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/backtest/${req.params.ticker}`, {
            params: { strategy: req.query.strategy, period: req.query.period },
            timeout: 60000
        });
        res.json(response.data);
    } catch (err: any) {
        const status = err.response?.status || 500;
        res.status(status).json({ error: err.response?.data?.detail || 'Backtest failed' });
    }
});

export default router;
