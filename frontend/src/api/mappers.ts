import type { Seat, Session } from '../types'

function parseTime(time: string): [number, number] {
  const [hours, minutes] = time.split(':').map(Number)
  return [hours || 0, minutes || 0]
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
