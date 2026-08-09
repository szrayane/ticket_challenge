import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import {
  buildSignedQrPayload,
  verifySignedQrPayload,
} from '../src/services/qr.service.js'

process.env.TICKET_QR_SECRET = 'test-secret'

const payload = buildSignedQrPayload({
  ticketId: 'tkt_1',
  userId: 'usr_1',
  userEmail: 'a@b.com',
  cpf: '123',
  movieTitle: 'Teste',
  sessionDate: '10/08/2026',
  sessionTime: '20:00',
  cinema: 'CineRay',
  room: 'Sala 1',
  seatLabel: 'A1',
})

assert.match(payload, /^CR2\.[A-Za-z0-9_-]+$/)
assert.doesNotMatch(payload, /tkt_1|EMAIL:|CPF:|FILME:|a@b\.com/i)
assert.equal(verifySignedQrPayload(payload).ok, true)
assert.equal(verifySignedQrPayload(payload).ticketId, 'tkt_1')
assert.equal(verifySignedQrPayload(payload).format, 'aes-gcm')

// Cada emissão usa IV aleatório → ciphertext diferente
const again = buildSignedQrPayload({ ticketId: 'tkt_1' })
assert.notEqual(payload, again)
assert.equal(verifySignedQrPayload(again).ticketId, 'tkt_1')

// Adulteração falha (GCM auth tag)
assert.equal(verifySignedQrPayload(payload.slice(0, -4) + 'XXXX').ok, false)

// CR1 (HMAC opaco) ainda valida
const opaqueBody = 'CR1.tkt_old'
const opaqueSig = createHmac('sha256', 'test-secret')
  .update(opaqueBody)
  .digest('hex')
  .slice(0, 32)
const opaque = `${opaqueBody}.${opaqueSig}`
assert.equal(verifySignedQrPayload(opaque).ok, true)
assert.equal(verifySignedQrPayload(opaque).ticketId, 'tkt_old')

// Legacy texto + SIG
const legacy =
  'CINERAY-TICKET|ID:tkt_legacy|USER:u1|EMAIL:a@b.com|CPF:1|FILME:X|DATA:1|HORA:20:00|CINEMA:C|SALA:1|ASSENTO:A1'
const legacySig = createHmac('sha256', 'test-secret')
  .update(legacy)
  .digest('hex')
  .slice(0, 32)
const legacyPayload = `${legacy}|SIG:${legacySig}`
assert.equal(verifySignedQrPayload(legacyPayload).ok, true)
assert.equal(verifySignedQrPayload(legacyPayload).ticketId, 'tkt_legacy')

console.log('qr.test.js ok')
