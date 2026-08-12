export type CinemaVenue = {
  name: string
  address: string
  neighborhood: string
  lat: number
  lng: number
}

export const CINEMA_VENUES: CinemaVenue[] = [
  {
    name: 'CineRay Centro',
    address: 'Av. São João, 439 — República',
    neighborhood: 'São Paulo, SP',
    lat: -23.5434,
    lng: -46.6405,
  },
  {
    name: 'CineRay Norte',
    address: 'Av. Otto Baumgart, 500 — Vila Guilherme',
    neighborhood: 'São Paulo, SP',
    lat: -23.5152,
    lng: -46.6178,
  },
  {
    name: 'CineRay Shopping',
    address: 'Av. das Nações Unidas, 4777 — Brooklin',
    neighborhood: 'São Paulo, SP',
    lat: -23.6100,
    lng: -46.6972,
  },
]

export const CINEMA_NAMES = CINEMA_VENUES.map((venue) => venue.name)

export const CINEMA_NAME = CINEMA_NAMES[0]

const DEFAULT_VENUE = CINEMA_VENUES[0]

export function normalizeCinemaName(value?: string | null) {
  const raw = String(value || '').trim()
  if (!raw) return CINEMA_NAME
  const exact = CINEMA_VENUES.find(
    (venue) => venue.name.toLowerCase() === raw.toLowerCase(),
  )
  if (exact) return exact.name
  const partial = CINEMA_VENUES.find(
    (venue) =>
      raw.toLowerCase().includes(venue.name.toLowerCase()) ||
      venue.name.toLowerCase().includes(raw.toLowerCase()),
  )
  return partial?.name || CINEMA_NAME
}

export function resolveCinemaVenue(name?: string | null): CinemaVenue {
  return (
    CINEMA_VENUES.find((venue) => venue.name === normalizeCinemaName(name)) ||
    DEFAULT_VENUE
  )
}

export function cinemaMapEmbedUrl(venue: CinemaVenue) {
  const q = encodeURIComponent(`${venue.lat},${venue.lng}`)
  return `https://maps.google.com/maps?q=${q}&z=16&output=embed`
}

export function cinemaMapsLink(venue: CinemaVenue) {
  const q = encodeURIComponent(
    `${venue.name}, ${venue.address}, ${venue.neighborhood}`,
  )
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}
