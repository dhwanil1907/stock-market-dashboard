import express from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { getCurrentPrice, executeTrade } from '../services/trading';
import db from '../db/init';

const router = express.Router();

const TICKER_REGEX = /^[A-Z]{1,5}(-[A-Z])?$/;

router.post('/order', authenticateToken, async (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const { ticker, action, quantity, orderType } = req.body;

    if (!ticker || !TICKER_REGEX.test(String(ticker).toUpperCase())) {
        return res.status(400).json({ error: 'Invalid ticker symbol' });
    }
    if (!['BUY', 'SELL'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
    }
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0 || qty > 100000) {
        return res.status(400).json({ error: 'Quantity must be a positive integer' });
    }
    if (orderType && orderType !== 'MARKET') {
        return res.status(501).json({ error: 'Only MARKET orders are supported' });
    }

    try {
        const price = await getCurrentPrice(ticker.toUpperCase());
        executeTrade(userId, ticker.toUpperCase(), action, qty, price);
        return res.json({ message: 'Order executed successfully', price });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/history', authenticateToken, (req: AuthRequest, res) => {
    const userId = req.user!.id;
    try {
        const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(userId);
        res.json(orders);
    } catch {
        res.status(500).json({ error: 'Failed to fetch trade history' });
    }
});

export default router;
