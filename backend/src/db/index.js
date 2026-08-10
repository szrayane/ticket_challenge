import { randomBytes, scryptSync } from 'node:crypto'
import {
  createPoolFromEnv,
  execute,
  queryOne,
  setPool,
} from './client.js'

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  cpf VARCHAR(32) NULL,
  password_hash VARCHAR(128) NOT NULL,
  password_salt VARCHAR(64) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'cliente'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS movies (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  synopsis TEXT NOT NULL,
  genre VARCHAR(255) NOT NULL DEFAULT '',
  rating DOUBLE NOT NULL DEFAULT 0,
  runtime VARCHAR(64) NOT NULL DEFAULT '',
  format VARCHAR(64) NULL,
  badge VARCHAR(64) NULL,
  poster TEXT NOT NULL,
  hero TEXT NULL,
  backdrop TEXT NULL,
  trailer_url TEXT NULL,
  created_by VARCHAR(64) NULL,
  created_at VARCHAR(40) NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  is_active TINYINT NOT NULL DEFAULT 1,
  tmdb_id INT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'local',
  CONSTRAINT fk_movies_user
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS showtimes (
  id VARCHAR(64) PRIMARY KEY,
  movie_id VARCHAR(64) NOT NULL,
  session_date VARCHAR(16) NOT NULL,
  session_time VARCHAR(8) NOT NULL,
  date_label VARCHAR(128) NOT NULL,
  cinema VARCHAR(128) NOT NULL DEFAULT 'CineRay',
  room VARCHAR(64) NOT NULL,
  capacity INT NOT NULL DEFAULT 50,
  price DECIMAL(10,2) NOT NULL DEFAULT 28,
  created_by VARCHAR(64) NULL,
  created_at VARCHAR(40) NOT NULL,
  CONSTRAINT fk_showtimes_movie
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  CONSTRAINT fk_showtimes_user
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_showtimes_movie (movie_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tickets (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  movie_id VARCHAR(64) NOT NULL,
  movie_title VARCHAR(255) NOT NULL,
  movie_poster TEXT NOT NULL,
  session_id VARCHAR(64) NOT NULL,
  session_date VARCHAR(64) NOT NULL,
  session_time VARCHAR(16) NOT NULL,
  cinema VARCHAR(128) NOT NULL,
  room VARCHAR(64) NOT NULL,
  seat_id VARCHAR(128) NOT NULL,
  seat_label VARCHAR(32) NOT NULL,
  cpf VARCHAR(32) NOT NULL,
  payment_method VARCHAR(64) NOT NULL,
  qr_payload TEXT NOT NULL,
  purchased_at VARCHAR(40) NOT NULL,
  total_paid DECIMAL(10,2) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  cancelled_at VARCHAR(40) NULL,
  order_id VARCHAR(64) NULL,
  checked_in_at VARCHAR(40) NULL,
  checked_in_by VARCHAR(64) NULL,
  share_token VARCHAR(64) NULL,
  transfer_token VARCHAR(64) NULL,
  transfer_expires_at VARCHAR(40) NULL,
  active_slot VARCHAR(256)
    GENERATED ALWAYS AS (
      CASE
        WHEN status = 'active' THEN CONCAT(session_id, ':', seat_id)
        ELSE NULL
      END
    ) STORED,
  CONSTRAINT fk_tickets_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_tickets_active_slot (active_slot),
  UNIQUE KEY uk_tickets_share_token (share_token),
  UNIQUE KEY uk_tickets_transfer_token (transfer_token),
  INDEX idx_tickets_user (user_id),
  INDEX idx_tickets_order (order_id),
  INDEX idx_tickets_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS seat_holds (
  session_id VARCHAR(64) NOT NULL,
  seat_id VARCHAR(128) NOT NULL,
  holder_key VARCHAR(128) NOT NULL,
  expires_at VARCHAR(40) NOT NULL,
  PRIMARY KEY (session_id, seat_id),
  INDEX idx_seat_holds_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`

async function waitForMysql(pool, attempts = 30) {
  let lastError
  for (let i = 0; i < attempts; i += 1) {
    try {
      await pool.query('SELECT 1')
      return
    } catch (error) {
      lastError = error
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  throw lastError || new Error('MySQL indisponível')
}

async function seedUser({ id, email, name, role, password }) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email])
  if (existing) {
    await execute(
      `UPDATE users
       SET role = ?, name = ?, password_hash = ?, password_salt = ?
       WHERE email = ?`,
      [role, name, hash, salt, email],
    )
    return existing.id
  }
  await execute(
    `INSERT INTO users (id, email, name, cpf, password_hash, password_salt, created_at, role)
     VALUES (?, ?, ?, NULL, ?, ?, ?, ?)`,
    [id, email, name, hash, salt, new Date().toISOString(), role],
  )
  return id
}

async function seedPublishedEvent(organizerId) {
  const movieId = 'mov_seed_dune'
  const trailerUrl = 'https://www.youtube.com/watch?v=ncwsW3qxQlo'
  const existing = await queryOne(
    `SELECT id, trailer_url FROM movies WHERE id = ? OR tmdb_id = ?`,
    [movieId, 693134],
  )
  if (existing) {
    const dunePoster =
      'https://image.tmdb.org/t/p/w500/rrjoeR5m98ptkGUJ2Z7G4t2lXMg.jpg'
    const duneBackdrop =
      'https://image.tmdb.org/t/p/w1280/eZ239CUp1d6OryZEBPnO2n87gMG.jpg'
    await execute(
      `UPDATE movies
       SET trailer_url = COALESCE(NULLIF(trailer_url, ''), ?),
           poster = ?,
           hero = ?,
           backdrop = ?,
           updated_at = ?
       WHERE id = ?`,
      [trailerUrl, dunePoster, duneBackdrop, duneBackdrop, new Date().toISOString(), existing.id],
    )
    return
  }

  const showtimeId = 'st_seed_dune'
  const now = new Date().toISOString()
  const start = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  const sessionDate = `${pad(start.getDate())}/${pad(start.getMonth() + 1)}/${start.getFullYear()}`
  const sessionTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`
  const weekday = start.toLocaleDateString('pt-BR', { weekday: 'long' })
  const poster =
    'https://image.tmdb.org/t/p/w500/rrjoeR5m98ptkGUJ2Z7G4t2lXMg.jpg'
  const backdrop =
    'https://image.tmdb.org/t/p/w1280/eZ239CUp1d6OryZEBPnO2n87gMG.jpg'

  await execute(
    `INSERT INTO movies (
      id, title, synopsis, genre, rating, runtime, format, badge,
      poster, hero, backdrop, trailer_url, created_by, created_at, updated_at,
      is_active, tmdb_id, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
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
      trailerUrl,
      organizerId,
      now,
      now,
      693134,
      'tmdb',
    ],
  )

  await execute(
    `INSERT INTO showtimes (
      id, movie_id, session_date, session_time, date_label, cinema, room,
      capacity, price, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
    ],
  )
}

async function ensureTicketTransferColumns(pool) {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME AS name
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets'`,
  )
  const names = new Set((cols || []).map((c) => c.name))
  if (!names.has('transfer_token')) {
    await pool.query(
      `ALTER TABLE tickets
       ADD COLUMN transfer_token VARCHAR(64) NULL AFTER share_token,
       ADD COLUMN transfer_expires_at VARCHAR(40) NULL AFTER transfer_token`,
    )
  }
  try {
    await pool.query(
      `ALTER TABLE tickets ADD UNIQUE KEY uk_tickets_transfer_token (transfer_token)`,
    )
  } catch {
  }
}

export async function initDb() {
  const pool = createPoolFromEnv()
  setPool(pool)
  await waitForMysql(pool)

  for (const statement of SCHEMA_SQL.split(';')
    .map((s) => s.trim())
    .filter(Boolean)) {
    await pool.query(statement)
  }

  await ensureTicketTransferColumns(pool)

  const organizerId = await seedUser({
    id: 'usr_organizador_demo',
    email: 'organizador@cineray.com',
    name: 'Ana Organizadora',
    role: 'organizador',
    password: 'org1234',
  })
  await seedUser({
    id: 'usr_cliente_demo_1',
    email: 'cliente1@cineray.com',
    name: 'Bruno Cliente',
    role: 'cliente',
    password: 'cli1234',
  })
  await seedUser({
    id: 'usr_cliente_demo_2',
    email: 'cliente2@cineray.com',
    name: 'Carla Cliente',
    role: 'cliente',
    password: 'cli1234',
  })
  await seedUser({
    id: 'usr_portaria_demo',
    email: 'portaria@cineray.com',
    name: 'Diego Portaria',
    role: 'portaria',
    password: 'porta1234',
  })

  try {
    await seedPublishedEvent(organizerId)
  } catch (error) {
    console.warn('[seed] evento publicado:', error.message)
  }

  return pool
}

export {
  execute,
  getPool,
  isDuplicateKeyError,
  query,
  queryOne,
  withTransaction,
} from './client.js'
