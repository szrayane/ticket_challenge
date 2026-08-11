import assert from 'node:assert/strict'
import 'dotenv/config'
import { initDb, queryOne } from '../src/db/index.js'
import { createMovie } from '../src/services/movies.service.js'
import { createShowtime, buildSeats } from '../src/services/showtimes.service.js'
import { holdSeat } from '../src/services/seats.service.js'
import { createTickets } from '../src/services/tickets.service.js'

await initDb({ seed: true })

const organizer = await queryOne(
  `SELECT id, email, name, role FROM users WHERE email = ?`,
  ['organizador@cineray.com'],
)
assert.ok(organizer, 'seed organizer required')

const movie = await createMovie(organizer.id, {
  title: `Lock Test ${Date.now()}`,
  poster: 'https://image.tmdb.org/t/p/w500/vNMPddfv47amK83lCFoBd9wXVuc.jpg',
  synopsis: 'concorrência',
})

const tomorrow = new Date(Date.now() + 28 * 60 * 60 * 1000)
const pad = (n) => String(n).padStart(2, '0')
const sessionDate = `${pad(tomorrow.getDate())}/${pad(tomorrow.getMonth() + 1)}/${tomorrow.getFullYear()}`
const session = await createShowtime(organizer.id, movie.id, {
  sessionDate,
  sessionTime: '22:40',
  room: 'Sala Lock',
  cinema: 'CineRay',
  capacity: 12,
  price: 32,
})

const seats = await buildSeats(session.id)
const seat = seats[0]
assert.ok(seat)

const holders = Array.from({ length: 8 }, (_, i) => `holder_lock_${i}_${Date.now()}`)
const results = await Promise.allSettled(
  holders.map((holderKey) =>
    holdSeat({ sessionId: session.id, seatId: seat.id, holderKey }),
  ),
)

const won = results.filter((r) => r.status === 'fulfilled')
const lost = results.filter((r) => r.status === 'rejected')
assert.equal(won.length, 1, 'apenas um hold deve vencer com FOR UPDATE')
assert.equal(lost.length, holders.length - 1)
for (const result of lost) {
  const err = result.reason
  const ok =
    err?.status === 409 ||
    /já está selecionado|já foi comprado|Duplicate entry|Deadlock|Lock wait/i.test(
      String(err?.message || ''),
    )
  assert.ok(ok, `hold rejeitado inesperado: ${err?.message || err}`)
}

const winner = holders[results.findIndex((r) => r.status === 'fulfilled')]
const client = await queryOne(
  `SELECT id, email FROM users WHERE email = ?`,
  ['cliente1@cineray.com'],
)
assert.ok(client)

const [ticket] = await createTickets(
  { id: client.id, email: client.email },
  [
    {
      id: `tkt_lock_${Date.now()}`,
      movieId: movie.id,
      movieTitle: movie.title,
      moviePoster: movie.poster,
      sessionId: session.id,
      sessionDate: session.date,
      sessionTime: session.time,
      cinema: session.cinema,
      room: session.room,
      seatId: seat.id,
      seatLabel: `${seat.row}${seat.number}`,
      cpf: '00000000000',
      paymentMethod: 'pix',
      purchasedAt: new Date().toISOString(),
      totalPaid: 32,
      orderId: `ord_lock_${Date.now()}`,
    },
  ],
  { holderKey: winner },
)
assert.ok(ticket.id)

let secondBuyRejected = false
try {
  await createTickets(
    { id: client.id, email: client.email },
    [
      {
        id: `tkt_lock_dup_${Date.now()}`,
        movieId: movie.id,
        movieTitle: movie.title,
        moviePoster: movie.poster,
        sessionId: session.id,
        sessionDate: session.date,
        sessionTime: session.time,
        cinema: session.cinema,
        room: session.room,
        seatId: seat.id,
        seatLabel: `${seat.row}${seat.number}`,
        cpf: '00000000000',
        paymentMethod: 'pix',
        purchasedAt: new Date().toISOString(),
        totalPaid: 32,
        orderId: `ord_lock_dup_${Date.now()}`,
      },
    ],
  )
} catch (error) {
  secondBuyRejected = true
  assert.equal(error.status, 409)
}
assert.equal(secondBuyRejected, true, 'segunda compra do mesmo assento deve falhar')

console.log('seats-lock.test.js ok')
process.exit(0)
