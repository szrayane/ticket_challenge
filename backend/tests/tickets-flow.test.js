import assert from 'node:assert/strict'
import { createShowtime, buildLocalSeats, getShowtime } from '../src/services/showtimes.service.js'
import { db } from '../src/db/index.js'
import { createLocalMovie } from '../src/services/movies.service.js'
import {
  createTickets,
  validateTicketCheckIn,
} from '../src/services/tickets.service.js'

const organizer = db
  .prepare(`SELECT id, email, name, role FROM users WHERE email = ?`)
  .get('organizador@cineray.com')
assert.ok(organizer, 'seed organizer required')

const movie = createLocalMovie(organizer.id, {
  title: `Teste Assentos ${Date.now()}`,
  poster: 'https://image.tmdb.org/t/p/w500/vNMPddfv47amK83lCFoBd9wXVuc.jpg',
  synopsis: 'teste',
})

const tomorrow = new Date(Date.now() + 26 * 60 * 60 * 1000)
const pad = (n) => String(n).padStart(2, '0')
const sessionDate = `${pad(tomorrow.getDate())}/${pad(tomorrow.getMonth() + 1)}/${tomorrow.getFullYear()}`
const session = createShowtime(organizer.id, movie.id, {
  sessionDate,
  sessionTime: '21:15',
  room: 'Sala Teste',
  cinema: 'CineRay',
  capacity: 20,
  price: 30,
})

assert.equal(getShowtime(session.id)?.capacity, 20)
const seats = buildLocalSeats(session.id)
assert.equal(seats.length, 20)

const client = db
  .prepare(`SELECT id, email, name, role FROM users WHERE email = ?`)
  .get('cliente1@cineray.com')
assert.ok(client)

const [ticket] = createTickets(
  { id: client.id, email: client.email },
  [
    {
      id: `tkt_test_${Date.now()}`,
      movieId: movie.id,
      movieTitle: movie.title,
      moviePoster: movie.poster,
      sessionId: session.id,
      sessionDate: session.date,
      sessionTime: session.time,
      cinema: session.cinema,
      room: session.room,
      seatId: seats[0].id,
      seatLabel: `${seats[0].row}${seats[0].number}`,
      cpf: '00000000000',
      paymentMethod: 'pix',
      purchasedAt: new Date().toISOString(),
      totalPaid: 30,
      orderId: `ord_${Date.now()}`,
    },
  ],
)

assert.match(ticket.qrPayload, /\|SIG:[a-f0-9]{32}$/i)
assert.ok(ticket.shareToken)

const gate = db
  .prepare(`SELECT id, email, name, role FROM users WHERE email = ?`)
  .get('portaria@cineray.com')

const ok = validateTicketCheckIn(gate, ticket.qrPayload)
assert.equal(ok.ok, true)

let rejected = false
try {
  validateTicketCheckIn(gate, ticket.qrPayload)
} catch (error) {
  rejected = true
  assert.match(String(error.message), /já utilizado/i)
}
assert.equal(rejected, true)

let forged = false
try {
  validateTicketCheckIn(gate, ticket.qrPayload.replace(/SIG:[a-f0-9]+$/i, 'SIG:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'))
} catch {
  forged = true
}
assert.equal(forged, true)

console.log('tickets-flow.test.js ok')
