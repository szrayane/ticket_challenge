import { appRequest } from './appClient'
import type { Movie, Session } from '../types'

export type LocalMovieInput = {
  title: string
  synopsis?: string
  genre?: string
  rating?: number
  runtime?: string
  format?: string
  badge?: string
  poster: string
  hero?: string
  backdrop?: string
  trailerUrl?: string
  isActive?: boolean
}

export type LocalShowtimeInput = {
  sessionDate: string
  sessionTime: string
  cinema?: string
  room?: string
  dateLabel?: string
  capacity?: number
  price?: number
}

export type ShowtimeOccupancy = {
  sessionId: string
  session: Session
  totalSeats: number
  sold: number
  held: number
  unavailable: number
  available: number
  revenue: number
}

export type OrganizerReport = {
  movies: number
  activeMovies: number
  showtimes: number
  ticketsSold: number
  checkIns: number
  revenue: number
  liveAt?: string
  sessions: Array<
    Session & {
      movieTitle: string
      moviePoster: string
      movieActive: boolean
      sold: number
      held: number
      available: number
      totalSeats: number
      revenue: number
      checkedIn: number
      occupancyPct: number
    }
  >
}

export const POSTER_GALLERY = [
  {
    label: 'Noir urbano',
    url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80',
  },
  {
    label: 'Drama íntimo',
    url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&q=80',
  },
  {
    label: 'Ação noturna',
    url: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=600&q=80',
  },
  {
    label: 'Ficção',
    url: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&q=80',
  },
  {
    label: 'Clássico',
    url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&q=80',
  },
  {
    label: 'Suspense',
    url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&q=80',
  },
]

export function isLocalMovieId(id: string) {
  return String(id).startsWith('mov_')
}

export function isLocalShowtimeId(id: string) {
  return String(id).startsWith('st_')
}

export function toBrDate(isoDate: string) {
  const m = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return isoDate
  return `${m[3]}/${m[2]}/${m[1]}`
}

export function toIsoDate(brDate: string) {
  const m = String(brDate || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return ''
  return `${m[3]}-${m[2]}-${m[1]}`
}

export async function fetchLocalMovies() {
  const data = await appRequest<{ movies: Movie[] }>('/movies', { auth: false })
  return data.movies.map((movie) => ({ ...movie, source: 'local' as const }))
}

export async function fetchAdminLocalMovies() {
  const data = await appRequest<{ movies: Movie[] }>('/movies/admin')
  return data.movies.map((movie) => ({ ...movie, source: 'local' as const }))
}

export async function fetchOrganizerReport() {
  return appRequest<OrganizerReport>('/movies/report')
}

export async function fetchLocalMovie(id: string) {
  const data = await appRequest<{ movie: Movie }>(
    `/movies/${encodeURIComponent(id)}`,
    { auth: false },
  )
  return { ...data.movie, source: 'local' as const }
}

export async function fetchLocalMovieShowtimes(movieId: string) {
  const data = await appRequest<{ movie: Movie; sessions: Session[] }>(
    `/movies/${encodeURIComponent(movieId)}/showtimes`,
  )
  return {
    movie: { ...data.movie, source: 'local' as const },
    sessions: data.sessions,
  }
}

export async function fetchLocalShowtimeSeats(showtimeId: string) {
  const data = await appRequest<{
    movie: Movie
    session: Session
    seats: Array<{
      id: string
      name: string
      isAvailable: boolean
      row: string
      number: number
      ticketType: 'basic' | 'premium' | 'vip'
      price?: number
    }>
  }>(`/showtimes/${encodeURIComponent(showtimeId)}/seats`, { auth: false })
  return data
}

export async function fetchShowtimeOccupancy(showtimeId: string) {
  return appRequest<ShowtimeOccupancy>(
    `/showtimes/${encodeURIComponent(showtimeId)}/occupancy`,
  )
}

export async function createLocalMovie(input: LocalMovieInput) {
  const data = await appRequest<{ movie: Movie }>('/movies', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.movie
}

export async function updateLocalMovie(id: string, input: Partial<LocalMovieInput>) {
  const data = await appRequest<{ movie: Movie }>(
    `/movies/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  )
  return data.movie
}

export async function setLocalMovieActive(id: string, isActive: boolean) {
  const data = await appRequest<{ movie: Movie }>(
    `/movies/${encodeURIComponent(id)}/active`,
    {
      method: 'POST',
      body: JSON.stringify({ isActive }),
    },
  )
  return data.movie
}

export async function deleteLocalMovie(id: string) {
  await appRequest<void>(`/movies/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function createLocalShowtime(
  movieId: string,
  input: LocalShowtimeInput,
) {
  const data = await appRequest<{ session: Session }>(
    `/movies/${encodeURIComponent(movieId)}/showtimes`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
  return data.session
}

export async function updateLocalShowtime(
  showtimeId: string,
  input: LocalShowtimeInput,
) {
  const data = await appRequest<{ session: Session }>(
    `/showtimes/${encodeURIComponent(showtimeId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  )
  return data.session
}

export async function duplicateLocalShowtime(
  showtimeId: string,
  input: Partial<LocalShowtimeInput> = {},
) {
  const data = await appRequest<{ session: Session }>(
    `/showtimes/${encodeURIComponent(showtimeId)}/duplicate`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
  return data.session
}

export async function deleteLocalShowtime(showtimeId: string) {
  await appRequest<void>(`/showtimes/${encodeURIComponent(showtimeId)}`, {
    method: 'DELETE',
  })
}

export async function validateTicketQr(
  qrPayload: string,
  options: { expectedSessionId?: string; force?: boolean } = {},
) {
  return appRequest<{
    ok: boolean
    message: string
    warning?: boolean
    ticket: import('../types').CustomerTicket
  }>('/tickets/validate', {
    method: 'POST',
    body: JSON.stringify({
      qrPayload,
      expectedSessionId: options.expectedSessionId || undefined,
      force: options.force || undefined,
    }),
  })
}

export async function searchTmdbCatalog(query = '', page = 1) {
  const q = encodeURIComponent(query)
  return appRequest<{
    results: Array<{
      tmdbId: number
      title: string
      synopsis: string
      rating: number
      releaseDate: string
      poster: string
      backdrop: string
      genre: string
    }>
    page: number
    totalPages: number
  }>(`/catalog/tmdb/search?q=${q}&page=${page}`)
}

export type MovieCastMember = {
  id: number
  name: string
  character: string
  photo: string
  order: number
}

export async function fetchMovieCast(options: {
  title?: string
  tmdbId?: number
  limit?: number
}) {
  const params = new URLSearchParams()
  if (options.title) params.set('title', options.title)
  if (options.tmdbId) params.set('tmdbId', String(options.tmdbId))
  if (options.limit) params.set('limit', String(options.limit))
  return appRequest<{ tmdbId: number | null; cast: MovieCastMember[] }>(
    `/catalog/cast?${params.toString()}`,
    { auth: false },
  )
}

export async function createEventFromTmdb(input: {
  tmdbId: number
  sessionDate: string
  sessionTime: string
  cinema?: string
  room?: string
  capacity?: number
  price?: number
}) {
  return appRequest<{ movie: Movie; session: Session }>('/catalog/events', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function fetchSharedTicket(shareToken: string) {
  return appRequest<{
    ticket: Pick<
      import('../types').CustomerTicket,
      | 'id'
      | 'movieTitle'
      | 'moviePoster'
      | 'sessionDate'
      | 'sessionTime'
      | 'cinema'
      | 'room'
      | 'seatLabel'
      | 'qrPayload'
      | 'status'
      | 'checkedInAt'
    >
  }>(`/tickets/share/${encodeURIComponent(shareToken)}`, { auth: false })
}

export type GateSession = {
  sessionId: string
  movieTitle: string
  sessionDate: string
  sessionTime: string
  cinema: string
  room: string
  tickets: number
  checkedIn: number
  startsAt?: string
  minutesFromNow?: number
  suggested?: boolean
}

export async function fetchGateSessions() {
  const data = await appRequest<{ sessions: GateSession[] }>(
    '/tickets/gate/sessions',
  )
  return data.sessions
}

export async function fetchGateCheckIns(limit = 30) {
  const data = await appRequest<{ tickets: import('../types').CustomerTicket[] }>(
    `/tickets/gate/checkins?limit=${limit}`,
  )
  return data.tickets
}

export async function createTicketTransfer(ticketId: string) {
  return appRequest<{
    ticketId: string
    transferToken: string
    transferPath: string
    expiresAt: string
  }>(`/tickets/${encodeURIComponent(ticketId)}/transfer`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function fetchTransferPreview(token: string) {
  return appRequest<{
    transfer: {
      movieTitle: string
      moviePoster: string
      sessionDate: string
      sessionTime: string
      cinema: string
      room: string
      seatLabel: string
      expiresAt?: string
    }
  }>(`/tickets/transfer/${encodeURIComponent(token)}`, { auth: false })
}

export async function claimTicketTransfer(token: string) {
  return appRequest<{ ticket: import('../types').CustomerTicket }>(
    `/tickets/transfer/${encodeURIComponent(token)}/claim`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}
