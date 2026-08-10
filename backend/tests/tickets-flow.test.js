import assert from 'node:assert/strict'
import 'dotenv/config'
import { initDb, queryOne } from '../src/db/index.js'
import {
  createShowtime,
  buildSeats,
  getShowtime,
} from '../src/services/showtimes.service.js'
import { createMovie } from '../src/services/movies.service.js'
import {
  createTickets,
  validateTicketCheckIn,
} from '../src/services/tickets.service.js'

await initDb()

const organizer = await queryOne(
  `SELECT id, email, name, role FROM users WHERE email = ?`,
  ['organizador@cineray.com'],
)
assert.ok(organizer, 'seed organizer required')

const movie = await createMovie(organizer.id, {
  title: `Teste Assentos ${Date.now()}`,
  poster: 'https://image.tmdb.org/t/p/w500/vNMPddfv47amK83lCFoBd9wXVuc.jpg',
  synopsis: 'teste',
})

const tomorrow = new Date(Date.now() + 26 * 60 * 60 * 1000)
const pad = (n) => String(n).padStart(2, '0')
const sessionDate = `${pad(tomorrow.getDate())}/${pad(tomorrow.getMonth() + 1)}/${tomorrow.getFullYear()}`
const session = await createShowtime(organizer.id, movie.id, {
  sessionDate,
  sessionTime: '21:15',
  room: 'Sala Teste',
  cinema: 'CineRay',
  capacity: 20,
  price: 30,
})

assert.equal((await getShowtime(session.id))?.capacity, 20)
const seats = await buildSeats(session.id)
assert.equal(seats.length, 20)

const client = await queryOne(
  `SELECT id, email, name, role FROM users WHERE email = ?`,
  ['cliente1@cineray.com'],
)
assert.ok(client)

const [ticket] = await createTickets(
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

assert.match(ticket.qrPayload, /^CR2\.[A-Za-z0-9_-]+$/)
assert.doesNotMatch(ticket.qrPayload, /EMAIL:|CPF:|FILME:|tkt_/i)
assert.ok(ticket.shareToken)

const gate = await queryOne(
  `SELECT id, email, name, role FROM users WHERE email = ?`,
  ['portaria@cineray.com'],
)

const ok = await validateTicketCheckIn(gate, ticket.qrPayload)
assert.equal(ok.ok, true)

let rejected = false
try {
  await validateTicketCheckIn(gate, ticket.qrPayload)
} catch (error) {
  rejected = true
  assert.match(String(error.message), /já utilizado/i)
}
assert.equal(rejected, true)

let forged = false
try {
  await validateTicketCheckIn(gate, ticket.qrPayload.slice(0, -6) + 'AAAAAA')
} catch {
  forged = true
}
assert.equal(forged, true)

console.log('tickets-flow.test.js ok')
process.exit(0)
