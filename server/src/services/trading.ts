import axios from 'axios';
import db from '../db/init';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function getCurrentPrice(ticker: string): Promise<number> {
    const response = await axios.get(`${ML_SERVICE_URL}/market/quote/${ticker}`);
    return response.data.price;
}

export function executeTrade(userId: number, ticker: string, action: 'BUY' | 'SELL', quantity: number, price: number) {
    const totalCost = quantity * price;

    const doTrade = db.transaction(() => {
        const user: any = db.prepare('SELECT cash_balance FROM users WHERE id = ?').get(userId);

        if (action === 'BUY') {
            if (user.cash_balance < totalCost) throw new Error('Insufficient funds');

            db.prepare('UPDATE users SET cash_balance = cash_balance - ? WHERE id = ?').run(totalCost, userId);

            const holding: any = db.prepare('SELECT * FROM holdings WHERE user_id = ? AND ticker = ?').get(userId, ticker);
            if (holding) {
                const newShares = holding.shares + quantity;
                const newAvgCost = ((holding.avg_cost * holding.shares) + totalCost) / newShares;
                db.prepare('UPDATE holdings SET shares = ?, avg_cost = ? WHERE id = ?').run(newShares, newAvgCost, holding.id);
            } else {
                db.prepare('INSERT INTO holdings (user_id, ticker, shares, avg_cost) VALUES (?, ?, ?, ?)').run(userId, ticker, quantity, price);
            }
        } else {
            const holding: any = db.prepare('SELECT * FROM holdings WHERE user_id = ? AND ticker = ?').get(userId, ticker);
            if (!holding || holding.shares < quantity) throw new Error('Insufficient shares');

            db.prepare('UPDATE users SET cash_balance = cash_balance + ? WHERE id = ?').run(totalCost, userId);

            const newShares = holding.shares - quantity;
            if (newShares === 0) {
                db.prepare('DELETE FROM holdings WHERE id = ?').run(holding.id);
            } else {
                db.prepare('UPDATE holdings SET shares = ? WHERE id = ?').run(newShares, holding.id);
            }
        }

        // Log order
        db.prepare('INSERT INTO orders (user_id, ticker, action, quantity, price, order_type, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(userId, ticker, action, quantity, price, 'MARKET', 'FILLED');

        // Snapshot portfolio value after trade
        const updated: any = db.prepare('SELECT cash_balance FROM users WHERE id = ?').get(userId);
        const holdings: any[] = db.prepare('SELECT shares, avg_cost FROM holdings WHERE user_id = ?').all(userId) as any[];
        const investedValue = holdings.reduce((sum, h) => sum + h.shares * h.avg_cost, 0);
        db.prepare('INSERT INTO portfolio_snapshots (user_id, total_value) VALUES (?, ?)').run(userId, updated.cash_balance + investedValue);
    });

    try {
        doTrade();
    } catch (err) {
        throw err;
    }
}
