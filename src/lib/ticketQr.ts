/** Payload do QR de ingresso (acesso), vinculado à conta do cliente. */
export function buildTicketQrPayload(params: {
  ticketId: string
  userId: string
  userEmail: string
  movieTitle: string
  sessionDate: string
  sessionTime: string
  cinema: string
  room: string
  seatLabel: string
  cpf: string
}) {
  return [
    'CINERAY-TICKET',
    `ID:${params.ticketId}`,
    `USER:${params.userId}`,
    `EMAIL:${params.userEmail}`,
    `CPF:${params.cpf}`,
    `FILME:${sanitize(params.movieTitle)}`,
    `DATA:${params.sessionDate}`,
    `HORA:${params.sessionTime}`,
    `CINEMA:${sanitize(params.cinema)}`,
    `SALA:${sanitize(params.room)}`,
    `ASSENTO:${params.seatLabel}`,
  ].join('|')
}

function sanitize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\|/g, '/')
    .slice(0, 48)
}
