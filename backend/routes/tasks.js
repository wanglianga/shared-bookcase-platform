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

const addActivity = (db, bookId, fromStatus, toStatus, operatorId, remark) => {
  db.prepare(
    'INSERT INTO activities (book_id, from_status, to_status, operator_id, remark) VALUES (?, ?, ?, ?, ?)'
  ).run(bookId, fromStatus, toStatus, operatorId, remark || null);
};

router.post('/:id/complete', authMiddleware, async (req, res) => {
  const db = await getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }

  const result = {};

  if (task.type === 'review' && task.book_id) {
    const { approved, comment, condition, category, bookcase_id } = req.body;
    if (approved === undefined) {
      return res.status(400).json({ error: '请选择审核结果（通过/拒绝）' });
    }
    if (approved && !category) {
      return res.status(400).json({ error: '审核通过时请选择图书分类' });
    }

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(task.book_id);
    if (!book) {
      return res.status(400).json({ error: '关联图书不存在' });
    }

    const oldStatus = book.status;
    const reviewStatus = approved ? 'approved' : 'rejected';
    const bookStatus = approved ? 'available' : 'rejected';

    const donation = db.prepare('SELECT * FROM donations WHERE book_id = ? ORDER BY created_at DESC LIMIT 1').get(task.book_id);
    if (donation) {
      db.prepare('UPDATE donations SET reviewer_id = ?, review_status = ?, review_comment = ?, condition = ? WHERE id = ?')
        .run(req.user.id, reviewStatus, comment || null, condition || null, donation.id);
    } else {
      db.prepare('INSERT INTO donations (book_id, donor_id, reviewer_id, review_status, review_comment, condition) VALUES (?, ?, ?, ?, ?, ?)')
        .run(task.book_id, book.donor_id, req.user.id, reviewStatus, comment || null, condition || null);
    }

    const updateBookFields = ['status = ?'];
    const updateBookParams = [bookStatus];
    if (category) {
      updateBookFields.push('category = ?');
      updateBookParams.push(category);
    }
    updateBookParams.push(task.book_id);
    db.prepare(`UPDATE books SET ${updateBookFields.join(', ')} WHERE id = ?`).run(...updateBookParams);

    addActivity(db, book.id, oldStatus, bookStatus, req.user.id, comment || `审核${approved ? '通过' : '拒绝'}（品相：${condition || '未填写'}）`);

    if (approved && bookcase_id) {
      const shelfTaskDesc = `将《${book.title}》上架到指定书柜`;
      const existingShelf = db.prepare("SELECT id FROM tasks WHERE book_id = ? AND type = 'shelf' AND status != 'completed'").get(task.book_id);
      if (!existingShelf) {
        db.prepare("INSERT INTO tasks (type, assignee_id, book_id, bookcase_id, status, description) VALUES ('shelf', ?, ?, ?, 'completed', ?)")
          .run(req.user.id, task.book_id, bookcase_id, shelfTaskDesc);
      }
      addActivity(db, book.id, bookStatus, bookStatus, req.user.id, `上架到书柜 #${bookcase_id}`);
    }

    result.book = db.prepare('SELECT * FROM books WHERE id = ?').get(task.book_id);
    result.approved = approved;
  }

  if (task.type === 'repair' && task.book_id) {
    const { repair_cost, paid_by, status } = req.body;
    const existingRepair = db.prepare('SELECT * FROM repairs WHERE book_id = ? ORDER BY created_at DESC LIMIT 1').get(task.book_id);
    if (existingRepair) {
      db.prepare('UPDATE repairs SET handler_id = ?, repair_cost = COALESCE(?, repair_cost), paid_by = COALESCE(?, paid_by), status = ? WHERE id = ?')
        .run(req.user.id, repair_cost || null, paid_by || null, status || 'completed', existingRepair.id);
    } else {
      db.prepare('INSERT INTO repairs (book_id, handler_id, repair_cost, paid_by, status) VALUES (?, ?, ?, ?, ?)')
        .run(task.book_id, req.user.id, repair_cost || 0, paid_by || 'community', status || 'completed');
    }

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(task.book_id);
    if (book) {
      const oldStatus = book.status;
      const newStatus = status === 'written_off' ? 'off_shelf' : 'available';
      db.prepare('UPDATE books SET status = ? WHERE id = ?').run(newStatus, task.book_id);
      addActivity(db, task.book_id, oldStatus, newStatus, req.user.id, `维修${status === 'written_off' ? '已注销' : '已完成'}`);
    }
  }

  db.prepare("UPDATE tasks SET status = 'completed' WHERE id = ?").run(req.params.id);
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json({ ...updated, ...result });
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
