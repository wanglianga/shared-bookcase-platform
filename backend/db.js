const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

let dbPromise = null;

const getDb = async () => {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const SQL = await initSqlJs();
    const dbPath = path.join(__dirname, 'database.db');

    let db;
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }

    let saveTimer = null;
    const scheduleSave = () => {
      if (saveTimer) return;
      saveTimer = setTimeout(() => {
        saveTimer = null;
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
      }, 50);
    };

    const wrapStatement = (stmt) => {
      const boundArgs = [];
      return {
        run: (...args) => {
          stmt.bind(args.length ? args : []);
          stmt.step();
          stmt.reset();
          const lastId = db.exec('SELECT last_insert_rowid() as id')[0]?.values?.[0]?.[0] || null;
          scheduleSave();
          return { lastInsertRowid: lastId, changes: 1 };
        },
        get: (...args) => {
          stmt.bind(args.length ? args : []);
          let row = undefined;
          if (stmt.step()) {
            row = stmt.getAsObject();
          }
          stmt.reset();
          return row;
        },
        all: (...args) => {
          stmt.bind(args.length ? args : []);
          const rows = [];
          while (stmt.step()) {
            rows.push(stmt.getAsObject());
          }
          stmt.reset();
          return rows;
        }
      };
    };

    const wrappedDb = {
      prepare: (sql) => {
        const stmt = db.prepare(sql);
        return wrapStatement(stmt);
      },
      exec: (sql) => {
        db.exec(sql);
        scheduleSave();
      },
      pragma: () => {},
      close: () => db.close()
    };

    wrappedDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('resident', 'volunteer', 'property', 'ngo')),
        name TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        isbn TEXT,
        title TEXT NOT NULL,
        author TEXT,
        category TEXT,
        description TEXT,
        cover_url TEXT,
        status TEXT NOT NULL DEFAULT 'donated' CHECK(status IN ('donated', 'pending_review', 'rejected', 'available', 'borrowed', 'damaged', 'repairing', 'off_shelf')),
        donor_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (donor_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS bookcases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT,
        lat REAL,
        lng REAL,
        status TEXT NOT NULL DEFAULT 'normal' CHECK(status IN ('normal', 'water_damaged', 'maintenance')),
        capacity INTEGER DEFAULT 50,
        last_cleaned DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        donor_id INTEGER NOT NULL,
        reviewer_id INTEGER,
        review_status TEXT DEFAULT 'pending' CHECK(review_status IN ('pending', 'approved', 'rejected')),
        review_comment TEXT,
        condition TEXT CHECK(condition IN ('good', 'fair', 'poor', 'missing_pages')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id),
        FOREIGN KEY (donor_id) REFERENCES users(id),
        FOREIGN KEY (reviewer_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS borrows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        borrow_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        due_date DATETIME NOT NULL,
        return_date DATETIME,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'returned', 'overdue', 'lost')),
        return_photo TEXT,
        overdue_fine REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS repairs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        handler_id INTEGER,
        damage_type TEXT,
        repair_cost REAL DEFAULT 0,
        paid_by TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'written_off')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id),
        FOREIGN KEY (handler_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('review', 'shelf', 'inventory', 'clean', 'repair')),
        assignee_id INTEGER,
        book_id INTEGER,
        bookcase_id INTEGER,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed')),
        description TEXT,
        due_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assignee_id) REFERENCES users(id),
        FOREIGN KEY (book_id) REFERENCES books(id),
        FOREIGN KEY (bookcase_id) REFERENCES bookcases(id)
      );

      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER,
        from_status TEXT,
        to_status TEXT,
        operator_id INTEGER,
        remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id),
        FOREIGN KEY (operator_id) REFERENCES users(id)
      );
    `);

    return wrappedDb;
  })();

  return dbPromise;
};

module.exports = { getDb };
