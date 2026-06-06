const express = require('express');
const { getDb } = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT * FROM bookcases WHERE 1=1';
  const params = [];
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC';
  const db = await getDb();
  const bookcases = db.prepare(sql).all(...params);
  res.json(bookcases);
});

router.get('/map', async (req, res) => {
  const { lat, lng, radius } = req.query;
  const db = await getDb();
  let bookcases = db.prepare("SELECT * FROM bookcases WHERE lat IS NOT NULL AND lng IS NOT NULL AND status != 'maintenance'").all();
  if (lat && lng && radius) {
    const centerLat = parseFloat(lat);
    const centerLng = parseFloat(lng);
    const r = parseFloat(radius) || 5;
    bookcases = bookcases.filter(bc => {
      const R = 6371;
      const dLat = (bc.lat - centerLat) * Math.PI / 180;
      const dLng = (bc.lng - centerLng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(centerLat * Math.PI / 180) * Math.cos(bc.lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      const distance = 2 * R * Math.asin(Math.sqrt(a));
      return distance <= r;
    });
  }
  res.json(bookcases);
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const bookcase = db.prepare('SELECT * FROM bookcases WHERE id = ?').get(req.params.id);
  if (!bookcase) {
    return res.status(404).json({ error: '书柜不存在' });
  }
  const tasks = db.prepare("SELECT * FROM tasks WHERE bookcase_id = ? ORDER BY created_at DESC").all(req.params.id);
  res.json({ ...bookcase, tasks });
});

router.post('/', authMiddleware, async (req, res) => {
  const { name, location, lat, lng, capacity } = req.body;
  if (!name) {
    return res.status(400).json({ error: '书柜名称为必填项' });
  }
  const db = await getDb();
  const result = db.prepare(
    'INSERT INTO bookcases (name, location, lat, lng, capacity) VALUES (?, ?, ?, ?, ?)'
  ).run(name, location || null, lat || null, lng || null, capacity || 50);
  const bookcase = db.prepare('SELECT * FROM bookcases WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(bookcase);
});

router.put('/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const bookcase = db.prepare('SELECT * FROM bookcases WHERE id = ?').get(req.params.id);
  if (!bookcase) {
    return res.status(404).json({ error: '书柜不存在' });
  }
  const { name, location, lat, lng, status, capacity, last_cleaned } = req.body;
  db.prepare(
    'UPDATE bookcases SET name = COALESCE(?, name), location = COALESCE(?, location), lat = COALESCE(?, lat), lng = COALESCE(?, lng), status = COALESCE(?, status), capacity = COALESCE(?, capacity), last_cleaned = COALESCE(?, last_cleaned) WHERE id = ?'
  ).run(name, location, lat, lng, status, capacity, last_cleaned, req.params.id);
  if (status === 'water_damaged') {
    db.prepare("INSERT INTO tasks (type, bookcase_id, status, description) VALUES ('repair', ?, 'pending', ?)")
      .run(bookcase.id, '处理书柜进水问题');
  }
  const updated = db.prepare('SELECT * FROM bookcases WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const bookcase = db.prepare('SELECT * FROM bookcases WHERE id = ?').get(req.params.id);
  if (!bookcase) {
    return res.status(404).json({ error: '书柜不存在' });
  }
  db.prepare('DELETE FROM bookcases WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

router.post('/:id/clean', authMiddleware, async (req, res) => {
  const db = await getDb();
  const bookcase = db.prepare('SELECT * FROM bookcases WHERE id = ?').get(req.params.id);
  if (!bookcase) {
    return res.status(404).json({ error: '书柜不存在' });
  }
  const now = new Date().toISOString();
  db.prepare('UPDATE bookcases SET last_cleaned = ? WHERE id = ?').run(now, req.params.id);
  db.prepare("UPDATE tasks SET status = 'completed', assignee_id = ? WHERE bookcase_id = ? AND type = 'clean' AND status != 'completed'")
    .run(req.user.id, bookcase.id);
  const updated = db.prepare('SELECT * FROM bookcases WHERE id = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;
