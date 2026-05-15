require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test DB connection
pool.getConnection()
  .then(conn => {
    console.log('✅ Connected to MySQL database');
    conn.release();
  })
  .catch(err => console.error('❌ Database connection failed:', err.message));

const JWT_SECRET = process.env.JWT_SECRET;

// ========== AUTH MIDDLEWARE ==========
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;   // { id, role }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ========== AUTH ROUTES ==========
// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = uuidv4();

    await pool.query(
      'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)',
      [userId, username, email, passwordHash]
    );

    const token = jwt.sign({ id: userId, role: 'student' }, JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ token, user: { id: userId, username, email, role: 'student' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== POST ROUTES ==========
// Get all posts (with vote counts and author)
app.get('/api/posts', async (req, res) => {
  try {
    const [posts] = await pool.query(`
      SELECT p.*, u.username AS author_name,
        COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END), 0) AS upvotes,
        COALESCE(SUM(CASE WHEN v.vote_type = 'down' THEN 1 ELSE 0 END), 0) AS downvotes
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN votes v ON p.id = v.post_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create post (protected)
app.post('/api/posts', authMiddleware, async (req, res) => {
  try {
    const { title, body, category } = req.body;
    const postId = uuidv4();
    await pool.query(
      'INSERT INTO posts (id, title, body, category, author_id) VALUES (?, ?, ?, ?, ?)',
      [postId, title, body, category, req.user.id]
    );
    const [post] = await pool.query('SELECT * FROM posts WHERE id = ?', [postId]);
    res.status(201).json(post[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single post with comments
app.get('/api/posts/:id', async (req, res) => {
  try {
    const [post] = await pool.query(`
      SELECT p.*, u.username AS author_name
      FROM posts p JOIN users u ON p.author_id = u.id
      WHERE p.id = ?
    `, [req.params.id]);
    if (post.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json(post[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== VOTE ROUTE ==========
app.post('/api/posts/:id/vote', authMiddleware, async (req, res) => {
  try {
    const { voteType } = req.body; // 'up' or 'down'
    const postId = req.params.id;
    const userId = req.user.id;

    // Remove previous vote (if any)
    await pool.query('DELETE FROM votes WHERE post_id = ? AND user_id = ?', [postId, userId]);
    // Insert new vote
    await pool.query('INSERT INTO votes (post_id, user_id, vote_type) VALUES (?, ?, ?)', [postId, userId, voteType]);

    // Return updated counts
    const [counts] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END), 0) AS upvotes,
        COALESCE(SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END), 0) AS downvotes
      FROM votes WHERE post_id = ?
    `, [postId]);
    res.json(counts[0]);
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Already voted' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== COMMENT ROUTES ==========
// Get comments for a post
app.get('/api/posts/:postId/comments', async (req, res) => {
  try {
    const [comments] = await pool.query(`
      SELECT c.*, u.username AS author_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at DESC
    `, [req.params.postId]);
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add comment (protected)
app.post('/api/posts/:postId/comments', authMiddleware, async (req, res) => {
  try {
    const { body } = req.body;
    const commentId = uuidv4();
    await pool.query(
      'INSERT INTO comments (id, post_id, user_id, body) VALUES (?, ?, ?, ?)',
      [commentId, req.params.postId, req.user.id, body]
    );
    const [comment] = await pool.query('SELECT * FROM comments WHERE id = ?', [commentId]);
    res.status(201).json(comment[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
// ========== USER PROFILE ROUTE ==========
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, email, role FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== ADMIN STATS (admin/moderator only) ==========
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}

app.get('/api/admin/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) AS totalUsers FROM users');
    const [[{ totalPosts }]] = await pool.query('SELECT COUNT(*) AS totalPosts FROM posts');
    const [[{ totalComments }]] = await pool.query('SELECT COUNT(*) AS totalComments FROM comments');
    res.json({ totalUsers, totalPosts, totalComments, pendingReports: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== LIST USERS (admin only) ==========
app.get('/api/admin/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, username, email, role, created_at FROM users');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
// ========== SAVE POST ROUTES ==========
// Toggle save
app.post('/api/posts/:id/save', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    // Check if already saved
    const [existing] = await pool.query(
      'SELECT * FROM saved_posts WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );
    if (existing.length > 0) {
      // Unsave
      await pool.query('DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?', [userId, postId]);
      return res.json({ saved: false });
    } else {
      // Save
      await pool.query('INSERT INTO saved_posts (user_id, post_id) VALUES (?, ?)', [userId, postId]);
      return res.json({ saved: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's saved posts
app.get('/api/posts/saved', authMiddleware, async (req, res) => {
  try {
    const [posts] = await pool.query(`
      SELECT p.*, u.username AS author_name,
        COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END), 0) AS upvotes,
        COALESCE(SUM(CASE WHEN v.vote_type = 'down' THEN 1 ELSE 0 END), 0) AS downvotes
      FROM saved_posts sp
      JOIN posts p ON sp.post_id = p.id
      JOIN users u ON p.author_id = u.id
      LEFT JOIN votes v ON p.id = v.post_id
      WHERE sp.user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== TRENDING POSTS (top by upvotes) ==========
app.get('/api/posts/trending', async (req, res) => {
  try {
    const [posts] = await pool.query(`
      SELECT p.*, u.username AS author_name,
        COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END), 0) AS upvotes,
        COALESCE(SUM(CASE WHEN v.vote_type = 'down' THEN 1 ELSE 0 END), 0) AS downvotes
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN votes v ON p.id = v.post_id
      GROUP BY p.id
      HAVING upvotes > 0
      ORDER BY upvotes DESC
      LIMIT 20
    `);
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== RIGHT SIDEBAR QUICK DATA ==========
app.get('/api/stats/trending-categories', async (req, res) => {
  try {
    const [categories] = await pool.query(`
      SELECT category, COUNT(*) AS count
      FROM posts
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5
    `);
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/stats/top-posts', async (req, res) => {
  try {
    const [posts] = await pool.query(`
      SELECT p.id, p.title,
        COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END), 0) AS upvotes
      FROM posts p
      LEFT JOIN votes v ON p.id = v.post_id
      GROUP BY p.id
      ORDER BY upvotes DESC
      LIMIT 5
    `);
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});