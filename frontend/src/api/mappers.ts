import type { Seat, Session } from '../types'

function parseTime(time: string): [number, number] {
  const [hours, minutes] = time.split(':').map(Number)
  return [hours || 0, minutes || 0]
}

function sessionAbsoluteDate(session: Session) {
  const parts = String(session.date || '')
    .split('/')
    .map(Number)
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null
  const [day, month, year] = parts
  const [hours, minutes] = parseTime(session.time)
  const at = new Date(year, month - 1, day, hours, minutes, 0, 0)
  return Number.isNaN(at.getTime()) ? null : at
}

export function isSessionUpcoming(session: Session) {
  const at = sessionAbsoluteDate(session)
  if (!at) return false
  return at.getTime() > Date.now()
}

export function compareSessionsByDateTime(a: Session, b: Session) {
  const aAt = sessionAbsoluteDate(a)?.getTime() ?? Number.POSITIVE_INFINITY
  const bAt = sessionAbsoluteDate(b)?.getTime() ?? Number.POSITIVE_INFINITY
  return aAt - bAt
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
