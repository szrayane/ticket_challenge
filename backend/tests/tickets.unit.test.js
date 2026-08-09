import assert from 'node:assert/strict'
import {
  isTicketSessionUpcoming,
  parseTicketSessionAt,
} from '../src/services/tickets.service.js'

assert.equal(parseTicketSessionAt('', '20:00'), null)
assert.equal(parseTicketSessionAt('invalid', '20:00'), null)

const plain = parseTicketSessionAt('10/08/2026', '20:30')
assert.ok(plain instanceof Date)
assert.equal(plain.getFullYear(), 2026)
assert.equal(plain.getMonth(), 7)
assert.equal(plain.getDate(), 10)
assert.equal(plain.getHours(), 20)
assert.equal(plain.getMinutes(), 30)

const labeled = parseTicketSessionAt('Segunda-feira, 10/08/2026', '09:05')
assert.ok(labeled instanceof Date)
assert.equal(labeled.getHours(), 9)
assert.equal(labeled.getMinutes(), 5)

const midnight = parseTicketSessionAt('10/08/2026', undefined)
assert.equal(midnight.getHours(), 0)
assert.equal(midnight.getMinutes(), 0)

assert.equal(isTicketSessionUpcoming('01/01/2020', '10:00'), false)
assert.equal(isTicketSessionUpcoming('data-ruim', '10:00'), false)

const future = new Date(Date.now() + 48 * 60 * 60 * 1000)
const pad = (n) => String(n).padStart(2, '0')
const futureDate = `${pad(future.getDate())}/${pad(future.getMonth() + 1)}/${future.getFullYear()}`
const futureTime = `${pad(future.getHours())}:${pad(future.getMinutes())}`
assert.equal(isTicketSessionUpcoming(futureDate, futureTime), true)

console.log('tickets.unit.test.js ok')
