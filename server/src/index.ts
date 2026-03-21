import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import cron from 'node-cron';
import axios from 'axios';
import bcrypt from 'bcrypt';
import { initDb } from './db/init';
import authRoutes from './routes/auth';
import stockRoutes from './routes/stock';
import tradeRoutes from './routes/trade';
import watchlistRoutes from './routes/watchlist';
import alertRoutes from './routes/alerts';
import { authenticateToken } from './middleware/auth';
import db from './db/init';

const app = express();
const PORT = process.env.PORT || 3001;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Initialize Database
initDb();

// Seed demo account
async function seedDemoAccount() {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@stocksage.com');
    if (!existing) {
        const hash = await bcrypt.hash('demo1234', 10);
        const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run('demo@stocksage.com', hash);
        db.prepare('INSERT INTO portfolio_snapshots (user_id, total_value) VALUES (?, ?)').run(result.lastInsertRowid, 100000.0);
        console.log('Demo account created');
    }
}
seedDemoAccount();

app.use(helmet());
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/alerts', alertRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/portfolio', authenticateToken, (req: any, res) => {
    const userId = req.user.id;
    const user: any = db.prepare('SELECT cash_balance FROM users WHERE id = ?').get(userId);
    const holdings = db.prepare('SELECT * FROM holdings WHERE user_id = ?').all(userId);
    res.json({ cash_balance: user.cash_balance, holdings });
});

app.get('/api/portfolio/history', authenticateToken, (req: any, res) => {
    const userId = req.user.id;
    const snapshots = db.prepare(
        'SELECT total_value, timestamp FROM portfolio_snapshots WHERE user_id = ? ORDER BY timestamp ASC'
    ).all(userId);
    res.json(snapshots);
});

// ─── Cron: Daily portfolio snapshot (every day at 4:30 PM) ───
cron.schedule('30 16 * * 1-5', async () => {
    console.log('[Cron] Taking daily portfolio snapshots...');
    try {
        const users = db.prepare('SELECT id FROM users').all() as { id: number }[];
        for (const { id } of users) {
            const user: any = db.prepare('SELECT cash_balance FROM users WHERE id = ?').get(id);
            const holdings = db.prepare('SELECT ticker, shares, avg_cost FROM holdings WHERE user_id = ?').all(id) as any[];

            let investedValue = 0;
            for (const h of holdings) {
                try {
                    const r = await axios.get(`${ML_SERVICE_URL}/market/quote/${h.ticker}`, { timeout: 5000 });
                    investedValue += h.shares * r.data.price;
                } catch {
                    // Use avg_cost as fallback if ML service is down
                    investedValue += h.shares * h.avg_cost;
                }
            }
            const totalValue = user.cash_balance + investedValue;
            db.prepare('INSERT INTO portfolio_snapshots (user_id, total_value) VALUES (?, ?)').run(id, totalValue);
        }
        console.log(`[Cron] Snapshots done for ${users.length} users`);
    } catch (err) {
        console.error('[Cron] Portfolio snapshot failed:', err);
    }
});

// ─── Cron: Check price alerts every 5 minutes ───
cron.schedule('*/5 * * * *', async () => {
    try {
        const activeAlerts = db.prepare(
            'SELECT * FROM alerts WHERE triggered = 0 AND dismissed = 0'
        ).all() as any[];

        if (!activeAlerts.length) return;

        // Deduplicate tickers
        const tickers = [...new Set(activeAlerts.map((a: any) => a.ticker))];
        const prices: Record<string, number> = {};

        await Promise.allSettled(
            tickers.map(async (ticker) => {
                try {
                    const r = await axios.get(`${ML_SERVICE_URL}/market/quote/${ticker}`, { timeout: 5000 });
                    prices[ticker] = r.data.price;
                } catch {}
            })
        );

        const now = new Date().toISOString();
        for (const alert of activeAlerts) {
            const price = prices[alert.ticker];
            if (price === undefined) continue;

            const triggered =
                (alert.condition === 'above' && price >= alert.target_price) ||
                (alert.condition === 'below' && price <= alert.target_price);

            if (triggered) {
                db.prepare(
                    'UPDATE alerts SET triggered = 1, triggered_at = ? WHERE id = ?'
                ).run(now, alert.id);
            }
        }
    } catch (err) {
        console.error('[Cron] Alert check failed:', err);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
