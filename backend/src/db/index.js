import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(__dirname, '../../data')
const dbPath = path.join(dataDir, 'cineray.sqlite')

fs.mkdirSync(dataDir, { recursive: true })

export const db = new DatabaseSync(dbPath)

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    cpf TEXT,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    movie_id TEXT NOT NULL,
    movie_title TEXT NOT NULL,
    movie_poster TEXT NOT NULL,
    session_id TEXT NOT NULL,
    session_date TEXT NOT NULL,
    session_time TEXT NOT NULL,
    cinema TEXT NOT NULL,
    room TEXT NOT NULL,
    seat_id TEXT NOT NULL,
    seat_label TEXT NOT NULL,
    cpf TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    qr_payload TEXT NOT NULL,
    purchased_at TEXT NOT NULL,
    total_paid REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    cancelled_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS seat_holds (
    session_id TEXT NOT NULL,
    seat_id TEXT NOT NULL,
    holder_key TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    PRIMARY KEY (session_id, seat_id)
  );

  CREATE INDEX IF NOT EXISTS idx_seat_holds_expires ON seat_holds(expires_at);
`)

function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!cols.some((col) => col.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

ensureColumn('tickets', 'status', "TEXT NOT NULL DEFAULT 'active'")
ensureColumn('tickets', 'cancelled_at', 'TEXT')
ensureColumn('tickets', 'order_id', 'TEXT')
ensureColumn('tickets', 'checked_in_at', 'TEXT')
ensureColumn('tickets', 'checked_in_by', 'TEXT')
ensureColumn('users', 'role', "TEXT NOT NULL DEFAULT 'cliente'")

db.exec(`
  UPDATE tickets SET status = 'active' WHERE status IS NULL OR status = '';
`)

db.exec(`
  UPDATE tickets
  SET order_id = id
  WHERE order_id IS NULL OR order_id = '';
`)

db.exec(`
  UPDATE users SET role = 'cliente' WHERE role IS NULL OR role = '';
`)

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_tickets_order ON tickets(order_id);
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS movies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    synopsis TEXT NOT NULL DEFAULT '',
    genre TEXT NOT NULL DEFAULT '',
    rating REAL NOT NULL DEFAULT 0,
    runtime TEXT NOT NULL DEFAULT '',
    format TEXT,
    badge TEXT,
    poster TEXT NOT NULL,
    hero TEXT,
    backdrop TEXT,
    trailer_url TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS showtimes (
    id TEXT PRIMARY KEY,
    movie_id TEXT NOT NULL,
    session_date TEXT NOT NULL,
    session_time TEXT NOT NULL,
    date_label TEXT NOT NULL,
    cinema TEXT NOT NULL DEFAULT 'CineRay',
    room TEXT NOT NULL,
    created_by TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_showtimes_movie ON showtimes(movie_id);
`)

ensureColumn('movies', 'is_active', 'INTEGER NOT NULL DEFAULT 1')

db.exec(`
  UPDATE movies SET is_active = 1 WHERE is_active IS NULL;
`)

// Keep one active ticket per seat/session if legacy duplicates exist.
db.exec(`
  UPDATE tickets
  SET status = 'cancelled',
      cancelled_at = COALESCE(cancelled_at, datetime('now'))
  WHERE status = 'active'
    AND rowid NOT IN (
      SELECT MIN(rowid)
      FROM tickets
      WHERE status = 'active'
      GROUP BY session_id, seat_id
    );
`)

// Hard concurrency guard: only one active ticket per seat in a session.
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_session_seat_active
  ON tickets(session_id, seat_id)
  WHERE status = 'active';
`)
