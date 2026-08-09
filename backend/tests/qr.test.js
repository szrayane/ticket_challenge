import assert from 'node:assert/strict'
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

assert.match(payload, /\|SIG:[a-f0-9]{32}$/i)
assert.equal(verifySignedQrPayload(payload).ok, true)
assert.equal(verifySignedQrPayload(payload).ticketId, 'tkt_1')
assert.equal(verifySignedQrPayload(payload.replace(/SIG:.+$/, 'SIG:00000000000000000000000000000000')).ok, false)
assert.equal(verifySignedQrPayload(payload.replace('|SIG:', '|XIG:')).ok, false)

console.log('qr.test.js ok')
