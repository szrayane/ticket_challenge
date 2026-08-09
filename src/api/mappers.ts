import { getCurrentMovie } from '../data/movies.current'
import { toHeroImage, toPosterImage } from '../lib/images'
import { TICKET_LABELS, TICKET_PRICES } from '../lib/money'
import type { Movie, Seat, Session, TicketType } from '../types'
import type { ApiMovie, ApiSeat, ApiShowtimeSeats } from './types'

const SEATS_PER_ROW = 10
const ROW_LABELS = ['A', 'B', 'C', 'D', 'E'] as const

/**
 * Screen is at the top of the map (row A = front).
 * Front = basic, center sweet spot = VIP, back = premium.
 */
function ticketTypeForRow(rowIndex: number): TicketType {
  if (rowIndex <= 1) return 'basic' // A–B (frente)
  if (rowIndex <= 3) return 'vip' // C–D (centro)
  return 'premium' // E (fundo)
}

function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function parseApiDate(date: string) {
  const [day, month, year] = date.split('/').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

function parseTime(time: string): [number, number] {
  const [hours, minutes] = time.split(':').map(Number)
  return [hours || 0, minutes || 0]
}

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatSessionDate(date: Date) {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatSessionWeekday(date: Date) {
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' })
  return weekday.charAt(0).toUpperCase() + weekday.slice(1)
}

/** Absolute datetime for a remapped schedule day + API clock time. */
export function sessionDateTime(dayOffset: number, time: string) {
  const [hours, minutes] = parseTime(time)
  const date = startOfToday()
  date.setDate(date.getDate() + Math.max(0, dayOffset))
  date.setHours(hours, minutes, 0, 0)
  return date
}

/** Maps an API schedule slot onto today + offset with the given clock time. */
export function toUpcomingDateTime(dayOffset: number, time: string) {
  const date = sessionDateTime(dayOffset, time)

  return {
    at: date,
    date: formatSessionDate(date),
    weekday: formatSessionWeekday(date),
    time: formatTime(date),
  }
}

/** Offset of an API day relative to the earliest day in that movie's schedule. */
export function dayOffsetFromSchedule(apiDate: string, scheduleStart: string) {
  const start = parseApiDate(scheduleStart)
  const current = parseApiDate(apiDate)
  const diffMs = current.getTime() - start.getTime()
  return Math.max(0, Math.round(diffMs / 86_400_000))
}

function sessionAbsoluteDate(session: Session) {
  const [day, month, year] = session.date.split('/').map(Number)
  const [hours, minutes] = parseTime(session.time)
  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}

export function isSessionUpcoming(session: Session) {
  return sessionAbsoluteDate(session).getTime() > Date.now()
}

export function compareSessionsByDateTime(a: Session, b: Session) {
  return sessionAbsoluteDate(a).getTime() - sessionAbsoluteDate(b).getTime()
}

/** Builds a Movie from the local 2026 catalog (works for ids beyond the Cineflex API). */
export function mapCurrentMovie(id: number, index = 0): Movie | undefined {
  const current = getCurrentMovie(id)
  if (!current) return undefined

  const isFeatured = index === 0 || id === 1
  const poster = toPosterImage(current.poster)
  const hero = toHeroImage(current.poster)

  return {
    id: String(id),
    title: current.title,
    highlight: current.highlight ?? (isFeatured ? 'Em cartaz' : undefined),
    synopsis: current.synopsis,
    genre: `${current.genre} • ${current.year}`,
    rating: current.rating,
    runtime: current.runtime,
    badge: current.badge ?? (isFeatured ? 'Destaque' : undefined),
    format: current.format ?? (isFeatured ? 'IMAX' : undefined),
    poster,
    hero,
    backdrop: hero,
    trailerUrl: current.trailerUrl,
  }
}

export function mapMovie(apiMovie: ApiMovie, index = 0): Movie {
  const fromCatalog = mapCurrentMovie(apiMovie.id, index)
  if (fromCatalog) return fromCatalog

  const year = new Date(apiMovie.releaseDate).getFullYear()
  const poster = toPosterImage(apiMovie.posterURL)
  const hero = toHeroImage(apiMovie.posterURL)
  const isFeatured = index === 0 || apiMovie.id === 1

  return {
    id: String(apiMovie.id),
    title: apiMovie.title,
    highlight: isFeatured ? 'Em cartaz' : undefined,
    synopsis: apiMovie.overview ?? 'Sinopse indisponível.',
    genre: Number.isFinite(year) ? `Cinema • ${year}` : 'Cinema',
    rating: Number((((apiMovie.id * 7) % 15) / 10 + 7.5).toFixed(1)),
    runtime: '—',
    badge: isFeatured ? 'Destaque' : undefined,
    format: isFeatured ? 'IMAX' : undefined,
    poster,
    hero,
    backdrop: hero,
  }
}

const ROOM_COUNT = 8

/** Stable room label derived from showtime (+ movie) since the API has no room field. */
export function roomForShowtime(showtimeId: number, movieId?: string | number) {
  const moviePart = Number(movieId) || 0
  const index = ((showtimeId * 3 + moviePart * 7) % ROOM_COUNT) + 1
  return `Sala ${index}`
}

export function mapSession(
  movieId: string,
  showtimeId: number,
  time: string,
  dayOffset: number,
): Session {
  const upcoming = toUpcomingDateTime(dayOffset, time)

  return {
    id: String(showtimeId),
    movieId,
    date: upcoming.date,
    dateLabel: `${upcoming.weekday}, ${upcoming.date}`,
    time: upcoming.time,
    cinema: 'CineRay',
    room: roomForShowtime(showtimeId, movieId),
  }
}

export function mapSessionFromShowtime(
  data: ApiShowtimeSeats,
  scheduleStart = data.day.date,
  movieId = String(data.movie.id),
): Session {
  return mapSession(
    movieId,
    data.id,
    data.name,
    dayOffsetFromSchedule(data.day.date, scheduleStart),
  )
}

export function mapSeat(apiSeat: ApiSeat, index: number): Seat {
  const rowIndex = Math.floor(index / SEATS_PER_ROW)
  const row = ROW_LABELS[rowIndex] ?? String.fromCharCode(65 + rowIndex)
  const number = Number(apiSeat.name) || index + 1
  const ticketType = ticketTypeForRow(rowIndex)
  const price = TICKET_PRICES[ticketType]
  const label = TICKET_LABELS[ticketType]

  if (!apiSeat.isAvailable) {
    return {
      id: String(apiSeat.id),
      row,
      number,
      status: 'unavailable',
      ticketType,
      price,
      label,
    }
  }

  return {
    id: String(apiSeat.id),
    row,
    number,
    status: ticketType,
    ticketType,
    price,
    label,
  }
}

export function mapSeats(apiSeats: ApiSeat[]): Seat[] {
  return apiSeats.map(mapSeat)
}

export function groupSeatsByRow(seats: Seat[]) {
  const rows = new Map<string, Seat[]>()

  for (const seat of seats) {
    const list = rows.get(seat.row) ?? []
    list.push(seat)
    rows.set(seat.row, list)
  }

  return Array.from(rows.entries()).map(([row, rowSeats]) => ({
    row,
    seats: rowSeats,
  }))
}
