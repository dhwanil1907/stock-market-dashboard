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

router.get('/search', async (req, res) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/market/search`, { params: { q: req.query.q } });
        res.json(response.data);
    } catch {
        res.status(500).json({ error: 'ML Service unavailable' });
    }
});

router.get('/sectors', async (req, res) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/market/sectors`);
        res.json(response.data);
    } catch {
        res.status(500).json({ error: 'Could not fetch sector data' });
    }
});

router.get('/:ticker/quote', async (req, res) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/market/quote/${req.params.ticker}`);
        res.json(response.data);
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
