const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

router.post('/register', (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields are required' });

    try {
        const hashedPassword = bcrypt.hashSync(password, 10);
        const stmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
        const info = stmt.run(username, email, hashedPassword);
        
        const token = jwt.sign({ id: info.lastInsertRowid, username }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ token, username });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'All fields are required' });

    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, username: user.username });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/logout', (req, res) => {
    // Logout handled on client-side by deleting token
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
