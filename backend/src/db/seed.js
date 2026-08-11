import { execute, queryOne } from '../db/index.js'
import { hashPassword } from '../services/auth.service.js'

async function seedUser({ id, email, name, role, password }) {
  const { salt, hash } = hashPassword(password)
  const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email])
  if (existing) {
    // Garante senha demo após restore/power-cycle do Aiven.
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

async function ensureDemoUsers() {
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
  return organizerId
}

/**
 * Contas demo + catálogo inicial.
 * Desligue com DISABLE_SEED=1.
 * No boot, se o catálogo seed já existe, só garante usuários (rápido).
 */
export async function seedDemoData() {
  if (['1', 'true', 'yes'].includes(String(process.env.DISABLE_SEED || '').trim().toLowerCase())) {
    console.log('[seed] desabilitado (DISABLE_SEED)')
    return
  }

  const started = Date.now()
  const organizerId = await ensureDemoUsers()

  try {
    await seedPublishedEvent(organizerId)
  } catch (error) {
    console.warn('[seed] evento publicado:', error.message)
  }

  try {
    const { DEMO_CATALOG } = await import('./demoCatalog.js')
    const row = await queryOne(
      `SELECT COUNT(*) AS total
       FROM movies
       WHERE id LIKE 'mov_seed_%' AND is_active = 1`,
    )
    const already = Number(row?.total || 0)
    // Catálogo completo já no banco: não re-sincroniza 20×8 showtimes a cada cold start.
    if (already >= DEMO_CATALOG.length) {
      console.log(
        `[seed] catálogo já presente (${already}) — skip sync (${Date.now() - started}ms)`,
      )
      return
    }

    const { seedDemoCatalog } = await import('./seedCatalog.js')
    const result = await seedDemoCatalog(organizerId)
    console.log(
      `[seed] catálogo 2026: +${result.created}, sync ${result.skipped}, sessões +${result.showtimesAdded || 0}, off ${result.deactivated || 0} (${Date.now() - started}ms)`,
    )
  } catch (error) {
    console.warn('[seed] catálogo demo:', error.message)
  }
}
