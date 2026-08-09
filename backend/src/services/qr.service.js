import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const SECRET = () =>
  String(process.env.TICKET_QR_SECRET || 'cineray-qr-dev-secret').trim()

export function createShareToken() {
  return randomBytes(18).toString('hex')
}

export function buildSignedQrPayload(fields) {
  const body = [
    'CINERAY-TICKET',
    `ID:${fields.ticketId}`,
    `USER:${fields.userId}`,
    `EMAIL:${fields.userEmail}`,
    `CPF:${fields.cpf || ''}`,
    `FILME:${sanitize(fields.movieTitle)}`,
    `DATA:${fields.sessionDate}`,
    `HORA:${fields.sessionTime}`,
    `CINEMA:${sanitize(fields.cinema)}`,
    `SALA:${sanitize(fields.room)}`,
    `ASSENTO:${fields.seatLabel}`,
  ].join('|')

  const sig = createHmac('sha256', SECRET()).update(body).digest('hex').slice(0, 32)
  return `${body}|SIG:${sig}`
}

export function verifySignedQrPayload(qrPayload) {
  const raw = String(qrPayload || '').trim()
  const match = raw.match(/^(.*)\|SIG:([a-f0-9]{32})$/i)
  if (!match) return { ok: false, reason: 'missing_signature' }

  const [, body, sig] = match
  const expected = createHmac('sha256', SECRET())
    .update(body)
    .digest('hex')
    .slice(0, 32)

  const a = Buffer.from(sig.toLowerCase())
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad_signature' }
  }

  const idMatch = body.match(/(?:^|\|)ID:([^|]+)/)
  return {
    ok: true,
    ticketId: idMatch ? idMatch[1].trim() : null,
    body,
  }
}

function sanitize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\|/g, '/')
    .slice(0, 48)
}
