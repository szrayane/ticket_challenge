import { randomBytes } from 'node:crypto'
import { db } from '../db/index.js'
import { getLocalMovie } from './movies.service.js'
import { listHeldSeatIds, listSoldSeatIds, listUnavailableSeatIds } from './seats.service.js'

export const DEFAULT_CAPACITY = 50
export const DEFAULT_PRICE = 28

function nowIso() {
  return new Date().toISOString()
}

function createId(prefix) {
  return `${prefix}_${randomBytes(10).toString('hex')}`
}

function weekdayLabel(date) {
  return date.toLocaleDateString('pt-BR', { weekday: 'long' })
}

function parseDateTime(sessionDate, sessionTime) {
  const match = String(sessionDate || '').match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return null
  const [, day, month, year] = match
  const [h = '0', m = '0'] = String(sessionTime || '00:00').split(':')
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(h) || 0,
    Number(m) || 0,
    0,
    0,
  )
}

function normalizeCapacity(value, fallback = DEFAULT_CAPACITY) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(200, Math.max(10, Math.round(n)))
}

function normalizePrice(value, fallback = DEFAULT_PRICE) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.round(n * 100) / 100
}

function normalizeSessionFields(input = {}, fallback = {}) {
  const sessionDate = String(
    input.sessionDate || input.date || fallback.session_date || fallback.date || '',
  ).trim()
  const sessionTime = String(
    input.sessionTime || input.time || fallback.session_time || fallback.time || '',
  ).trim()
  const room = String(input.room || fallback.room || '').trim() || 'Sala 1'
  const cinema =
    String(input.cinema || fallback.cinema || '').trim() || 'CineRay'
  const capacity = normalizeCapacity(
    input.capacity ?? fallback.capacity,
    DEFAULT_CAPACITY,
  )
  const price = normalizePrice(input.price ?? fallback.price, DEFAULT_PRICE)

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(sessionDate)) {
    const err = new Error('Data inválida. Use DD/MM/AAAA.')
    err.status = 400
    throw err
  }
  if (!/^\d{2}:\d{2}$/.test(sessionTime)) {
    const err = new Error('Horário inválido. Use HH:MM.')
    err.status = 400
    throw err
  }

  const at = parseDateTime(sessionDate, sessionTime)
  if (!at || Number.isNaN(at.getTime())) {
    const err = new Error('Data/hora inválidas.')
    err.status = 400
    throw err
  }

  const dateLabel =
    String(input.dateLabel || '').trim() ||
    `${weekdayLabel(at)}, ${sessionDate}`

  return { sessionDate, sessionTime, room, cinema, dateLabel, capacity, price }
}

function mapShowtime(row) {
  return {
    id: row.id,
    movieId: row.movie_id,
    date: row.session_date,
    dateLabel: row.date_label,
    time: row.session_time,
    cinema: row.cinema,
    room: row.room,
    capacity: Number(row.capacity) || DEFAULT_CAPACITY,
    price: Number(row.price) || DEFAULT_PRICE,
    createdAt: row.created_at,
  }
}

export function listShowtimesForMovie(movieId) {
  const rows = db
    .prepare(
      `SELECT * FROM showtimes
       WHERE movie_id = ?
       ORDER BY session_date ASC, session_time ASC`,
    )
    .all(String(movieId))
  return rows.map(mapShowtime)
}

export function listAllShowtimes() {
  const rows = db
    .prepare(
      `SELECT s.*, m.title AS movie_title, m.poster AS movie_poster, m.is_active AS movie_active
       FROM showtimes s
       JOIN movies m ON m.id = s.movie_id
       ORDER BY s.session_date ASC, s.session_time ASC`,
    )
    .all()
  return rows.map((row) => ({
    ...mapShowtime(row),
    movieTitle: row.movie_title,
    moviePoster: row.movie_poster,
    movieActive: Number(row.movie_active ?? 1) === 1,
  }))
}

export function getShowtime(id) {
  const row = db.prepare(`SELECT * FROM showtimes WHERE id = ?`).get(String(id))
  return row ? mapShowtime(row) : null
}

export function countActiveTicketsForShowtime(showtimeId) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM tickets
       WHERE session_id = ? AND status = 'active'`,
    )
    .get(String(showtimeId))
  return Number(row?.total) || 0
}

export function getShowtimeOccupancy(showtimeId) {
  const showtime = getShowtime(showtimeId)
  if (!showtime) {
    const err = new Error('Sessão não encontrada.')
    err.status = 404
    throw err
  }

  const totalSeats = showtime.capacity
  const sold = listSoldSeatIds(showtimeId).length
  const held = listHeldSeatIds(showtimeId).length
  const unavailable = listUnavailableSeatIds(showtimeId).length
  const revenueRow = db
    .prepare(
      `SELECT COALESCE(SUM(total_paid), 0) AS revenue
       FROM tickets
       WHERE session_id = ? AND status = 'active'`,
    )
    .get(String(showtimeId))

  return {
    sessionId: showtimeId,
    session: showtime,
    totalSeats,
    sold,
    held,
    unavailable,
    available: Math.max(0, totalSeats - unavailable),
    revenue: Number(revenueRow?.revenue) || 0,
  }
}

export function createShowtime(userId, movieId, input = {}) {
  const movie = getLocalMovie(movieId)
  if (!movie) {
    const err = new Error('Filme não encontrado.')
    err.status = 404
    throw err
  }

  const fields = normalizeSessionFields(input)

  const row = {
    id: createId('st'),
    movie_id: movie.id,
    session_date: fields.sessionDate,
    session_time: fields.sessionTime,
    date_label: fields.dateLabel,
    cinema: fields.cinema,
    room: fields.room,
    capacity: fields.capacity,
    price: fields.price,
    created_by: userId,
    created_at: nowIso(),
  }

  db.prepare(
    `INSERT INTO showtimes (
      id, movie_id, session_date, session_time, date_label, cinema, room,
      capacity, price, created_by, created_at
    ) VALUES (
      @id, @movie_id, @session_date, @session_time, @date_label, @cinema, @room,
      @capacity, @price, @created_by, @created_at
    )`,
  ).run(row)

  return mapShowtime(row)
}

export function updateShowtime(id, input = {}) {
  const current = db.prepare(`SELECT * FROM showtimes WHERE id = ?`).get(String(id))
  if (!current) {
    const err = new Error('Sessão não encontrada.')
    err.status = 404
    throw err
  }

  const fields = normalizeSessionFields(input, current)
  db.prepare(
    `UPDATE showtimes
     SET session_date = ?, session_time = ?, date_label = ?, cinema = ?, room = ?,
         capacity = ?, price = ?
     WHERE id = ?`,
  ).run(
    fields.sessionDate,
    fields.sessionTime,
    fields.dateLabel,
    fields.cinema,
    fields.room,
    fields.capacity,
    fields.price,
    current.id,
  )

  return getShowtime(current.id)
}

export function duplicateShowtime(userId, id, input = {}) {
  const current = getShowtime(id)
  if (!current) {
    const err = new Error('Sessão não encontrada.')
    err.status = 404
    throw err
  }

  return createShowtime(userId, current.movieId, {
    sessionDate: input.sessionDate || current.date,
    sessionTime: input.sessionTime || current.time,
    room: input.room || current.room,
    cinema: input.cinema || current.cinema,
    capacity: input.capacity || current.capacity,
    price: input.price || current.price,
    dateLabel: input.dateLabel,
  })
}

export function deleteShowtime(id) {
  const sold = countActiveTicketsForShowtime(id)
  if (sold > 0) {
    const err = new Error(
      `Não é possível remover: há ${sold} ingresso(s) ativo(s) nesta sessão.`,
    )
    err.status = 409
    throw err
  }

  const result = db.prepare(`DELETE FROM showtimes WHERE id = ?`).run(String(id))
  if (result.changes === 0) {
    const err = new Error('Sessão não encontrada.')
    err.status = 404
    throw err
  }
  return { deleted: true }
}

export function buildLocalSeats(showtimeId) {
  const showtime = getShowtime(showtimeId)
  const capacity = showtime?.capacity || DEFAULT_CAPACITY
  const price = showtime?.price || DEFAULT_PRICE
  const unavailable = new Set(listUnavailableSeatIds(showtimeId))
  const seats = []
  const seatsPerRow = 10
  const rows = Math.ceil(capacity / seatsPerRow)

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const row = String.fromCharCode(65 + (rowIndex % 26))
    for (let n = 1; n <= seatsPerRow; n += 1) {
      const index = rowIndex * seatsPerRow + (n - 1)
      if (index >= capacity) break
      const id = `${showtimeId}_s${index + 1}`
      const ticketType =
        rowIndex >= rows - 1 ? 'vip' : rowIndex >= Math.floor(rows / 2) ? 'premium' : 'basic'
      const multiplier = ticketType === 'vip' ? 1.5 : ticketType === 'premium' ? 1.2 : 1
      seats.push({
        id,
        name: String(n),
        isAvailable: !unavailable.has(id),
        row,
        number: n,
        ticketType,
        price: Math.round(price * multiplier * 100) / 100,
      })
    }
  }

  return seats
}

export function getLocalShowtimeWithMovie(showtimeId) {
  const showtime = getShowtime(showtimeId)
  if (!showtime) return null
  const movie = getLocalMovie(showtime.movieId, { includeInactive: false })
  if (!movie) return null
  return { movie, session: showtime, seats: buildLocalSeats(showtimeId) }
}

export function getOrganizerReport() {
  const movies = db.prepare(`SELECT COUNT(*) AS total FROM movies`).get()
  const activeMovies = db
    .prepare(`SELECT COUNT(*) AS total FROM movies WHERE is_active = 1`)
    .get()
  const showtimes = db.prepare(`SELECT COUNT(*) AS total FROM showtimes`).get()
  const tickets = db
    .prepare(
      `SELECT COUNT(*) AS total, COALESCE(SUM(total_paid), 0) AS revenue
       FROM tickets
       WHERE status = 'active' AND session_id LIKE 'st_%'`,
    )
    .get()

  const bySession = listAllShowtimes().map((session) => {
    const occupancy = getShowtimeOccupancy(session.id)
    return {
      ...session,
      sold: occupancy.sold,
      held: occupancy.held,
      available: occupancy.available,
      totalSeats: occupancy.totalSeats,
      revenue: occupancy.revenue,
    }
  })

  return {
    movies: Number(movies?.total) || 0,
    activeMovies: Number(activeMovies?.total) || 0,
    showtimes: Number(showtimes?.total) || 0,
    ticketsSold: Number(tickets?.total) || 0,
    revenue: Number(tickets?.revenue) || 0,
    sessions: bySession,
  }
}
