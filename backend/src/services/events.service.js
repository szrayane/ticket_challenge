import { getTmdbMovie } from './tmdb.service.js'
import {
  createMovie,
  findMovieByTmdbId,
  updateMovie,
  consolidateDuplicateTmdbMovies,
} from './movies.service.js'
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
    const err = new Error('Filme da TMDb sem poster. Escolha outro título.')
    err.status = 400
    throw err
  }

  await consolidateDuplicateTmdbMovies().catch(() => undefined)

  let movie = await findMovieByTmdbId(remote.tmdbId)
  if (movie) {
    const patch = {}
    if (!movie.trailerUrl && remote.trailerUrl) patch.trailerUrl = remote.trailerUrl
    if (!movie.poster && remote.poster) patch.poster = remote.poster
    if (!movie.hero && (remote.backdrop || remote.poster)) {
      patch.hero = remote.backdrop || remote.poster
    }
    if (!movie.backdrop && (remote.backdrop || remote.poster)) {
      patch.backdrop = remote.backdrop || remote.poster
    }
    if (remote.synopsis && remote.synopsis !== movie.synopsis) {
      patch.synopsis = remote.synopsis
    }
    if (remote.genre) patch.genre = remote.genre
    if (remote.rating) patch.rating = remote.rating
    if (remote.runtime) patch.runtime = remote.runtime
    if (Object.keys(patch).length) {
      movie = await updateMovie(movie.id, patch)
    }
  } else {
    movie = await createMovie(userId, {
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
      trailerUrl: remote.trailerUrl || '',
      tmdbId: remote.tmdbId,
      source: 'tmdb',
    })
  }

  const session = await createShowtime(userId, movie.id, {
    sessionDate: input.sessionDate,
    sessionTime: input.sessionTime,
    cinema: input.cinema || 'CineRay',
    room: input.room || 'Sala 1',
    capacity: input.capacity,
    price: input.price,
  })

  return { movie, session }
}
