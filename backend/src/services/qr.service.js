import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'

const SECRET = () =>
  String(process.env.TICKET_QR_SECRET || 'cineray-qr-dev-secret').trim()

const ENC_PREFIX = 'CR2'
const OPAQUE_PREFIX = 'CR1'

const IV_LEN = 12
const TAG_LEN = 16

export function createShareToken() {
  return randomBytes(18).toString('hex')
}

function aesKey() {
  return createHash('sha256').update(SECRET()).digest()
}

export function buildSignedQrPayload(fields) {
  const ticketId = String(fields.ticketId || '').trim()
  if (!ticketId) throw new Error('ticketId é obrigatório para o QR.')

  const plaintext = JSON.stringify({ v: 1, tid: ticketId })
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv('aes-256-gcm', aesKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  const packed = Buffer.concat([iv, tag, encrypted])
  return `${ENC_PREFIX}.${packed.toString('base64url')}`
}

export function verifySignedQrPayload(qrPayload) {
  const raw = String(qrPayload || '').trim()

  if (raw.startsWith(`${ENC_PREFIX}.`)) {
    return verifyEncryptedPayload(raw)
  }

  const opaque = verifyOpaquePayload(raw)
  if (opaque) return opaque

  return verifyLegacyPayload(raw)
}

function verifyEncryptedPayload(raw) {
  const b64 = raw.slice(ENC_PREFIX.length + 1)
  let packed
  try {
    packed = Buffer.from(b64, 'base64url')
  } catch {
    return { ok: false, reason: 'bad_encoding' }
  }

  if (packed.length < IV_LEN + TAG_LEN + 1) {
    return { ok: false, reason: 'too_short' }
  }

  const iv = packed.subarray(0, IV_LEN)
  const tag = packed.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const encrypted = packed.subarray(IV_LEN + TAG_LEN)

  try {
    const decipher = createDecipheriv('aes-256-gcm', aesKey(), iv)
    decipher.setAuthTag(tag)
    const plaintext = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8')
    const data = JSON.parse(plaintext)
    const ticketId = String(data?.tid || '').trim()
    if (!ticketId) return { ok: false, reason: 'missing_ticket_id' }
    return { ok: true, ticketId, format: 'aes-gcm', body: plaintext }
  } catch {
    return { ok: false, reason: 'decrypt_failed' }
  }
}

function signBody(body) {
  return createHmac('sha256', SECRET()).update(body).digest('hex').slice(0, 32)
}

function signaturesMatch(actual, expected) {
  const a = Buffer.from(String(actual).toLowerCase())
  const b = Buffer.from(String(expected).toLowerCase())
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function verifyOpaquePayload(raw) {
  const match = raw.match(/^CR1\.([^.]+)\.([a-f0-9]{32})$/i)
  if (!match) return null

  const [, ticketId, sig] = match
  const body = `${OPAQUE_PREFIX}.${ticketId}`
  if (!signaturesMatch(sig, signBody(body))) {
    return { ok: false, reason: 'bad_signature', ticketId: null }
  }

  return { ok: true, ticketId, body, format: 'opaque' }
}

function verifyLegacyPayload(raw) {
  const match = raw.match(/^(.*)\|SIG:([a-f0-9]{32})$/i)
  if (!match) return { ok: false, reason: 'missing_signature' }

  const [, body, sig] = match
  const expected = signBody(body)
  if (!signaturesMatch(sig, expected)) {
    return { ok: false, reason: 'bad_signature' }
  }

  const idMatch = body.match(/(?:^|\|)ID:([^|]+)/)
  return {
    ok: true,
    ticketId: idMatch ? idMatch[1].trim() : null,
    body,
    format: 'legacy',
  }
}
