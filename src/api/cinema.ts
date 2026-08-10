import {
  fetchMovieShowtimes,
  fetchMovies,
  fetchShowtimeSeats,
} from './catalog'
import {
  compareSessionsByDateTime,
  isSessionUpcoming,
} from './mappers'
import { TICKET_LABELS, TICKET_PRICES } from '../lib/money'
import type { Movie, Seat, Session } from '../types'

export async function getMovies(): Promise<Movie[]> {
  return fetchMovies()
}

export async function getMovieById(movieId: string): Promise<Movie | undefined> {
  try {
    const { movie } = await fetchMovieShowtimes(movieId)
    return movie
  } catch {
    return undefined
  }
}

export async function getMovieShowtimes(movieId: string): Promise<{
  movie: Movie
  sessions: Session[]
  scheduleStart?: string
}> {
  const data = await fetchMovieShowtimes(movieId)
  const sessions = data.sessions
    .filter((session) => isSessionUpcoming(session))
    .sort(compareSessionsByDateTime)
  return {
    movie: data.movie,
    sessions,
    scheduleStart: sessions[0]?.date,
  }
}

export async function getShowtimeSeats(showtimeId: string): Promise<{
  movie: Movie
  session: Session
  seats: Seat[]
}> {
  const data = await fetchShowtimeSeats(showtimeId)
  const seats: Seat[] = data.seats.map((seat) => {
    const ticketType = seat.ticketType
    const price = Number(seat.price) || TICKET_PRICES[ticketType]
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
    movie: data.movie,
    session: data.session,
    seats,
  }
}

export { groupSeatsByRow } from './mappers'
