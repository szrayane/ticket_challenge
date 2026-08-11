import { execute, query, queryOne } from './client.js'
import { DEMO_CATALOG, demoBackdrop, demoPoster } from './demoCatalog.js'

const SESSIONS_PER_MOVIE = 8
const SESSION_TIMES = ['14:00', '16:30', '19:00', '21:30']
const CINEMAS = ['CineRay Centro', 'CineRay Norte', 'CineRay Shopping']

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatDateLabel(date) {
  const sessionDate = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' })
  return {
    sessionDate,
    dateLabel: `${weekday}, ${sessionDate}`,
  }
}

function sessionSlotsForMovie(movieIndex) {
  const cinema = CINEMAS[movieIndex % CINEMAS.length]
  const slots = []
  for (let i = 0; i < SESSIONS_PER_MOVIE; i += 1) {
    const dayOffset = Math.floor(i / 2)
    const time = SESSION_TIMES[(movieIndex + i) % SESSION_TIMES.length]
    const [hours, minutes] = time.split(':').map(Number)
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + dayOffset)
    date.setHours(hours, minutes, 0, 0)

    if (date.getTime() <= Date.now()) {
      date.setDate(date.getDate() + 1)
    }

    const { sessionDate, dateLabel } = formatDateLabel(date)
    slots.push({
      idSuffix: String(i),
      sessionDate,
      sessionTime: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
      dateLabel,
      cinema,
      room: `Sala ${((movieIndex + i) % 6) + 1}`,
      price: 28 + ((movieIndex + i) % 4) * 4,
      capacity: 40 + ((movieIndex + i) % 3) * 10,
    })
  }
  return slots
}

async function ensureShowtimes(movieId, itemKey, movieIndex, organizerId, now) {
  const slots = sessionSlotsForMovie(movieIndex)
  const cinema = slots[0]?.cinema || CINEMAS[movieIndex % CINEMAS.length]
  let inserted = 0

  for (const slot of slots) {
    const showtimeId = `st_seed_${itemKey}_${slot.idSuffix}`
    const existing = await queryOne(`SELECT id FROM showtimes WHERE id = ?`, [
      showtimeId,
    ])
    if (existing) {
      await execute(
        `UPDATE showtimes SET cinema = ?, session_date = ?, session_time = ?, date_label = ? WHERE id = ?`,
        [
          slot.cinema,
          slot.sessionDate,
          slot.sessionTime,
          slot.dateLabel,
          showtimeId,
        ],
      )
      continue
    }

    await execute(
      `INSERT INTO showtimes (
        id, movie_id, session_date, session_time, date_label, cinema, room,
        capacity, price, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        showtimeId,
        movieId,
        slot.sessionDate,
        slot.sessionTime,
        slot.dateLabel,
        slot.cinema,
        slot.room,
        slot.capacity,
        slot.price,
        organizerId,
        now,
      ],
    )
    inserted += 1
  }

  await execute(`UPDATE showtimes SET cinema = ? WHERE movie_id = ?`, [
    cinema,
    movieId,
  ])

  return inserted
}

export async function seedDemoCatalog(organizerId) {
  const now = new Date().toISOString()
  let created = 0
  let skipped = 0
  let showtimesAdded = 0
  const keepTmdbIds = new Set(
    DEMO_CATALOG.map((item) => Number(item.tmdbId)).filter(Boolean),
  )
  const keepIds = new Set(DEMO_CATALOG.map((item) => `mov_seed_${item.key}`))

  for (const [index, item] of DEMO_CATALOG.entries()) {
    const movieId = `mov_seed_${item.key}`
    const existing = await queryOne(
      `SELECT id FROM movies WHERE id = ? OR tmdb_id = ?`,
      [movieId, item.tmdbId],
    )
    if (existing) {
      showtimesAdded += await ensureShowtimes(
        existing.id,
        item.key,
        index,
        organizerId,
        now,
      )
      skipped += 1
      continue
    }

    const poster = demoPoster(item.poster)
    const backdrop = demoBackdrop(item.backdrop || item.poster)

    await execute(
      `INSERT INTO movies (
        id, title, synopsis, genre, rating, runtime, format, badge,
        poster, hero, backdrop, trailer_url, created_by, created_at, updated_at,
        is_active, tmdb_id, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        movieId,
        item.title,
        item.synopsis,
        item.genre,
        item.rating,
        item.runtime,
        '2D',
        '2026',
        poster,
        backdrop,
        backdrop,
        item.trailerUrl || null,
        organizerId,
        now,
        now,
        item.tmdbId,
        'tmdb',
      ],
    )

    showtimesAdded += await ensureShowtimes(
      movieId,
      item.key,
      index,
      organizerId,
      now,
    )
    created += 1
  }

  const all = await query(`SELECT id, tmdb_id FROM movies WHERE is_active = 1`)
  let deactivated = 0
  for (const row of all) {
    const tmdbId = Number(row.tmdb_id)
    if (keepIds.has(row.id) || (tmdbId && keepTmdbIds.has(tmdbId))) continue
    await execute(
      `UPDATE movies SET is_active = 0, updated_at = ? WHERE id = ?`,
      [now, row.id],
    )
    deactivated += 1
  }

  return {
    created,
    skipped,
    deactivated,
    showtimesAdded,
    total: DEMO_CATALOG.length,
  }
}
