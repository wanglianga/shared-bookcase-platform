const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

router.get('/overview', async (req, res) => {
  const db = await getDb();
  const totalBooks = db.prepare('SELECT COUNT(*) as count FROM books').get().count;
  const availableBooks = db.prepare("SELECT COUNT(*) as count FROM books WHERE status = 'available'").get().count;
  const borrowedBooks = db.prepare("SELECT COUNT(*) as count FROM books WHERE status = 'borrowed'").get().count;
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const totalDonations = db.prepare('SELECT COUNT(*) as count FROM donations').get().count;
  const totalBorrows = db.prepare('SELECT COUNT(*) as count FROM borrows').get().count;
  const totalBookcases = db.prepare('SELECT COUNT(*) as count FROM bookcases').get().count;
  const pendingTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'pending'").get().count;
  res.json({
    totalBooks,
    availableBooks,
    borrowedBooks,
    totalUsers,
    totalDonations,
    totalBorrows,
    totalBookcases,
    pendingTasks
  });
});

router.get('/donation-sources', async (req, res) => {
  const db = await getDb();
  const sources = db.prepare(`
    SELECT u.id, u.name, u.role, COUNT(d.id) as donation_count
    FROM donations d
    LEFT JOIN users u ON d.donor_id = u.id
    GROUP BY d.donor_id
    ORDER BY donation_count DESC
  `).all();
  const byRole = db.prepare(`
    SELECT u.role, COUNT(d.id) as count
    FROM donations d
    LEFT JOIN users u ON d.donor_id = u.id
    GROUP BY u.role
    ORDER BY count DESC
  `).all();
  res.json({ sources, byRole });
});

router.get('/book-circulation', async (req, res) => {
  const db = await getDb();
  const topBooks = db.prepare(`
    SELECT b.id, b.title, b.author, COUNT(br.id) as borrow_count
    FROM books b
    LEFT JOIN borrows br ON b.id = br.book_id
    GROUP BY b.id
    ORDER BY borrow_count DESC
    LIMIT 20
  `).all();
  const categoryStats = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM books
    WHERE category IS NOT NULL
    GROUP BY category
    ORDER BY count DESC
  `).all();
  res.json({ topBooks, categoryStats });
});

router.get('/activity-effect', async (req, res) => {
  const db = await getDb();
  const statusFlow = db.prepare(`
    SELECT from_status, to_status, COUNT(*) as count
    FROM activities
    WHERE from_status IS NOT NULL
    GROUP BY from_status, to_status
    ORDER BY count DESC
  `).all();
  const monthlyData = db.prepare(`
    SELECT 
      strftime('%Y-%m', created_at) as month,
      SUM(CASE WHEN to_status = 'donated' THEN 1 ELSE 0 END) as donations,
      SUM(CASE WHEN to_status = 'available' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN to_status = 'borrowed' THEN 1 ELSE 0 END) as borrows,
      SUM(CASE WHEN to_status = 'returned' THEN 1 ELSE 0 END) as returns
    FROM activities
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `).all();
  const volunteerStats = db.prepare(`
    SELECT u.id, u.name, 
      SUM(CASE WHEN t.type = 'review' THEN 1 ELSE 0 END) as review_count,
      SUM(CASE WHEN t.type = 'shelf' THEN 1 ELSE 0 END) as shelf_count,
      SUM(CASE WHEN t.type = 'clean' THEN 1 ELSE 0 END) as clean_count,
      SUM(CASE WHEN t.type = 'repair' THEN 1 ELSE 0 END) as repair_count,
      COUNT(t.id) as total_tasks
    FROM users u
    LEFT JOIN tasks t ON u.id = t.assignee_id AND t.status = 'completed'
    WHERE u.role = 'volunteer'
    GROUP BY u.id
    ORDER BY total_tasks DESC
  `).all();
  res.json({ statusFlow, monthlyData, volunteerStats });
});

router.get('/bookcase-status', async (req, res) => {
  const db = await getDb();
  const statuses = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM bookcases
    GROUP BY status
  `).all();
  const usage = db.prepare(`
    SELECT bc.id, bc.name, bc.location, bc.capacity,
      COUNT(b.id) as current_books
    FROM bookcases bc
    LEFT JOIN books b ON b.status IN ('available', 'borrowed')
    GROUP BY bc.id
  `).all();
  res.json({ statuses, usage });
});

module.exports = router;
