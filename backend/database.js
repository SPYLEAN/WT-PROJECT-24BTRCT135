const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../database.db'));

// Create Tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ideas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        problem_statement TEXT NOT NULL,
        category TEXT NOT NULL,
        difficulty_score INTEGER NOT NULL CHECK(difficulty_score BETWEEN 1 AND 5),
        market_potential TEXT NOT NULL,
        tags TEXT,
        visibility TEXT DEFAULT 'active',
        upvotes INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        popularity_score INTEGER DEFAULT 0,
        expiry_duration INTEGER,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`);

module.exports = db;
