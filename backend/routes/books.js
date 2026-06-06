const express = require('express');
const { getDb } = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

const addActivity = (db, bookId, fromStatus, toStatus, operatorId, remark) => {
  db.prepare(
    'INSERT INTO activities (book_id, from_status, to_status, operator_id, remark) VALUES (?, ?, ?, ?, ?)'
  ).run(bookId, fromStatus, toStatus, operatorId, remark || null);
};

router.get('/', async (req, res) => {
  const { status, category, keyword } = req.query;
  let sql = 'SELECT b.*, u.name as donor_name FROM books b LEFT JOIN users u ON b.donor_id = u.id WHERE 1=1';
  const params = [];
  if (status) {
    sql += ' AND b.status = ?';
    params.push(status);
  }
  if (category) {
    sql += ' AND b.category = ?';
    params.push(category);
  }
  if (keyword) {
    sql += ' AND (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?)';
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  sql += ' ORDER BY b.created_at DESC';
  const db = await getDb();
  const books = db.prepare(sql).all(...params);
  res.json(books);
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const book = db.prepare(
    'SELECT b.*, u.name as donor_name FROM books b LEFT JOIN users u ON b.donor_id = u.id WHERE b.id = ?'
  ).get(req.params.id);
  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }
  const donations = db.prepare('SELECT * FROM donations WHERE book_id = ?').all(req.params.id);
  const borrows = db.prepare(
    'SELECT br.*, u.name as user_name FROM borrows br LEFT JOIN users u ON br.user_id = u.id WHERE br.book_id = ? ORDER BY br.created_at DESC'
  ).all(req.params.id);
  const activities = db.prepare(
    'SELECT a.*, u.name as operator_name FROM activities a LEFT JOIN users u ON a.operator_id = u.id WHERE a.book_id = ? ORDER BY a.created_at DESC'
  ).all(req.params.id);
  res.json({ ...book, donations, borrows, activities });
});

router.post('/', authMiddleware, async (req, res) => {
  const { isbn, title, author, category, description, cover_url } = req.body;
  if (!title) {
    return res.status(400).json({ error: '图书标题为必填项' });
  }
  const db = await getDb();
  const donorId = req.user.id;
  const result = db.prepare(
    'INSERT INTO books (isbn, title, author, category, description, cover_url, status, donor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(isbn || null, title, author || null, category || null, description || null, cover_url || null, 'donated', donorId);
  const bookId = result.lastInsertRowid;
  db.prepare(
    'INSERT INTO donations (book_id, donor_id, review_status) VALUES (?, ?, ?)'
  ).run(bookId, donorId, 'pending');
  addActivity(db, bookId, null, 'donated', donorId, '图书捐赠提交');
  db.prepare(
    "INSERT INTO tasks (type, book_id, status, description) VALUES ('review', ?, 'pending', ?)"
  ).run(bookId, '审核新捐赠图书');
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
  res.status(201).json(book);
});

router.put('/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }
  const { isbn, title, author, category, description, cover_url, status } = req.body;
  const oldStatus = book.status;
  db.prepare(
    'UPDATE books SET isbn = COALESCE(?, isbn), title = COALESCE(?, title), author = COALESCE(?, author), category = COALESCE(?, category), description = COALESCE(?, description), cover_url = COALESCE(?, cover_url), status = COALESCE(?, status) WHERE id = ?'
  ).run(isbn, title, author, category, description, cover_url, status, req.params.id);
  if (status && status !== oldStatus) {
    addActivity(db, book.id, oldStatus, status, req.user.id, '图书状态更新');
  }
  const updated = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }
  db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

router.post('/:id/review', authMiddleware, async (req, res) => {
  const { approved, comment, condition } = req.body;
  const db = await getDb();
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }
  const donation = db.prepare('SELECT * FROM donations WHERE book_id = ? ORDER BY created_at DESC LIMIT 1').get(req.params.id);
  if (!donation) {
    return res.status(400).json({ error: '未找到捐赠记录' });
  }
  const oldStatus = book.status;
  const reviewStatus = approved ? 'approved' : 'rejected';
  const bookStatus = approved ? 'available' : 'rejected';
  db.prepare('UPDATE donations SET reviewer_id = ?, review_status = ?, review_comment = ?, condition = ? WHERE id = ?')
    .run(req.user.id, reviewStatus, comment || null, condition || null, donation.id);
  db.prepare('UPDATE books SET status = ? WHERE id = ?').run(bookStatus, book.id);
  addActivity(db, book.id, oldStatus, bookStatus, req.user.id, comment || `审核${approved ? '通过' : '拒绝'}`);
  db.prepare("UPDATE tasks SET status = 'completed', assignee_id = ? WHERE book_id = ? AND type = 'review' AND status != 'completed'")
    .run(req.user.id, book.id);
  const updated = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.post('/:id/borrow', authMiddleware, async (req, res) => {
  const { due_date } = req.body;
  const db = await getDb();
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }
  if (book.status !== 'available') {
    return res.status(400).json({ error: '该图书当前不可借阅' });
  }
  const due = due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO borrows (book_id, user_id, due_date, status) VALUES (?, ?, ?, ?)')
    .run(book.id, req.user.id, due, 'active');
  const oldStatus = book.status;
  db.prepare('UPDATE books SET status = ? WHERE id = ?').run('borrowed', book.id);
  addActivity(db, book.id, oldStatus, 'borrowed', req.user.id, '图书借阅');
  const updated = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.post('/:id/return', authMiddleware, async (req, res) => {
  const { return_photo, condition } = req.body;
  const db = await getDb();
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }
  const borrow = db.prepare("SELECT * FROM borrows WHERE book_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1").get(req.params.id);
  if (!borrow) {
    return res.status(400).json({ error: '该图书没有在借记录' });
  }
  const now = new Date();
  const due = new Date(borrow.due_date);
  let fine = 0;
  let status = 'returned';
  if (now > due) {
    const days = Math.ceil((now - due) / (24 * 60 * 60 * 1000));
    fine = days * 0.5;
    status = 'overdue';
  }
  const oldStatus = book.status;
  let newBookStatus = 'available';
  if (condition === 'poor' || condition === 'missing_pages') {
    newBookStatus = 'damaged';
    db.prepare("INSERT INTO repairs (book_id, damage_type, status) VALUES (?, ?, 'pending')")
      .run(book.id, condition === 'missing_pages' ? '缺页' : '破损');
    db.prepare("INSERT INTO tasks (type, book_id, status, description) VALUES ('repair', ?, 'pending', ?)")
      .run(book.id, '处理破损图书');
  }
  db.prepare('UPDATE borrows SET return_date = ?, status = ?, return_photo = ?, overdue_fine = ? WHERE id = ?')
    .run(now.toISOString(), status, return_photo || null, fine, borrow.id);
  db.prepare('UPDATE books SET status = ? WHERE id = ?').run(newBookStatus, book.id);
  addActivity(db, book.id, oldStatus, newBookStatus, req.user.id, `归还图书${fine > 0 ? `，逾期罚金¥${fine.toFixed(2)}` : ''}`);
  const updated = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  res.json({ book: updated, fine });
});

router.get('/:id/history', async (req, res) => {
  const db = await getDb();
  const activities = db.prepare(
    'SELECT a.*, u.name as operator_name FROM activities a LEFT JOIN users u ON a.operator_id = u.id WHERE a.book_id = ? ORDER BY a.created_at DESC'
  ).all(req.params.id);
  res.json(activities);
});

module.exports = router;
