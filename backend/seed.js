const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

console.log('开始初始化种子数据...');

const seed = async () => {
  const db = await getDb();

  const insertUser = db.prepare(
    'INSERT OR IGNORE INTO users (username, password, role, name, phone) VALUES (?, ?, ?, ?, ?)'
  );
  const users = [
    { username: 'resident1', password: '123456', role: 'resident', name: '张居民', phone: '13800000001' },
    { username: 'resident2', password: '123456', role: 'resident', name: '李阿姨', phone: '13800000002' },
    { username: 'volunteer1', password: '123456', role: 'volunteer', name: '王志愿', phone: '13800000003' },
    { username: 'volunteer2', password: '123456', role: 'volunteer', name: '赵义工', phone: '13800000004' },
    { username: 'property1', password: '123456', role: 'property', name: '孙物业', phone: '13800000005' },
    { username: 'ngo1', password: '123456', role: 'ngo', name: '公益组织管理员', phone: '13800000006' },
  ];
  users.forEach(u => {
    const hashed = bcrypt.hashSync(u.password, 10);
    insertUser.run(u.username, hashed, u.role, u.name, u.phone);
  });
  console.log(`已初始化 ${users.length} 个测试用户`);

  const userId = (username) => db.prepare('SELECT id FROM users WHERE username = ?').get(username)?.id;

  const insertBookcase = db.prepare(
    'INSERT OR IGNORE INTO bookcases (name, location, lat, lng, status, capacity, last_cleaned) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const bookcases = [
    { name: '1号楼书柜', location: '阳光花园1号楼大厅', lat: 39.9042, lng: 116.4074, status: 'normal', capacity: 60, last_cleaned: '2024-01-01T10:00:00Z' },
    { name: '3号楼书柜', location: '阳光花园3号楼单元门口', lat: 39.9055, lng: 116.4088, status: 'normal', capacity: 50, last_cleaned: '2024-01-02T09:30:00Z' },
    { name: '5号楼书柜', location: '阳光花园5号楼物业服务中心旁', lat: 39.9038, lng: 116.4062, status: 'normal', capacity: 80, last_cleaned: '2024-01-03T14:00:00Z' },
    { name: '社区中心书柜', location: '阳光花园社区活动中心', lat: 39.9060, lng: 116.4100, status: 'normal', capacity: 100, last_cleaned: '2024-01-04T08:00:00Z' },
  ];
  bookcases.forEach(bc => insertBookcase.run(bc.name, bc.location, bc.lat, bc.lng, bc.status, bc.capacity, bc.last_cleaned));
  console.log(`已初始化 ${bookcases.length} 个书柜`);

  const insertBook = db.prepare(
    'INSERT OR IGNORE INTO books (isbn, title, author, category, description, cover_url, status, donor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const books = [
    { isbn: '9787020002207', title: '红楼梦', author: '曹雪芹', category: '文学古典', description: '中国古典四大名著之一', status: 'available', donor: 'resident1' },
    { isbn: '9787020008735', title: '百年孤独', author: '加西亚·马尔克斯', category: '外国文学', description: '魔幻现实主义代表作', status: 'available', donor: 'resident2' },
    { isbn: '9787111213826', title: '深入理解计算机系统', author: 'Randal E.Bryant', category: '计算机', description: '计算机系统经典教材', status: 'borrowed', donor: 'resident1' },
    { isbn: '9787544270878', title: '小王子', author: '圣埃克苏佩里', category: '儿童文学', description: '献给所有曾经是孩子的大人', status: 'available', donor: 'resident2' },
    { isbn: '9787530211199', title: '活着', author: '余华', category: '当代文学', description: '讲述一个人一生的故事', status: 'donated', donor: 'resident1' },
    { isbn: '9787544291163', title: '人间失格', author: '太宰治', category: '外国文学', description: '日本文学经典', status: 'damaged', donor: 'resident2' },
    { isbn: '9787115428028', title: '算法导论', author: 'Thomas H.Cormen', category: '计算机', description: '算法领域经典教材', status: 'repairing', donor: 'resident1' },
    { isbn: '9787020103126', title: '围城', author: '钱钟书', category: '现代文学', description: '新儒林外史', status: 'available', donor: 'resident2' },
  ];
  const bookIds = [];
  books.forEach(b => {
    const result = insertBook.run(b.isbn, b.title, b.author, b.category, b.description, null, b.status, userId(b.donor));
    if (result.lastInsertRowid) {
      bookIds.push(result.lastInsertRowid);
    }
  });
  console.log(`已初始化 ${books.length} 本示例图书`);

  if (bookIds.length > 0) {
    const insertDonation = db.prepare(
      'INSERT INTO donations (book_id, donor_id, review_status, condition) VALUES (?, ?, ?, ?)'
    );
    insertDonation.run(bookIds[0], userId('resident1'), 'approved', 'good');
    insertDonation.run(bookIds[1], userId('resident2'), 'approved', 'good');
    insertDonation.run(bookIds[4], userId('resident1'), 'pending', null);
    insertDonation.run(bookIds[5], userId('resident2'), 'approved', 'poor');
    console.log('已初始化捐赠记录');

    const insertBorrow = db.prepare(
      'INSERT INTO borrows (book_id, user_id, borrow_date, due_date, return_date, status, overdue_fine) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const now = new Date();
    const past30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const past10 = new Date(now - 10 * 24 * 60 * 60 * 1000);
    const future20 = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);
    const past5 = new Date(now - 5 * 24 * 60 * 60 * 1000);
    insertBorrow.run(bookIds[2], userId('resident2'), past10.toISOString(), future20.toISOString(), null, 'active', 0);
    insertBorrow.run(bookIds[0], userId('resident2'), past30.toISOString(), past5.toISOString(), past5.toISOString(), 'returned', 0);
    insertBorrow.run(bookIds[1], userId('resident1'), past30.toISOString(), past5.toISOString(), null, 'overdue', 12.5);
    console.log('已初始化借阅记录');

    const insertActivity = db.prepare(
      'INSERT INTO activities (book_id, from_status, to_status, operator_id, remark) VALUES (?, ?, ?, ?, ?)'
    );
    insertActivity.run(bookIds[0], null, 'donated', userId('resident1'), '居民捐赠');
    insertActivity.run(bookIds[0], 'donated', 'available', userId('volunteer1'), '审核通过');
    insertActivity.run(bookIds[0], 'available', 'borrowed', userId('resident2'), '借阅图书');
    insertActivity.run(bookIds[0], 'borrowed', 'available', userId('resident2'), '按期归还');
    insertActivity.run(bookIds[2], null, 'donated', userId('resident1'), '居民捐赠');
    insertActivity.run(bookIds[2], 'donated', 'available', userId('volunteer1'), '审核通过');
    insertActivity.run(bookIds[2], 'available', 'borrowed', userId('resident2'), '借阅图书');
    console.log('已初始化活动记录');
  }

  const insertTask = db.prepare(
    'INSERT INTO tasks (type, assignee_id, book_id, bookcase_id, status, description, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  insertTask.run('review', userId('volunteer1'), bookIds[4] || null, null, 'pending', '审核新捐赠的图书《活着》', null);
  insertTask.run('shelf', userId('volunteer2'), bookIds[0] || null, 1, 'completed', '将《红楼梦》上架到1号楼书柜', null);
  insertTask.run('clean', null, null, 2, 'pending', '清洁3号楼书柜', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
  insertTask.run('inventory', userId('volunteer1'), null, 3, 'processing', '清点5号楼书柜库存', null);
  insertTask.run('repair', null, bookIds[6] || null, null, 'pending', '维修破损的《算法导论》', null);
  console.log('已初始化志愿者任务');

  const insertRepair = db.prepare(
    'INSERT INTO repairs (book_id, handler_id, damage_type, repair_cost, paid_by, status) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertRepair.run(bookIds[5] || 1, null, '封面破损', 15, 'community', 'pending');
  insertRepair.run(bookIds[6] || 1, userId('volunteer1'), '书脊开裂', 30, 'donor', 'completed');
  console.log('已初始化维修记录');

  console.log('\n种子数据初始化完成！');
  console.log('\n测试账号：');
  console.log('  居民: resident1 / 123456');
  console.log('  居民: resident2 / 123456');
  console.log('  志愿者: volunteer1 / 123456');
  console.log('  志愿者: volunteer2 / 123456');
  console.log('  物业: property1 / 123456');
  console.log('  公益组织: ngo1 / 123456');
};

seed().catch(console.error);
