import { randomBytes } from 'node:crypto'
import { db } from '../db/index.js'

function nowIso() {
  return new Date().toISOString()
}

function createId(prefix) {
  return `${prefix}_${randomBytes(10).toString('hex')}`
}

function mapMovie(row) {
  return {
    id: row.id,
    title: row.title,
    synopsis: row.synopsis || '',
    genre: row.genre || '',
    rating: Number(row.rating) || 0,
    runtime: row.runtime || '',
    format: row.format || undefined,
    badge: row.badge || undefined,
    poster: row.poster,
    hero: row.hero || undefined,
    backdrop: row.backdrop || undefined,
    trailerUrl: row.trailer_url || undefined,
    source: row.source || 'local',
    tmdbId: row.tmdb_id ? Number(row.tmdb_id) : undefined,
    isActive: Number(row.is_active ?? 1) === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function listLocalMovies({ includeInactive = false } = {}) {
  const rows = includeInactive
    ? db.prepare(`SELECT * FROM movies ORDER BY created_at DESC`).all()
    : db
        .prepare(
          `SELECT * FROM movies WHERE is_active = 1 ORDER BY created_at DESC`,
        )
        .all()

  return rows.map((row) => {
    const movie = mapMovie(row)
    const next = db
      .prepare(
        `SELECT session_date, session_time, cinema, room, price, capacity
         FROM showtimes
         WHERE movie_id = ?
         ORDER BY session_date ASC, session_time ASC
         LIMIT 1`,
      )
      .get(row.id)
    if (next) {
      movie.nextSession = {
        date: next.session_date,
        time: next.session_time,
        cinema: next.cinema,
        room: next.room,
        price: Number(next.price) || 28,
        capacity: Number(next.capacity) || 50,
      }
    }
    return movie
  })
}

export function getLocalMovie(id, { includeInactive = true } = {}) {
  const row = db.prepare(`SELECT * FROM movies WHERE id = ?`).get(String(id))
  if (!row) return null
  const movie = mapMovie(row)
  if (!includeInactive && !movie.isActive) return null
  return movie
}

export function countActiveTicketsForMovie(movieId) {
  const showtimeIds = db
    .prepare(`SELECT id FROM showtimes WHERE movie_id = ?`)
    .all(String(movieId))
    .map((row) => row.id)
  if (showtimeIds.length === 0) return 0

  const placeholders = showtimeIds.map(() => '?').join(', ')
  const row = db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM tickets
       WHERE status = 'active' AND session_id IN (${placeholders})`,
    )
    .get(...showtimeIds)
  return Number(row?.total) || 0
}

export function createLocalMovie(userId, input = {}) {
  const title = String(input.title || '').trim()
  const poster = String(input.poster || '').trim()
  if (!title) {
    const err = new Error('Informe o título do filme.')
    err.status = 400
    throw err
  }
  if (!poster) {
    const err = new Error('Informe a URL do poster.')
    err.status = 400
    throw err
  }

  const now = nowIso()
  const row = {
    id: createId('mov'),
    title,
    synopsis: String(input.synopsis || '').trim(),
    genre: String(input.genre || '').trim() || 'Drama',
    rating: Number(input.rating) || 0,
    runtime: String(input.runtime || '').trim() || '120 min',
    format: String(input.format || '').trim() || null,
    badge: String(input.badge || '').trim() || null,
    poster,
    hero: String(input.hero || input.poster || '').trim() || null,
    backdrop: String(input.backdrop || input.poster || '').trim() || null,
    trailer_url: String(input.trailerUrl || '').trim() || null,
    created_by: userId,
    created_at: now,
    updated_at: now,
    is_active: 1,
    tmdb_id: input.tmdbId ? Number(input.tmdbId) : null,
    source: String(input.source || 'local'),
  }

  db.prepare(
    `INSERT INTO movies (
      id, title, synopsis, genre, rating, runtime, format, badge,
      poster, hero, backdrop, trailer_url, created_by, created_at, updated_at, is_active,
      tmdb_id, source
    ) VALUES (
      @id, @title, @synopsis, @genre, @rating, @runtime, @format, @badge,
      @poster, @hero, @backdrop, @trailer_url, @created_by, @created_at, @updated_at, @is_active,
      @tmdb_id, @source
    )`,
  ).run(row)

  return mapMovie(row)
}

export function updateLocalMovie(id, input = {}) {
  const current = db.prepare(`SELECT * FROM movies WHERE id = ?`).get(String(id))
  if (!current) {
    const err = new Error('Filme não encontrado.')
    err.status = 404
    throw err
  }

  const next = {
    ...current,
    title: String(input.title ?? current.title).trim(),
    synopsis: String(input.synopsis ?? current.synopsis).trim(),
    genre: String(input.genre ?? current.genre).trim(),
    rating: Number(input.rating ?? current.rating) || 0,
    runtime: String(input.runtime ?? current.runtime).trim(),
    format: input.format !== undefined ? String(input.format || '').trim() || null : current.format,
    badge: input.badge !== undefined ? String(input.badge || '').trim() || null : current.badge,
    poster: String(input.poster ?? current.poster).trim(),
    hero: input.hero !== undefined ? String(input.hero || '').trim() || null : current.hero,
    backdrop:
      input.backdrop !== undefined
        ? String(input.backdrop || '').trim() || null
        : current.backdrop,
    trailer_url:
      input.trailerUrl !== undefined
        ? String(input.trailerUrl || '').trim() || null
        : current.trailer_url,
    is_active:
      input.isActive !== undefined
        ? input.isActive
          ? 1
          : 0
        : current.is_active ?? 1,
    updated_at: nowIso(),
  }

  if (!next.title || !next.poster) {
    const err = new Error('Título e poster são obrigatórios.')
    err.status = 400
    throw err
  }

  db.prepare(
    `UPDATE movies SET
      title = @title, synopsis = @synopsis, genre = @genre, rating = @rating,
      runtime = @runtime, format = @format, badge = @badge, poster = @poster,
      hero = @hero, backdrop = @backdrop, trailer_url = @trailer_url,
      is_active = @is_active, updated_at = @updated_at
     WHERE id = @id`,
  ).run({
    id: current.id,
    title: next.title,
    synopsis: next.synopsis,
    genre: next.genre,
    rating: next.rating,
    runtime: next.runtime,
    format: next.format,
    badge: next.badge,
    poster: next.poster,
    hero: next.hero,
    backdrop: next.backdrop,
    trailer_url: next.trailer_url,
    is_active: next.is_active,
    updated_at: next.updated_at,
  })

  return mapMovie(next)
}

export function setMovieActive(id, isActive) {
  return updateLocalMovie(id, { isActive: Boolean(isActive) })
}

export function deleteLocalMovie(id) {
  const sold = countActiveTicketsForMovie(id)
  if (sold > 0) {
    const err = new Error(
      `Não é possível excluir: há ${sold} ingresso(s) ativo(s). Desative o filme no catálogo.`,
    )
    err.status = 409
    throw err
  }

  const result = db.prepare(`DELETE FROM movies WHERE id = ?`).run(String(id))
  if (result.changes === 0) {
    const err = new Error('Filme não encontrado.')
    err.status = 404
    throw err
  }
  return { deleted: true }
}
