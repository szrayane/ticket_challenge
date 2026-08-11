import { randomBytes } from 'node:crypto'
import { execute, query, queryOne } from '../db/index.js'

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

function parseShowtimeAt(sessionDate, sessionTime) {
  const match = String(sessionDate || '').match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return null
  const [, day, month, year] = match
  const [h = '0', m = '0'] = String(sessionTime || '00:00').split(':')
  const at = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(h) || 0,
    Number(m) || 0,
    0,
    0,
  )
  return Number.isNaN(at.getTime()) ? null : at
}

const LIST_CACHE_TTL_MS = Number(process.env.MOVIES_LIST_CACHE_MS || 20_000)
const listCache = {
  active: /** @type {{ at: number, data: any[] } | null } */ (null),
  inactive: /** @type {{ at: number, data: any[] } | null } */ (null),
}

export function invalidateMoviesListCache() {
  listCache.active = null
  listCache.inactive = null
}

export async function listMovies({ includeInactive = false } = {}) {
  const cacheKey = includeInactive ? 'inactive' : 'active'
  const cached = listCache[cacheKey]
  if (cached && Date.now() - cached.at < LIST_CACHE_TTL_MS) {
    return cached.data
  }

  const rows = includeInactive
    ? await query(
        `SELECT id, title, synopsis, genre, rating, runtime, format, badge,
                poster, hero, backdrop, trailer_url, source, tmdb_id, is_active,
                created_at, updated_at
         FROM movies
         ORDER BY created_at DESC`,
      )
    : await query(
        `SELECT id, title, synopsis, genre, rating, runtime, format, badge,
                poster, hero, backdrop, trailer_url, source, tmdb_id, is_active,
                created_at, updated_at
         FROM movies
         WHERE is_active = 1
         ORDER BY created_at DESC`,
      )

  if (rows.length === 0) {
    listCache[cacheKey] = { at: Date.now(), data: [] }
    return []
  }

  const now = Date.now()
  const movieIds = rows.map((row) => row.id)
  const moviePlaceholders = movieIds.map(() => '?').join(', ')
  const showtimes = await query(
    `SELECT id, movie_id, session_date, session_time, cinema, room, price, capacity
     FROM showtimes
     WHERE movie_id IN (${moviePlaceholders})`,
    movieIds,
  )

  // Só conta ingressos vendidos (1 query). Holds mudam rápido demais pra valer
  // round-trip extra no catálogo da home.
  const showtimeIds = showtimes.map((row) => row.id)
  const soldBySession = new Map()
  if (showtimeIds.length > 0) {
    const showPlaceholders = showtimeIds.map(() => '?').join(', ')
    const soldRows = await query(
      `SELECT session_id, COUNT(*) AS total
       FROM tickets
       WHERE status = 'active' AND session_id IN (${showPlaceholders})
       GROUP BY session_id`,
      showtimeIds,
    )
    for (const row of soldRows) {
      soldBySession.set(String(row.session_id), Number(row.total) || 0)
    }
  }

  const showtimesByMovie = new Map()
  for (const show of showtimes) {
    const list = showtimesByMovie.get(show.movie_id) || []
    list.push(show)
    showtimesByMovie.set(show.movie_id, list)
  }

  const data = rows.map((row) => {
    const movie = mapMovie(row)
    let best = null
    for (const next of showtimesByMovie.get(row.id) || []) {
      const at = parseShowtimeAt(next.session_date, next.session_time)
      if (!at || at.getTime() <= now) continue
      const capacity = Number(next.capacity) || 50
      const sold = soldBySession.get(String(next.id)) || 0
      if (sold >= capacity) continue
      if (!best || at.getTime() < best.at.getTime()) {
        best = { next, at }
      }
    }
    if (best) {
      movie.nextSession = {
        date: best.next.session_date,
        time: best.next.session_time,
        cinema: best.next.cinema,
        room: best.next.room,
        price: Number(best.next.price) || 28,
        capacity: Number(best.next.capacity) || 50,
      }
    }
    return movie
  })

  listCache[cacheKey] = { at: Date.now(), data }
  return data
}

export async function getMovie(id, { includeInactive = true } = {}) {
  const row = await queryOne(`SELECT * FROM movies WHERE id = ?`, [String(id)])
  if (!row) return null
  const movie = mapMovie(row)
  if (!includeInactive && !movie.isActive) return null
  return movie
}

export async function countActiveTicketsForMovie(movieId) {
  const showtimeIds = (
    await query(`SELECT id FROM showtimes WHERE movie_id = ?`, [String(movieId)])
  ).map((row) => row.id)
  if (showtimeIds.length === 0) return 0

  const placeholders = showtimeIds.map(() => '?').join(', ')
  const row = await queryOne(
    `SELECT COUNT(*) AS total
     FROM tickets
     WHERE status = 'active' AND session_id IN (${placeholders})`,
    showtimeIds,
  )
  return Number(row?.total) || 0
}

export async function createMovie(userId, input = {}) {
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

  await execute(
    `INSERT INTO movies (
      id, title, synopsis, genre, rating, runtime, format, badge,
      poster, hero, backdrop, trailer_url, created_by, created_at, updated_at, is_active,
      tmdb_id, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.title,
      row.synopsis,
      row.genre,
      row.rating,
      row.runtime,
      row.format,
      row.badge,
      row.poster,
      row.hero,
      row.backdrop,
      row.trailer_url,
      row.created_by,
      row.created_at,
      row.updated_at,
      row.is_active,
      row.tmdb_id,
      row.source,
    ],
  )

  invalidateMoviesListCache()
  return mapMovie(row)
}

export async function updateMovie(id, input = {}) {
  const current = await queryOne(`SELECT * FROM movies WHERE id = ?`, [String(id)])
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

  await execute(
    `UPDATE movies SET
      title = ?, synopsis = ?, genre = ?, rating = ?,
      runtime = ?, format = ?, badge = ?, poster = ?,
      hero = ?, backdrop = ?, trailer_url = ?,
      is_active = ?, updated_at = ?
     WHERE id = ?`,
    [
      next.title,
      next.synopsis,
      next.genre,
      next.rating,
      next.runtime,
      next.format,
      next.badge,
      next.poster,
      next.hero,
      next.backdrop,
      next.trailer_url,
      next.is_active,
      next.updated_at,
      current.id,
    ],
  )

  invalidateMoviesListCache()
  return mapMovie(next)
}

export async function setMovieActive(id, isActive) {
  return updateMovie(id, { isActive: Boolean(isActive) })
}

export async function deleteMovie(id) {
  const sold = await countActiveTicketsForMovie(id)
  if (sold > 0) {
    const err = new Error(
      `Não é possível excluir: há ${sold} ingresso(s) ativo(s). Desative o filme no catálogo.`,
    )
    err.status = 409
    throw err
  }

  const result = await execute(`DELETE FROM movies WHERE id = ?`, [String(id)])
  if ((result.affectedRows || 0) === 0) {
    const err = new Error('Filme não encontrado.')
    err.status = 404
    throw err
  }
  invalidateMoviesListCache()
  return { deleted: true }
}
