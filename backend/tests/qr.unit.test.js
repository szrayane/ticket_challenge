import assert from 'node:assert/strict'
import {
  buildSignedQrPayload,
  createShareToken,
  verifySignedQrPayload,
} from '../src/services/qr.service.js'

process.env.TICKET_QR_SECRET = 'unit-test-secret'

assert.match(createShareToken(), /^[a-f0-9]{36}$/)
assert.notEqual(createShareToken(), createShareToken())

let missingId = false
try {
  buildSignedQrPayload({})
} catch (error) {
  missingId = true
  assert.match(error.message, /ticketId/i)
}
assert.equal(missingId, true)

assert.equal(verifySignedQrPayload('').ok, false)
assert.equal(verifySignedQrPayload('CR2.not-valid').ok, false)
assert.equal(verifySignedQrPayload('CR1.tkt.badsignature00000000000000').ok, false)
assert.equal(verifySignedQrPayload('texto-sem-assinatura').ok, false)

const payload = buildSignedQrPayload({ ticketId: 'tkt_unit' })
const verified = verifySignedQrPayload(payload)
assert.equal(verified.ok, true)
assert.equal(verified.ticketId, 'tkt_unit')
assert.equal(verified.format, 'aes-gcm')

console.log('qr.unit.test.js ok')
