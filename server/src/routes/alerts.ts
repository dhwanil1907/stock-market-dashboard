import express from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import db from '../db/init';

const router = express.Router();

// GET /api/alerts — all alerts for user (active + untriggered or undismissed)
router.get('/', authenticateToken, (req: AuthRequest, res) => {
    const userId = req.user!.id;
    try {
        const alerts = db.prepare(
            'SELECT * FROM alerts WHERE user_id = ? AND dismissed = 0 ORDER BY created_at DESC'
        ).all(userId);
        res.json(alerts);
    } catch {
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

// POST /api/alerts — create a new alert
router.post('/', authenticateToken, (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const { ticker, condition, target_price } = req.body;

    if (!ticker || typeof ticker !== 'string') {
        return res.status(400).json({ error: 'ticker is required' });
    }
    if (!['above', 'below'].includes(condition)) {
        return res.status(400).json({ error: 'condition must be "above" or "below"' });
    }
    const price = Number(target_price);
    if (isNaN(price) || price <= 0) {
        return res.status(400).json({ error: 'target_price must be a positive number' });
    }

    try {
        const result = db.prepare(
            'INSERT INTO alerts (user_id, ticker, condition, target_price) VALUES (?, ?, ?, ?)'
        ).run(userId, ticker.toUpperCase(), condition, price);
        const created = db.prepare('SELECT * FROM alerts WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(created);
    } catch {
        res.status(500).json({ error: 'Failed to create alert' });
    }
});

// DELETE /api/alerts/:id — delete alert
router.delete('/:id', authenticateToken, (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const alertId = Number(req.params.id);
    try {
        db.prepare('DELETE FROM alerts WHERE id = ? AND user_id = ?').run(alertId, userId);
        res.json({ id: alertId });
    } catch {
        res.status(500).json({ error: 'Failed to delete alert' });
    }
});

// PUT /api/alerts/:id/dismiss — dismiss a triggered alert
router.put('/:id/dismiss', authenticateToken, (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const alertId = Number(req.params.id);
    try {
        db.prepare('UPDATE alerts SET dismissed = 1 WHERE id = ? AND user_id = ?').run(alertId, userId);
        res.json({ id: alertId });
    } catch {
        res.status(500).json({ error: 'Failed to dismiss alert' });
    }
});

export default router;
