import type { CustomerTicket, TicketOrderGroup } from '../types'

/** Parses "Segunda-feira, 09/08/2026" or "09/08/2026" + "20:30". */
export function parseTicketSessionAt(
  sessionDate: string,
  sessionTime: string,
): Date | null {
  const dateMatch = String(sessionDate || '').match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!dateMatch) return null

  const [, day, month, year] = dateMatch
  const [hoursRaw, minutesRaw] = String(sessionTime || '00:00').split(':')
  const hours = Number(hoursRaw) || 0
  const minutes = Number(minutesRaw) || 0

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    hours,
    minutes,
    0,
    0,
  )
}

export function isTicketSessionUpcoming(ticket: CustomerTicket): boolean {
  const at = parseTicketSessionAt(ticket.sessionDate, ticket.sessionTime)
  if (!at) return false
  return at.getTime() > Date.now()
}

export function isTicketActive(ticket: CustomerTicket): boolean {
  return (ticket.status ?? 'active') !== 'cancelled'
}

export function canCancelTicket(ticket: CustomerTicket): boolean {
  return isTicketActive(ticket) && isTicketSessionUpcoming(ticket)
}

export function splitTicketsByRelevance(tickets: CustomerTicket[]) {
  const upcoming: CustomerTicket[] = []
  const history: CustomerTicket[] = []

  for (const ticket of tickets) {
    if (isTicketActive(ticket) && isTicketSessionUpcoming(ticket)) {
      upcoming.push(ticket)
    } else {
      history.push(ticket)
    }
  }

  return { upcoming, history }
}

export function groupTicketsByOrder(
  tickets: CustomerTicket[],
): TicketOrderGroup[] {
  const map = new Map<string, CustomerTicket[]>()

  for (const ticket of tickets) {
    const key =
      ticket.orderId ||
      `${ticket.sessionId}|${ticket.purchasedAt}|${ticket.userId}`
    const list = map.get(key) ?? []
    list.push(ticket)
    map.set(key, list)
  }

  const groups: TicketOrderGroup[] = []

  for (const [orderId, groupTickets] of map) {
    const sorted = [...groupTickets].sort((a, b) =>
      a.seatLabel.localeCompare(b.seatLabel, 'pt-BR'),
    )
    const first = sorted[0]
    if (!first) continue

    groups.push({
      orderId,
      movieTitle: first.movieTitle,
      moviePoster: first.moviePoster,
      sessionDate: first.sessionDate,
      sessionTime: first.sessionTime,
      cinema: first.cinema,
      room: first.room,
      purchasedAt: first.purchasedAt,
      paymentMethod: first.paymentMethod,
      tickets: sorted,
      totalPaid: sorted.reduce((sum, t) => sum + (Number(t.totalPaid) || 0), 0),
    })
  }

  return groups.sort(
    (a, b) =>
      new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime(),
  )
}

export function paymentMethodLabel(method: CustomerTicket['paymentMethod']) {
  switch (method) {
    case 'pix':
      return 'Pix'
    case 'wallet':
      return 'Carteira digital'
    case 'credit_card':
    default:
      return 'Cartão de crédito'
  }
}

export function createOrderId() {
  return `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
