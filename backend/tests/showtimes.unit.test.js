import assert from 'node:assert/strict'
import {
  DEFAULT_CAPACITY,
  DEFAULT_PRICE,
  normalizeCapacity,
  normalizePrice,
  normalizeSessionFields,
} from '../src/services/showtimes.service.js'

assert.equal(normalizeCapacity(undefined), DEFAULT_CAPACITY)
assert.equal(normalizeCapacity('abc'), DEFAULT_CAPACITY)
assert.equal(normalizeCapacity(5), 10)
assert.equal(normalizeCapacity(50), 50)
assert.equal(normalizeCapacity(250), 200)
assert.equal(normalizeCapacity(37.6), 38)

assert.equal(normalizePrice(undefined), DEFAULT_PRICE)
assert.equal(normalizePrice(0), DEFAULT_PRICE)
assert.equal(normalizePrice(-10), DEFAULT_PRICE)
assert.equal(normalizePrice('x'), DEFAULT_PRICE)
assert.equal(normalizePrice(29.999), 30)
assert.equal(normalizePrice(32.456), 32.46)

const fields = normalizeSessionFields({
  sessionDate: '10/08/2026',
  sessionTime: '20:30',
  room: 'Sala VIP',
  cinema: 'CineRay Centro',
  capacity: 40,
  price: 35.5,
})
assert.equal(fields.sessionDate, '10/08/2026')
assert.equal(fields.sessionTime, '20:30')
assert.equal(fields.room, 'Sala VIP')
assert.equal(fields.cinema, 'CineRay Centro')
assert.equal(fields.capacity, 40)
assert.equal(fields.price, 35.5)
assert.match(fields.dateLabel, /10\/08\/2026/)

const defaults = normalizeSessionFields({
  date: '11/08/2026',
  time: '19:00',
})
assert.equal(defaults.room, 'Sala 1')
assert.equal(defaults.cinema, 'CineRay')
assert.equal(defaults.capacity, DEFAULT_CAPACITY)
assert.equal(defaults.price, DEFAULT_PRICE)

let badDate = false
try {
  normalizeSessionFields({ sessionDate: '2026-08-10', sessionTime: '20:00' })
} catch (error) {
  badDate = true
  assert.equal(error.status, 400)
  assert.match(error.message, /DD\/MM\/AAAA/)
}
assert.equal(badDate, true)

let badTime = false
try {
  normalizeSessionFields({ sessionDate: '10/08/2026', sessionTime: '8pm' })
} catch (error) {
  badTime = true
  assert.equal(error.status, 400)
  assert.match(error.message, /HH:MM/)
}
assert.equal(badTime, true)

console.log('showtimes.unit.test.js ok')
