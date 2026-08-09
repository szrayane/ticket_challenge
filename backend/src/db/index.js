import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes, scryptSync } from 'node:crypto'
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
ensureColumn('movies', 'tmdb_id', 'INTEGER')
ensureColumn('movies', 'source', "TEXT NOT NULL DEFAULT 'local'")
ensureColumn('showtimes', 'capacity', 'INTEGER NOT NULL DEFAULT 50')
ensureColumn('showtimes', 'price', 'REAL NOT NULL DEFAULT 28')
ensureColumn('tickets', 'share_token', 'TEXT')

db.exec(`
  UPDATE movies SET is_active = 1 WHERE is_active IS NULL;
  UPDATE showtimes SET capacity = 50 WHERE capacity IS NULL OR capacity = 0;
  UPDATE showtimes SET price = 28 WHERE price IS NULL OR price = 0;
`)

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_share_token
  ON tickets(share_token)
  WHERE share_token IS NOT NULL AND share_token != '';
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

function seedUser({ id, email, name, role, password }) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    db.prepare('UPDATE users SET role = ?, name = ? WHERE email = ?').run(
      role,
      name,
      email,
    )
    return existing.id
  }
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  db.prepare(
    `INSERT INTO users (id, email, name, cpf, password_hash, password_salt, created_at, role)
     VALUES (?, ?, ?, NULL, ?, ?, ?, ?)`,
  ).run(id, email, name, hash, salt, new Date().toISOString(), role)
  return id
}

const organizerId = seedUser({
  id: 'usr_organizador_demo',
  email: 'organizador@cineray.com',
  name: 'Ana Organizadora',
  role: 'organizador',
  password: 'org1234',
})
seedUser({
  id: 'usr_cliente_demo_1',
  email: 'cliente1@cineray.com',
  name: 'Bruno Cliente',
  role: 'cliente',
  password: 'cli1234',
})
seedUser({
  id: 'usr_cliente_demo_2',
  email: 'cliente2@cineray.com',
  name: 'Carla Cliente',
  role: 'cliente',
  password: 'cli1234',
})
seedUser({
  id: 'usr_portaria_demo',
  email: 'portaria@cineray.com',
  name: 'Diego Portaria',
  role: 'portaria',
  password: 'porta1234',
})

function seedPublishedEvent() {
  const existing = db
    .prepare(`SELECT id FROM movies WHERE id = ? OR tmdb_id = ?`)
    .get('mov_seed_dune', 693134)
  if (existing) return

  const movieId = 'mov_seed_dune'
  const showtimeId = 'st_seed_dune'
  const now = new Date().toISOString()
  const start = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  const sessionDate = `${pad(start.getDate())}/${pad(start.getMonth() + 1)}/${start.getFullYear()}`
  const sessionTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`
  const weekday = start.toLocaleDateString('pt-BR', { weekday: 'long' })
  const poster =
    'https://image.tmdb.org/t/p/w500/vNMPddfv47amK83lCFoBd9wXVuc.jpg'
  const backdrop =
    'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg'

  db.prepare(
    `INSERT INTO movies (
      id, title, synopsis, genre, rating, runtime, format, badge,
      poster, hero, backdrop, trailer_url, created_by, created_at, updated_at,
      is_active, tmdb_id, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 1, ?, ?)`,
  ).run(
    movieId,
    'Duna: Parte Dois',
    'Paul Atreides se une a Chani e aos Fremen enquanto busca vingança contra os conspiradores que destruíram sua família.',
    'Ficção científica, Aventura',
    8.3,
    '166 min',
    '2D',
    'TMDb',
    poster,
    backdrop,
    backdrop,
    organizerId,
    now,
    now,
    693134,
    'tmdb',
  )

  db.prepare(
    `INSERT INTO showtimes (
      id, movie_id, session_date, session_time, date_label, cinema, room,
      capacity, price, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    showtimeId,
    movieId,
    sessionDate,
    sessionTime,
    `${weekday}, ${sessionDate}`,
    'CineRay Centro',
    'Sala 1',
    40,
    32,
    organizerId,
    now,
  )
}

try {
  seedPublishedEvent()
} catch (error) {
  console.warn('[seed] evento publicado:', error.message)
}
