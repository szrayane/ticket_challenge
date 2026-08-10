import { execute, query, queryOne } from './client.js'
import { DEMO_CATALOG, demoBackdrop, demoPoster } from './demoCatalog.js'

function pad(n) {
  return String(n).padStart(2, '0')
}

function sessionSlot(index) {
  const start = new Date(Date.now() + (4 + index * 5) * 60 * 60 * 1000)
  const sessionDate = `${pad(start.getDate())}/${pad(start.getMonth() + 1)}/${start.getFullYear()}`
  const sessionTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`
  const weekday = start.toLocaleDateString('pt-BR', { weekday: 'long' })
  return {
    sessionDate,
    sessionTime,
    dateLabel: `${weekday}, ${sessionDate}`,
    room: `Sala ${(index % 6) + 1}`,
    price: 28 + (index % 4) * 4,
    capacity: 40 + (index % 3) * 10,
  }
}

export async function seedDemoCatalog(organizerId) {
  const now = new Date().toISOString()
  let created = 0
  let skipped = 0
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
      await execute(
        `UPDATE movies
         SET title = ?,
             synopsis = ?,
             genre = ?,
             rating = ?,
             runtime = ?,
             poster = ?,
             hero = ?,
             backdrop = ?,
             trailer_url = COALESCE(NULLIF(?, ''), trailer_url),
             badge = '2026',
             is_active = 1,
             source = 'tmdb',
             updated_at = ?
         WHERE id = ?`,
        [
          item.title,
          item.synopsis,
          item.genre,
          item.rating,
          item.runtime,
          demoPoster(item.poster),
          demoBackdrop(item.backdrop || item.poster),
          demoBackdrop(item.backdrop || item.poster),
          item.trailerUrl || '',
          now,
          existing.id,
        ],
      )

      const showtimeCount = await queryOne(
        `SELECT COUNT(*) AS c FROM showtimes WHERE movie_id = ?`,
        [existing.id],
      )
      if (Number(showtimeCount?.c || 0) === 0) {
        const slot = sessionSlot(index)
        await execute(
          `INSERT INTO showtimes (
            id, movie_id, session_date, session_time, date_label, cinema, room,
            capacity, price, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `st_seed_${item.key}`,
            existing.id,
            slot.sessionDate,
            slot.sessionTime,
            slot.dateLabel,
            'CineRay Centro',
            slot.room,
            slot.capacity,
            slot.price,
            organizerId,
            now,
          ],
        )
      }

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

    const slot = sessionSlot(index)
    await execute(
      `INSERT INTO showtimes (
        id, movie_id, session_date, session_time, date_label, cinema, room,
        capacity, price, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `st_seed_${item.key}`,
        movieId,
        slot.sessionDate,
        slot.sessionTime,
        slot.dateLabel,
        'CineRay Centro',
        slot.room,
        slot.capacity,
        slot.price,
        organizerId,
        now,
      ],
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

  return { created, skipped, deactivated, total: DEMO_CATALOG.length }
}
