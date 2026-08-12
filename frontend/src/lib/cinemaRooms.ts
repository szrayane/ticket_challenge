export const CINEMA_NAME = 'CineRay Centro'

export const CINEMA_ROOMS = [
  { id: 'Sala 1', number: 1 },
  { id: 'Sala 2', number: 2 },
  { id: 'Sala 3', number: 3 },
  { id: 'Sala 4', number: 4 },
  { id: 'Sala 5', number: 5 },
  { id: 'Sala 6', number: 6 },
  { id: 'Sala 7', number: 7 },
  { id: 'Sala 8', number: 8 },
  { id: 'Sala 9', number: 9 },
  { id: 'Sala 10', number: 10 },
] as const

export type CinemaRoomId = (typeof CINEMA_ROOMS)[number]['id']

export function normalizeCinemaRoom(value?: string | null) {
  const raw = String(value || '').trim()
  const found = CINEMA_ROOMS.find(
    (room) => room.id.toLowerCase() === raw.toLowerCase(),
  )
  if (found) return found.id

  const match = raw.match(/(\d{1,2})/)
  if (match) {
    const n = Number(match[1])
    if (n >= 1 && n <= CINEMA_ROOMS.length) {
      return CINEMA_ROOMS[n - 1].id
    }
  }

  return CINEMA_ROOMS[0].id
}
