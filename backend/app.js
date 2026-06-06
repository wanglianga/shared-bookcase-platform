const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { getDb } = require('./db');

const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const bookcasesRoutes = require('./routes/bookcases');
const tasksRoutes = require('./routes/tasks');
const statisticsRoutes = require('./routes/statistics');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '共享书柜平台后端服务运行正常' });
});

app.use('/api/auth', authRoutes.router);
app.use('/api/books', booksRoutes);
app.use('/api/bookcases', bookcasesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/statistics', statisticsRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

const start = async () => {
  await getDb();
  app.listen(PORT, () => {
    console.log(`共享书柜平台后端服务已启动: http://localhost:${PORT}`);
    console.log(`API 前缀: /api`);
  });
};

start();

module.exports = app;
