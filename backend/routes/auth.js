const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'shared-bookcase-secret-key';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: '无效的认证令牌' });
  }
};

router.post('/register', async (req, res) => {
  const { username, password, role, name, phone } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: '用户名、密码和角色为必填项' });
  }
  const validRoles = ['resident', 'volunteer', 'property', 'ngo'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: '无效的角色类型' });
  }
  const db = await getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(400).json({ error: '用户名已存在' });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, password, role, name, phone) VALUES (?, ?, ?, ?, ?)'
  ).run(username, hashedPassword, role, name || null, phone || null);
  const user = db.prepare('SELECT id, username, role, name, phone, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = generateToken(user);
  res.json({ token, user });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码为必填项' });
  }
  const db = await getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const { password: _, ...userInfo } = user;
  const token = generateToken(user);
  res.json({ token, user: userInfo });
});

router.get('/me', authMiddleware, async (req, res) => {
  const db = await getDb();
  const user = db.prepare('SELECT id, username, role, name, phone, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json(user);
});

module.exports = { router, authMiddleware };
