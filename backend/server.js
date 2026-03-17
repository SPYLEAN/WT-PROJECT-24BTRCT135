require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const authRoutes = require('./routes/auth');
const ideasRoutes = require('./routes/ideas');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/ideas', ideasRoutes);

// Serve static frontend
app.use(express.static(path.join(__dirname, '../')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Background Job for Expiry Every 5 Minutes
setInterval(() => {
    db.prepare(`
        UPDATE ideas 
        SET visibility = 'archived' 
        WHERE expires_at IS NOT NULL 
        AND expires_at <= datetime('now') 
        AND visibility != 'archived'
    `).run();
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
