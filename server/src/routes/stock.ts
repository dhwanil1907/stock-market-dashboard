import express from 'express';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

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
                const price = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 0;
                const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
                const change_percent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
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

// ── News: parse Yahoo Finance RSS (no API key required) ──
router.get('/news', async (req, res) => {
    const ticker = (req.query.ticker as string || '').toUpperCase();
    const url = ticker
        ? `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`
        : 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=AAPL,TSLA,NVDA,MSFT,SPY&region=US&lang=en-US';
    try {
        const xmlRes = await axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const xml: string = xmlRes.data;
        // Lightweight parse — no external xml lib needed
        const items: object[] = [];
        const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
        for (const m of itemMatches) {
            const block = m[1];
            const get = (tag: string) => {
                const match = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
                return match ? (match[1] || match[2] || '').trim() : '';
            };
            items.push({
                title:   get('title'),
                link:    get('link'),
                pubDate: get('pubDate'),
                source:  get('source') || 'Yahoo Finance',
            });
            if (items.length >= 30) break;
        }
        res.json(items);
    } catch {
        res.status(503).json({ error: 'News feed unavailable' });
    }
});

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
    const price = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change_percent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
    const closes: number[] = result?.indicators?.quote?.[0]?.close?.filter((c: any) => c != null) ?? [];
    const month_return_pct = closes.length >= 2
        ? ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100
        : 0;
    return { price, prevClose, change_percent, month_return_pct, meta };
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
        const { price, change_percent, meta } = await fetchYahooQuote(ticker);
        res.json({
            symbol: ticker,
            name: meta.longName ?? meta.shortName ?? ticker,
            company_name: meta.longName ?? meta.shortName ?? ticker,
            price: +price.toFixed(2),
            change_percent: +change_percent.toFixed(2),
            volume: meta.regularMarketVolume ?? 0,
            market_cap: meta.marketCap ?? 0,
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
