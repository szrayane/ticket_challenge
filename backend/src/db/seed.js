import { randomBytes, scryptSync } from 'node:crypto'
import { execute, queryOne } from './client.js'

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
  const movieId = 'mov_seed_toystory5'
  const trailerUrl = 'https://www.youtube.com/watch?v=c51ND9Hdbw0'
  const existing = await queryOne(
    `SELECT id, trailer_url FROM movies WHERE id = ? OR tmdb_id = ?`,
    [movieId, 1084244],
  )
  if (existing) {
    return
  }

  const showtimeId = 'st_seed_toystory5'
  const now = new Date().toISOString()
  const start = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  const sessionDate = `${pad(start.getDate())}/${pad(start.getMonth() + 1)}/${start.getFullYear()}`
  const sessionTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`
  const weekday = start.toLocaleDateString('pt-BR', { weekday: 'long' })
  const poster =
    'https://image.tmdb.org/t/p/w500/sssrBhdvDcczgMQYDc8oCoSuFEJ.jpg'
  const backdrop =
    'https://image.tmdb.org/t/p/w1280/8sSKdEmlmqF4kJUd28SqthXC4yZ.jpg'

  await execute(
    `INSERT INTO movies (
      id, title, synopsis, genre, rating, runtime, format, badge,
      poster, hero, backdrop, trailer_url, created_by, created_at, updated_at,
      is_active, tmdb_id, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      movieId,
      'Toy Story 5',
      'Woody, Buzz e a turma enfrentam uma nova ameaça à diversão: a tecnologia.',
      'Animação, Família, Comédia',
      7.4,
      '100 min',
      '2D',
      '2026',
      poster,
      backdrop,
      backdrop,
      trailerUrl,
      organizerId,
      now,
      now,
      1084244,
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

/**
 * Contas demo + catálogo inicial.
 * Desligue com DISABLE_SEED=1.
 */
export async function seedDemoData() {
  if (['1', 'true', 'yes'].includes(String(process.env.DISABLE_SEED || '').trim().toLowerCase())) {
    console.log('[seed] desabilitado (DISABLE_SEED)')
    return
  }

  const organizerId = await seedUser({
    id: 'usr_organizador_demo',
    email: 'organizador@cineray.com',
    name: 'Ana Organizadora',
    role: 'organizador',
    password: 'cineray',
  })
  await seedUser({
    id: 'usr_cliente_demo_1',
    email: 'cliente1@cineray.com',
    name: 'Bruno Cliente',
    role: 'cliente',
    password: 'cineray',
  })
  await seedUser({
    id: 'usr_cliente_demo_2',
    email: 'cliente2@cineray.com',
    name: 'Carla Cliente',
    role: 'cliente',
    password: 'cineray',
  })
  await seedUser({
    id: 'usr_portaria_demo',
    email: 'portaria@cineray.com',
    name: 'Diego Portaria',
    role: 'portaria',
    password: 'cineray',
  })

  try {
    await seedPublishedEvent(organizerId)
  } catch (error) {
    console.warn('[seed] evento publicado:', error.message)
  }

  try {
    const { seedDemoCatalog } = await import('./seedCatalog.js')
    const result = await seedDemoCatalog(organizerId)
    if (
      result.created > 0 ||
      result.deactivated > 0 ||
      (result.showtimesAdded || 0) > 0
    ) {
      console.log(
        `[seed] catálogo 2026: +${result.created}, sync ${result.skipped}, sessões +${result.showtimesAdded || 0}, off ${result.deactivated || 0}`,
      )
    }
  } catch (error) {
    console.warn('[seed] catálogo demo:', error.message)
  }
}
