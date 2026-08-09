import { getTmdbMovie } from './tmdb.service.js'
import { createLocalMovie } from './movies.service.js'
import { createShowtime } from './showtimes.service.js'

export async function createEventFromTmdb(userId, input = {}) {
  const tmdbId = Number(input.tmdbId)
  if (!tmdbId) {
    const err = new Error('Informe o tmdbId do filme.')
    err.status = 400
    throw err
  }

  const remote = await getTmdbMovie(tmdbId)
  if (!remote.poster) {
    const err = new Error('Filme da TMDb sem poster — escolha outro título.')
    err.status = 400
    throw err
  }

  const movie = createLocalMovie(userId, {
    title: remote.title,
    synopsis: remote.synopsis,
    genre: remote.genre,
    rating: remote.rating,
    runtime: remote.runtime || '120 min',
    format: String(input.format || '2D'),
    badge: 'TMDb',
    poster: remote.poster,
    hero: remote.backdrop || remote.poster,
    backdrop: remote.backdrop || remote.poster,
    tmdbId: remote.tmdbId,
    source: 'tmdb',
  })

  const session = createShowtime(userId, movie.id, {
    sessionDate: input.sessionDate,
    sessionTime: input.sessionTime,
    cinema: input.cinema || 'CineRay',
    room: input.room || 'Sala 1',
    capacity: input.capacity,
    price: input.price,
  })

  return { movie, session }
}
