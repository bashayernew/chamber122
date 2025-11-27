// server/db.js - SQLite database setup
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');

// Create database instance
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Initialize schema
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'msme',
      name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Businesses table
  db.run(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      owner_id TEXT UNIQUE NOT NULL,
      name TEXT,
      business_name TEXT,
      description TEXT,
      short_description TEXT,
      story TEXT,
      industry TEXT,
      category TEXT,
      country TEXT,
      city TEXT,
      area TEXT,
      block TEXT,
      street TEXT,
      floor TEXT,
      office_no TEXT,
      phone TEXT,
      whatsapp TEXT,
      website TEXT,
      instagram TEXT,
      logo_url TEXT,
      is_active INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Business media table
  db.run(`
    CREATE TABLE IF NOT EXISTS business_media (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      public_url TEXT NOT NULL,
      file_type TEXT,
      document_type TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    )
  `);

  // Events table
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      business_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      start_at TEXT,
      end_at TEXT,
      location TEXT,
      cover_image_url TEXT,
      status TEXT DEFAULT 'draft',
      is_published INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL
    )
  `);
  
  // Add cover_image_url column if it doesn't exist (migration)
  db.run(`
    ALTER TABLE events ADD COLUMN cover_image_url TEXT
  `, (err) => {
    // Column already exists, ignore error
    if (err && !err.message.includes('duplicate column')) {
      console.error('Migration error:', err);
    }
  });

  // Bulletins table
  db.run(`
    CREATE TABLE IF NOT EXISTS bulletins (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      business_id TEXT,
      title TEXT NOT NULL,
      content TEXT,
      body TEXT,
      category TEXT,
      image_url TEXT,
      url TEXT,
      start_at TEXT,
      end_at TEXT,
      status TEXT DEFAULT 'published',
      is_published INTEGER DEFAULT 1,
      is_pinned INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL
    )
  `);

  // Add image_url column if it doesn't exist (migration)
  db.run(`
    ALTER TABLE bulletins ADD COLUMN image_url TEXT
  `, (err) => {
    // Column already exists, ignore error
    if (err && !err.message.includes('duplicate column')) {
      console.error('Migration error (bulletins.image_url):', err);
    }
  });

  // Event registrations table
  db.run(`
    CREATE TABLE IF NOT EXISTS event_registrations (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    )
  `);

  // Bulletin registrations table
  db.run(`
    CREATE TABLE IF NOT EXISTS bulletin_registrations (
      id TEXT PRIMARY KEY,
      bulletin_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (bulletin_id) REFERENCES bulletins(id) ON DELETE CASCADE
    )
  `);

  // Conversations table - links two users/businesses for messaging
  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      participant1_id TEXT NOT NULL,
      participant2_id TEXT NOT NULL,
      participant1_type TEXT DEFAULT 'user',
      participant2_type TEXT DEFAULT 'user',
      last_message_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (participant1_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (participant2_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(participant1_id, participant2_id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating conversations table:', err);
    } else {
      console.log('✅ Conversations table created or already exists');
    }
  });

  // Messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating messages table:', err);
    } else {
      console.log('✅ Messages table created or already exists');
    }
  });

  // Create indexes for faster queries
  db.run(`CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`);

  console.log('✅ Database schema initialized');
});

// Helper functions for async operations
const dbHelpers = {
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  prepare: (sql) => {
    const stmt = db.prepare(sql);
    return {
      run: (...params) => {
        return new Promise((resolve, reject) => {
          stmt.run(...params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
          });
        });
      },
      get: (...params) => {
        return new Promise((resolve, reject) => {
          stmt.get(...params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      },
      all: (...params) => {
        return new Promise((resolve, reject) => {
          stmt.all(...params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
      },
      finalize: () => stmt.finalize()
    };
  }
};

module.exports = dbHelpers;
