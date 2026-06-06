const express = require('express');
const { getDb } = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const { status, type, assignee_id } = req.query;
  let sql = `SELECT t.*, u.name as assignee_name, b.title as book_title, bc.name as bookcase_name
             FROM tasks t
             LEFT JOIN users u ON t.assignee_id = u.id
             LEFT JOIN books b ON t.book_id = b.id
             LEFT JOIN bookcases bc ON t.bookcase_id = bc.id
             WHERE 1=1`;
  const params = [];
  if (status) {
    sql += ' AND t.status = ?';
    params.push(status);
  }
  if (type) {
    sql += ' AND t.type = ?';
    params.push(type);
  }
  if (assignee_id) {
    sql += ' AND t.assignee_id = ?';
    params.push(assignee_id);
  }
  sql += ' ORDER BY t.created_at DESC';
  const db = await getDb();
  const tasks = db.prepare(sql).all(...params);
  res.json(tasks);
});

router.get('/my', authMiddleware, async (req, res) => {
  const { status } = req.query;
  let sql = `SELECT t.*, b.title as book_title, bc.name as bookcase_name
             FROM tasks t
             LEFT JOIN books b ON t.book_id = b.id
             LEFT JOIN bookcases bc ON t.bookcase_id = bc.id
             WHERE t.assignee_id = ?`;
  const params = [req.user.id];
  if (status) {
    sql += ' AND t.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY t.created_at DESC';
  const db = await getDb();
  const tasks = db.prepare(sql).all(...params);
  res.json(tasks);
});

router.get('/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, b.title as book_title, bc.name as bookcase_name
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    LEFT JOIN books b ON t.book_id = b.id
    LEFT JOIN bookcases bc ON t.bookcase_id = bc.id
    WHERE t.id = ?
  `).get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }
  res.json(task);
});

router.post('/', authMiddleware, async (req, res) => {
  const { type, assignee_id, book_id, bookcase_id, description, due_date } = req.body;
  if (!type) {
    return res.status(400).json({ error: '任务类型为必填项' });
  }
  const validTypes = ['review', 'shelf', 'inventory', 'clean', 'repair'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: '无效的任务类型' });
  }
  const db = await getDb();
  const result = db.prepare(
    'INSERT INTO tasks (type, assignee_id, book_id, bookcase_id, description, due_date) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(type, assignee_id || null, book_id || null, bookcase_id || null, description || null, due_date || null);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

router.put('/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }
  const { assignee_id, status, description, due_date } = req.body;
  db.prepare(
    'UPDATE tasks SET assignee_id = COALESCE(?, assignee_id), status = COALESCE(?, status), description = COALESCE(?, description), due_date = COALESCE(?, due_date) WHERE id = ?'
  ).run(assignee_id, status, description, due_date, req.params.id);
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.post('/:id/claim', authMiddleware, async (req, res) => {
  const db = await getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }
  if (task.assignee_id) {
    return res.status(400).json({ error: '该任务已被领取' });
  }
  db.prepare("UPDATE tasks SET assignee_id = ?, status = 'processing' WHERE id = ?")
    .run(req.user.id, req.params.id);
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.post('/:id/complete', authMiddleware, async (req, res) => {
  const db = await getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }
  db.prepare("UPDATE tasks SET status = 'completed' WHERE id = ?").run(req.params.id);
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

module.exports = router;
