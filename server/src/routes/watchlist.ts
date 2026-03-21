import express from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import db from '../db/init';

const router = express.Router();

const TICKER_REGEX = /^[A-Z]{1,5}(-[A-Z])?$/;

// GET /api/watchlist
router.get('/', authenticateToken, (req: AuthRequest, res) => {
    const userId = req.user!.id;
    try {
        const rows = db.prepare('SELECT ticker FROM watchlist WHERE user_id = ? ORDER BY id ASC').all(userId) as { ticker: string }[];
        res.json(rows.map(r => r.ticker));
    } catch {
        res.status(500).json({ error: 'Failed to fetch watchlist' });
    }
});

// POST /api/watchlist/:ticker
router.post('/:ticker', authenticateToken, (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const ticker = req.params.ticker.toUpperCase();

    if (!TICKER_REGEX.test(ticker)) {
        return res.status(400).json({ error: 'Invalid ticker symbol' });
    }

    try {
        db.prepare('INSERT OR IGNORE INTO watchlist (user_id, ticker) VALUES (?, ?)').run(userId, ticker);
        res.json({ ticker });
    } catch {
        res.status(500).json({ error: 'Failed to add to watchlist' });
    }
});

// DELETE /api/watchlist/:ticker
router.delete('/:ticker', authenticateToken, (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const ticker = req.params.ticker.toUpperCase();

    try {
        db.prepare('DELETE FROM watchlist WHERE user_id = ? AND ticker = ?').run(userId, ticker);
        res.json({ ticker });
    } catch {
        res.status(500).json({ error: 'Failed to remove from watchlist' });
    }
});

export default router;
