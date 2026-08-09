import {
  listCurrentYearMovieIds,
  resolveApiMovieId,
} from '../data/movies.current'
import { TICKET_LABELS, TICKET_PRICES } from '../lib/money'
import { apiRequest } from './client'
import {
  fetchLocalMovieShowtimes,
  fetchLocalMovies,
  fetchLocalShowtimeSeats,
  isLocalMovieId,
  isLocalShowtimeId,
} from './localCatalog'
import {
  compareSessionsByDateTime,
  dayOffsetFromSchedule,
  isSessionUpcoming,
  mapCurrentMovie,
  mapMovie,
  mapSeats,
  mapSession,
  mapSessionFromShowtime,
} from './mappers'
import type {
  ApiMovie,
  ApiMovieShowtimes,
  ApiShowtimeSeats,
  BookSeatsPayload,
} from './types'
import type { Movie, Seat, Session } from '../types'

export async function getMovies(): Promise<Movie[]> {
  const data = await apiRequest<ApiMovie[]>('/movies')

  const fromApi = new Map<string, Movie>()
  data.forEach((apiMovie, index) => {
    const mapped = mapMovie(apiMovie, index)
    fromApi.set(mapped.id, mapped)
  })

  const movies: Movie[] = []
  for (const id of listCurrentYearMovieIds(2026)) {
    const existing = fromApi.get(String(id))
    if (existing) {
      movies.push(existing)
      continue
    }
    const local = mapCurrentMovie(id, movies.length)
    if (local) movies.push(local)
  }

  for (const [id, movie] of fromApi) {
    if (!movies.some((item) => item.id === id)) movies.push(movie)
  }

  try {
    const localMovies = await fetchLocalMovies()
    for (const movie of localMovies) {
      if (!movies.some((item) => item.id === movie.id)) {
        movies.unshift(movie)
      }
    }
  } catch {
    // API local offline — catálogo Cineflex segue
  }

  return movies
}

export async function getMovieById(movieId: string): Promise<Movie | undefined> {
  if (isLocalMovieId(movieId)) {
    try {
      const { movie } = await fetchLocalMovieShowtimes(movieId)
      return movie
    } catch {
      return undefined
    }
  }
  const local = mapCurrentMovie(Number(movieId))
  if (local) return local
  const movies = await getMovies()
  return movies.find((movie) => movie.id === movieId)
}

export async function getMovieShowtimes(movieId: string): Promise<{
  movie: Movie
  sessions: Session[]
  days: ApiMovieShowtimes['days']
  scheduleStart?: string
}> {
  if (isLocalMovieId(movieId)) {
    const data = await fetchLocalMovieShowtimes(movieId)
    const sessions = data.sessions
      .filter((session) => isSessionUpcoming(session))
      .sort(compareSessionsByDateTime)
    return {
      movie: data.movie,
      sessions,
      days: [],
      scheduleStart: sessions[0]?.date,
    }
  }

  const apiId = resolveApiMovieId(movieId)
  const data = await apiRequest<ApiMovieShowtimes>(
    `/movies/${apiId}/showtimes`,
  )
  const movie =
    mapCurrentMovie(Number(movieId)) ?? mapMovie({ ...data, id: Number(movieId) })
  const scheduleStart = data.days[0]?.date
  const sessions = data.days
    .flatMap((day, dayIndex) =>
      day.showtimes.map((showtime) =>
        mapSession(
          movie.id,
          showtime.id,
          showtime.name,
          scheduleStart
            ? dayOffsetFromSchedule(day.date, scheduleStart)
            : dayIndex,
        ),
      ),
    )
    .filter(isSessionUpcoming)
    .sort(compareSessionsByDateTime)

  return { movie, sessions, days: data.days, scheduleStart }
}

export async function getShowtimeSeats(
  showtimeId: string,
  scheduleStart?: string,
  catalogMovieId?: string,
): Promise<{
  movie: Movie
  session: Session
  seats: Seat[]
}> {
  if (isLocalShowtimeId(showtimeId)) {
    const data = await fetchLocalShowtimeSeats(showtimeId)
    const seats: Seat[] = data.seats.map((seat) => {
      const ticketType = seat.ticketType
      const price = TICKET_PRICES[ticketType]
      const label = TICKET_LABELS[ticketType]
      if (!seat.isAvailable) {
        return {
          id: seat.id,
          row: seat.row,
          number: seat.number,
          status: 'unavailable' as const,
          ticketType,
          price,
          label,
        }
      }
      return {
        id: seat.id,
        row: seat.row,
        number: seat.number,
        status: ticketType,
        ticketType,
        price,
        label,
      }
    })
    return {
      movie: { ...data.movie, source: 'local' },
      session: data.session,
      seats,
    }
  }

  const data = await apiRequest<ApiShowtimeSeats>(
    `/showtimes/${showtimeId}/seats`,
  )

  const movieId = catalogMovieId ?? String(data.movie.id)
  const movie = mapCurrentMovie(Number(movieId)) ?? mapMovie(data.movie)

  return {
    movie,
    session: mapSessionFromShowtime(data, scheduleStart, movie.id),
    seats: mapSeats(data.seats),
  }
}

export async function bookSeats(payload: BookSeatsPayload): Promise<void> {
  // Sessões locais (ou assentos sem id numérico Cineflex) não usam a mock.
  if (
    payload.ids.length === 0 ||
    payload.ids.some((id) => String(id).includes('_s'))
  ) {
    return
  }
  await apiRequest<void>('/seats/book-many', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export { groupSeatsByRow } from './mappers'
