const express = require('express');
const bcrypt = require('bcryptjs');
const { getDB } = require('../database/db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });
  }
  const db = getDB();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Email đã được sử dụng' });
  }
  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)'
  ).run(name, email, hashed, phone || '', 'customer');

  const user = db.prepare('SELECT id, name, email, role, phone, address, avatar FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = generateToken(user);
  res.json({ token, user });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });
  }
  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !user.password) {
    return res.status(400).json({ error: 'Email hoặc mật khẩu không đúng' });
  }
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ error: 'Email hoặc mật khẩu không đúng' });
  }
  const token = generateToken(user);
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.post('/google', (req, res) => {
  const { name, email, google_id, avatar } = req.body;
  if (!email || !google_id) {
    return res.status(400).json({ error: 'Thông tin Google không hợp lệ' });
  }
  const db = getDB();
  let user = db.prepare('SELECT * FROM users WHERE email = ? OR google_id = ?').get(email, google_id);
  if (!user) {
    const result = db.prepare(
      'INSERT INTO users (name, email, google_id, avatar, role) VALUES (?, ?, ?, ?, ?)'
    ).run(name || email.split('@')[0], email, google_id, avatar || '', 'customer');
    user = db.prepare('SELECT id, name, email, role, phone, address, avatar FROM users WHERE id = ?').get(result.lastInsertRowid);
  } else {
    if (!user.google_id) {
      db.prepare('UPDATE users SET google_id = ?, avatar = COALESCE(NULLIF(avatar, ""), ?) WHERE id = ?')
        .run(google_id, avatar || '', user.id);
    }
    user = db.prepare('SELECT id, name, email, role, phone, address, avatar FROM users WHERE id = ?').get(user.id);
  }
  const token = generateToken(user);
  res.json({ token, user });
});

router.get('/me', authMiddleware, (req, res) => {
  const db = getDB();
  const user = db.prepare('SELECT id, name, email, role, phone, address, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  res.json({ user });
});

router.put('/profile', authMiddleware, (req, res) => {
  const { name, phone, address } = req.body;
  const db = getDB();
  db.prepare('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE id = ?')
    .run(name, phone, address, req.user.id);
  const user = db.prepare('SELECT id, name, email, role, phone, address, avatar FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

module.exports = router;
