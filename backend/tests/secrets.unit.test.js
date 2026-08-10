import assert from 'node:assert/strict'
import { getTicketQrSecret, getStaffInviteCode } from '../src/config/secrets.js'

const previous = {
  TICKET_QR_SECRET: process.env.TICKET_QR_SECRET,
  STAFF_INVITE_CODE: process.env.STAFF_INVITE_CODE,
  NODE_ENV: process.env.NODE_ENV,
}

process.env.NODE_ENV = 'development'
process.env.TICKET_QR_SECRET = 'unit-dev-secret-ok'
assert.equal(getTicketQrSecret(), 'unit-dev-secret-ok')

delete process.env.TICKET_QR_SECRET
assert.throws(() => getTicketQrSecret(), /TICKET_QR_SECRET é obrigatório/)

process.env.NODE_ENV = 'production'
process.env.TICKET_QR_SECRET = 'cineray-qr-dev-secret'
assert.throws(() => getTicketQrSecret(), /inseguro para produção/)

process.env.TICKET_QR_SECRET = 'prod-strong-secret-value-32chars!!'
assert.equal(getTicketQrSecret(), 'prod-strong-secret-value-32chars!!')

process.env.STAFF_INVITE_CODE = 'cineray-staff'
assert.throws(() => getStaffInviteCode(), /inseguro para produção/)

process.env.STAFF_INVITE_CODE = 'invite-prod-xyz'
assert.equal(getStaffInviteCode(), 'invite-prod-xyz')

process.env.TICKET_QR_SECRET = previous.TICKET_QR_SECRET
process.env.STAFF_INVITE_CODE = previous.STAFF_INVITE_CODE
process.env.NODE_ENV = previous.NODE_ENV

console.log('secrets.unit.test.js ok')
