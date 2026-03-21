import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db/init';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'stocksage_secret_123';

router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const stmt = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
        const result = stmt.run(email, hashedPassword);
        
        // Initial snapshot
        db.prepare('INSERT INTO portfolio_snapshots (user_id, total_value) VALUES (?, ?)')
          .run(result.lastInsertRowid, 100000.0);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err: any) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, cash_balance: user.cash_balance } });
});

export default router;
