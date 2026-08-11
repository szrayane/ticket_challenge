import { randomBytes } from 'node:crypto'
import { execute, query, queryOne } from '../db/index.js'
import { getMovie, invalidateMoviesListCache } from './movies.service.js'
import {
  listHeldSeatIds,
  listSoldSeatIds,
  listUnavailableSeatIds,
} from './seats.service.js'

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

export function isShowtimeUpcoming(session) {
  const at = parseDateTime(session?.date, session?.time)
  if (!at) return false
  return at.getTime() > Date.now()
}

function compareShowtimesByDateTime(a, b) {
  const aAt = parseDateTime(a.date, a.time)?.getTime() ?? Number.POSITIVE_INFINITY
  const bAt = parseDateTime(b.date, b.time)?.getTime() ?? Number.POSITIVE_INFINITY
  return aAt - bAt
}

export function normalizeCapacity(value, fallback = DEFAULT_CAPACITY) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(200, Math.max(10, Math.round(n)))
}

export function normalizePrice(value, fallback = DEFAULT_PRICE) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.round(n * 100) / 100
}

export function normalizeSessionFields(input = {}, fallback = {}) {
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

export async function showtimeHasAvailableSeats(showtime) {
  const session =
    typeof showtime === 'string' || typeof showtime === 'number'
      ? await getShowtime(showtime)
      : showtime
  if (!session) return false
  const unavailable = (await listUnavailableSeatIds(session.id)).length
  return unavailable < session.capacity
}

export async function listShowtimesForMovie(
  movieId,
  { onlyWithAvailability = false, onlyUpcoming = false } = {},
) {
  const rows = await query(
    `SELECT * FROM showtimes
     WHERE movie_id = ?
     ORDER BY session_date ASC, session_time ASC`,
    [String(movieId)],
  )
  let sessions = rows.map(mapShowtime)
  if (onlyUpcoming) {
    sessions = sessions.filter(isShowtimeUpcoming)
  }
  sessions.sort(compareShowtimesByDateTime)
  if (!onlyWithAvailability) return sessions

  const open = []
  for (const session of sessions) {
    if (await showtimeHasAvailableSeats(session)) open.push(session)
  }
  return open
}

export async function listAllShowtimes() {
  const rows = await query(
    `SELECT s.*, m.title AS movie_title, m.poster AS movie_poster, m.is_active AS movie_active
     FROM showtimes s
     JOIN movies m ON m.id = s.movie_id
     ORDER BY s.session_date ASC, s.session_time ASC`,
  )
  return rows.map((row) => ({
    ...mapShowtime(row),
    movieTitle: row.movie_title,
    moviePoster: row.movie_poster,
    movieActive: Number(row.movie_active ?? 1) === 1,
  }))
}

export async function getShowtime(id) {
  const row = await queryOne(`SELECT * FROM showtimes WHERE id = ?`, [String(id)])
  return row ? mapShowtime(row) : null
}

export async function countActiveTicketsForShowtime(showtimeId) {
  const row = await queryOne(
    `SELECT COUNT(*) AS total
     FROM tickets
     WHERE session_id = ? AND status = 'active'`,
    [String(showtimeId)],
  )
  return Number(row?.total) || 0
}

export async function getShowtimeOccupancy(showtimeId) {
  const showtime = await getShowtime(showtimeId)
  if (!showtime) {
    const err = new Error('Sessão não encontrada.')
    err.status = 404
    throw err
  }

  const totalSeats = showtime.capacity
  const sold = (await listSoldSeatIds(showtimeId)).length
  const held = (await listHeldSeatIds(showtimeId)).length
  const unavailable = (await listUnavailableSeatIds(showtimeId)).length
  const revenueRow = await queryOne(
    `SELECT COALESCE(SUM(total_paid), 0) AS revenue
     FROM tickets
     WHERE session_id = ? AND status = 'active'`,
    [String(showtimeId)],
  )

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

export async function createShowtime(userId, movieId, input = {}) {
  const movie = await getMovie(movieId)
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

  await execute(
    `INSERT INTO showtimes (
      id, movie_id, session_date, session_time, date_label, cinema, room,
      capacity, price, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.movie_id,
      row.session_date,
      row.session_time,
      row.date_label,
      row.cinema,
      row.room,
      row.capacity,
      row.price,
      row.created_by,
      row.created_at,
    ],
  )

  invalidateMoviesListCache()
  return mapShowtime(row)
}

export async function updateShowtime(id, input = {}) {
  const current = await queryOne(`SELECT * FROM showtimes WHERE id = ?`, [
    String(id),
  ])
  if (!current) {
    const err = new Error('Sessão não encontrada.')
    err.status = 404
    throw err
  }

  const fields = normalizeSessionFields(input, current)
  await execute(
    `UPDATE showtimes
     SET session_date = ?, session_time = ?, date_label = ?, cinema = ?, room = ?,
         capacity = ?, price = ?
     WHERE id = ?`,
    [
      fields.sessionDate,
      fields.sessionTime,
      fields.dateLabel,
      fields.cinema,
      fields.room,
      fields.capacity,
      fields.price,
      current.id,
    ],
  )

  invalidateMoviesListCache()
  return getShowtime(current.id)
}

export async function duplicateShowtime(userId, id, input = {}) {
  const current = await getShowtime(id)
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

export async function deleteShowtime(id) {
  const sold = await countActiveTicketsForShowtime(id)
  if (sold > 0) {
    const err = new Error(
      `Não é possível remover: há ${sold} ingresso(s) ativo(s) nesta sessão.`,
    )
    err.status = 409
    throw err
  }

  const result = await execute(`DELETE FROM showtimes WHERE id = ?`, [String(id)])
  if ((result.affectedRows || 0) === 0) {
    const err = new Error('Sessão não encontrada.')
    err.status = 404
    throw err
  }
  invalidateMoviesListCache()
  return { deleted: true }
}

export async function buildSeats(showtimeId) {
  const showtime = await getShowtime(showtimeId)
  const capacity = showtime?.capacity || DEFAULT_CAPACITY
  const price = showtime?.price || DEFAULT_PRICE
  const unavailable = new Set(await listUnavailableSeatIds(showtimeId))
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

export async function getShowtimeWithMovie(
  showtimeId,
  { includeInactive = true } = {},
) {
  const showtime = await getShowtime(showtimeId)
  if (!showtime) return null
  // Organizador lista sessões de filmes desativados; o mapa precisa carregar mesmo assim.
  const movie = await getMovie(showtime.movieId, { includeInactive })
  if (!movie) return null
  return { movie, session: showtime, seats: await buildSeats(showtimeId) }
}

const HEATMAP_SEATS_PER_ROW = 10
const HEATMAP_MAX_CAPACITY = 60

export async function getSeatSalesHeatmap() {
  const capacityRow = await queryOne(
    `SELECT COALESCE(MAX(capacity), ?) AS maxCapacity FROM showtimes`,
    [DEFAULT_CAPACITY],
  )
  const maxCapacity = Math.min(
    HEATMAP_MAX_CAPACITY,
    Math.max(
      HEATMAP_SEATS_PER_ROW,
      Number(capacityRow?.maxCapacity) || DEFAULT_CAPACITY,
    ),
  )
  const rowCount = Math.ceil(maxCapacity / HEATMAP_SEATS_PER_ROW)

  const salesRows = await query(
    `SELECT seat_label AS label, COUNT(*) AS soldCount
     FROM tickets
     WHERE status = 'active'
       AND session_id LIKE 'st_%'
       AND seat_label IS NOT NULL
       AND TRIM(seat_label) <> ''
     GROUP BY seat_label`,
  )

  const soldByLabel = new Map()
  let maxSold = 0
  for (const row of salesRows) {
    const label = String(row.label || '').trim().toUpperCase()
    if (!label) continue
    const soldCount = Number(row.soldCount) || 0
    soldByLabel.set(label, soldCount)
    if (soldCount > maxSold) maxSold = soldCount
  }

  const seats = []
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row = String.fromCharCode(65 + (rowIndex % 26))
    for (let number = 1; number <= HEATMAP_SEATS_PER_ROW; number += 1) {
      const index = rowIndex * HEATMAP_SEATS_PER_ROW + (number - 1)
      if (index >= maxCapacity) break
      const label = `${row}${number}`
      const soldCount = soldByLabel.get(label) || 0
      seats.push({
        label,
        row,
        number,
        soldCount,
        intensity: maxSold > 0 ? Math.round((soldCount / maxSold) * 100) / 100 : 0,
      })
    }
  }

  return {
    seatsPerRow: HEATMAP_SEATS_PER_ROW,
    rows: rowCount,
    maxSold,
    seats,
  }
}

export async function getOrganizerReport() {
  const movies = await queryOne(`SELECT COUNT(*) AS total FROM movies`)
  const activeMovies = await queryOne(
    `SELECT COUNT(*) AS total FROM movies WHERE is_active = 1`,
  )
  const showtimes = await queryOne(`SELECT COUNT(*) AS total FROM showtimes`)
  const tickets = await queryOne(
    `SELECT COUNT(*) AS total, COALESCE(SUM(total_paid), 0) AS revenue
     FROM tickets
     WHERE status = 'active' AND session_id LIKE 'st_%'`,
  )
  const checkIns = await queryOne(
    `SELECT COUNT(*) AS total
     FROM tickets
     WHERE status = 'active'
       AND checked_in_at IS NOT NULL
       AND session_id LIKE 'st_%'`,
  )

  const allSessions = await listAllShowtimes()
  const bySession = []
  for (const session of allSessions) {
    const occupancy = await getShowtimeOccupancy(session.id)
    const checkedRow = await queryOne(
      `SELECT COUNT(*) AS total
       FROM tickets
       WHERE session_id = ? AND status = 'active' AND checked_in_at IS NOT NULL`,
      [session.id],
    )
    bySession.push({
      ...session,
      sold: occupancy.sold,
      held: occupancy.held,
      available: occupancy.available,
      totalSeats: occupancy.totalSeats,
      revenue: occupancy.revenue,
      checkedIn: Number(checkedRow?.total) || 0,
      occupancyPct:
        occupancy.totalSeats > 0
          ? Math.round((occupancy.sold / occupancy.totalSeats) * 100)
          : 0,
    })
  }

  bySession.sort((a, b) => b.sold - a.sold || b.revenue - a.revenue)

  const seatHeatmap = await getSeatSalesHeatmap()

  return {
    movies: Number(movies?.total) || 0,
    activeMovies: Number(activeMovies?.total) || 0,
    showtimes: Number(showtimes?.total) || 0,
    ticketsSold: Number(tickets?.total) || 0,
    checkIns: Number(checkIns?.total) || 0,
    revenue: Number(tickets?.revenue) || 0,
    liveAt: new Date().toISOString(),
    sessions: bySession,
    seatHeatmap,
  }
}
