const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

const MARKET_SCORES = { 'Low': 1, 'Medium': 2, 'High': 3, 'Very High': 4 };

// Helper to calculate popularity score
const calcPopularity = (market, difficulty, upvotes) => {
    const mScore = MARKET_SCORES[market] || 0;
    return (mScore * 2) + parseInt(difficulty) + parseInt(upvotes);
};

// Validation middleware for create/update
const validateIdea = (req, res, next) => {
    const { title, description, problem_statement, category, difficulty_score, market_potential } = req.body;
    
    if (!title || !description || !problem_statement || !category || !difficulty_score || !market_potential) {
        return res.status(400).json({ error: 'All mandatory fields required' });
    }

    if (difficulty_score < 1 || difficulty_score > 5) {
        return res.status(400).json({ error: 'Difficulty must be 1-5' });
    }

    if (!MARKET_SCORES[market_potential]) {
        return res.status(400).json({ error: 'Invalid market potential' });
    }

    next();
};

// GET all active and non-expired ideas
router.get('/', (req, res) => {
    const ideas = db.prepare(`
        SELECT ideas.*, users.username as author_name 
        FROM ideas 
        JOIN users ON ideas.user_id = users.id 
        WHERE visibility = 'active' AND (expires_at IS NULL OR expires_at > datetime('now'))
        ORDER BY created_at DESC
    `).all();
    
    ideas.forEach(i => i.tags = i.tags ? i.tags.split(',') : []);
    res.json(ideas);
});

// GET trending ideas
router.get('/trending', (req, res) => {
    const ideas = db.prepare(`
        SELECT ideas.*, users.username as author_name 
        FROM ideas 
        JOIN users ON ideas.user_id = users.id 
        WHERE visibility = 'active' AND (expires_at IS NULL OR expires_at > datetime('now'))
        ORDER BY popularity_score DESC LIMIT 10
    `).all();
    ideas.forEach(i => i.tags = i.tags ? i.tags.split(',') : []);
    res.json(ideas);
});

// GET archived ideas
router.get('/archived', (req, res) => {
    const ideas = db.prepare(`
        SELECT ideas.*, users.username as author_name 
        FROM ideas 
        JOIN users ON ideas.user_id = users.id 
        WHERE visibility = 'archived' OR (expires_at IS NOT NULL AND expires_at <= datetime('now'))
        ORDER BY expires_at DESC
    `).all();
    ideas.forEach(i => i.tags = i.tags ? i.tags.split(',') : []);
    res.json(ideas);
});

// GET my ideas (protected)
router.get('/my', auth, (req, res) => {
    const ideas = db.prepare(`
        SELECT ideas.*, users.username as author_name 
        FROM ideas 
        JOIN users ON ideas.user_id = users.id 
        WHERE user_id = ?
        ORDER BY created_at DESC
    `).all(req.user.id);
    ideas.forEach(i => i.tags = i.tags ? i.tags.split(',') : []);
    res.json(ideas);
});

// GET single idea
router.get('/:id', (req, res) => {
    const idea = db.prepare(`
        SELECT ideas.*, users.username as author_name 
        FROM ideas 
        JOIN users ON ideas.user_id = users.id 
        WHERE ideas.id = ?
    `).get(req.params.id);

    if (!idea) return res.status(404).json({ error: 'Idea not found' });

    // Increment view count
    db.prepare('UPDATE ideas SET view_count = view_count + 1 WHERE id = ?').run(req.params.id);
    idea.view_count += 1;
    idea.tags = idea.tags ? idea.tags.split(',') : [];

    res.json(idea);
});

// POST new idea
router.post('/', auth, validateIdea, (req, res) => {
    const { title, description, problem_statement, category, difficulty_score, market_potential, tags, expiry_duration } = req.body;

    const existing = db.prepare('SELECT id FROM ideas WHERE user_id = ? AND lower(title) = ?').get(req.user.id, title.toLowerCase());
    if (existing) return res.status(400).json({ error: 'You already have an idea with this title' });

    const popScore = calcPopularity(market_potential, difficulty_score, 0);
    const tagsStr = Array.isArray(tags) ? tags.join(',') : '';

    let expiresAt = null;
    if (expiry_duration) {
        expiresAt = new Date(Date.now() + parseInt(expiry_duration) * 3600000).toISOString().replace('T', ' ').substring(0, 19);
    }

    const stmt = db.prepare(`
        INSERT INTO ideas (user_id, title, description, problem_statement, category, difficulty_score, market_potential, tags, popularity_score, expiry_duration, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
        const info = stmt.run(req.user.id, title, description, problem_statement, category, difficulty_score, market_potential, tagsStr, popScore, expiry_duration || null, expiresAt);
        res.status(201).json({ id: info.lastInsertRowid, message: 'Idea created successfully' });
    } catch(err) {
        res.status(500).json({ error: 'Failed to create idea' });
    }
});

// PUT edit idea (owner only)
router.put('/:id', auth, validateIdea, (req, res) => {
    const idea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(req.params.id);
    if (!idea) return res.status(404).json({ error: 'Idea not found' });
    if (idea.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const { title, description, problem_statement, category, difficulty_score, market_potential, tags } = req.body;
    
    const existing = db.prepare('SELECT id FROM ideas WHERE user_id = ? AND lower(title) = ? AND id != ?').get(req.user.id, title.toLowerCase(), idea.id);
    if (existing) return res.status(400).json({ error: 'You already have another idea with this title' });

    const popScore = calcPopularity(market_potential, difficulty_score, idea.upvotes);
    const tagsStr = Array.isArray(tags) ? tags.join(',') : '';

    db.prepare(`
        UPDATE ideas SET title=?, description=?, problem_statement=?, category=?, difficulty_score=?, market_potential=?, tags=?, popularity_score=?, updated_at=CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(title, description, problem_statement, category, difficulty_score, market_potential, tagsStr, popScore, idea.id);

    res.json({ message: 'Idea updated successfully' });
});

// DELETE idea
router.delete('/:id', auth, (req, res) => {
    const idea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(req.params.id);
    if (!idea) return res.status(404).json({ error: 'Idea not found' });
    if (idea.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    db.prepare('DELETE FROM ideas WHERE id = ?').run(idea.id);
    res.json({ message: 'Idea deleted successfully' });
});

// PATCH toggle visibility
router.patch('/:id/visibility', auth, (req, res) => {
    const idea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(req.params.id);
    if (!idea) return res.status(404).json({ error: 'Idea not found' });
    if (idea.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const newVis = idea.visibility === 'active' ? 'hidden' : 'active';
    db.prepare('UPDATE ideas SET visibility = ?, updated_at=CURRENT_TIMESTAMP WHERE id = ?').run(newVis, idea.id);

    res.json({ message: `Visibility updated to ${newVis}` });
});

// POST upvote
router.post('/:id/upvote', auth, (req, res) => {
    const idea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(req.params.id);
    if (!idea) return res.status(404).json({ error: 'Idea not found' });

    db.prepare('UPDATE ideas SET upvotes = upvotes + 1, popularity_score = popularity_score + 1 WHERE id = ?').run(idea.id);
    res.json({ message: 'Upvoted successfully' });
});

module.exports = router;
