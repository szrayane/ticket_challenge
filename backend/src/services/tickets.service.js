import { db } from '../db/index.js'
import {
  assertSeatsAvailable,
  releaseSeatsForHolder,
} from './seats.service.js'

function isUniqueSeatConflict(error) {
  const message = String(error?.message || '')
  return (
    message.includes('UNIQUE constraint failed') &&
    (message.includes('idx_tickets_session_seat_active') ||
      message.includes('tickets.session_id') ||
      message.includes('tickets.seat_id'))
  )
}

function mapTicket(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    movieId: row.movie_id,
    movieTitle: row.movie_title,
    moviePoster: row.movie_poster,
    sessionId: row.session_id,
    sessionDate: row.session_date,
    sessionTime: row.session_time,
    cinema: row.cinema,
    room: row.room,
    seatId: row.seat_id,
    seatLabel: row.seat_label,
    cpf: row.cpf,
    paymentMethod: row.payment_method,
    qrPayload: row.qr_payload,
    purchasedAt: row.purchased_at,
    totalPaid: row.total_paid,
    status: row.status || 'active',
    cancelledAt: row.cancelled_at || undefined,
    orderId: row.order_id || row.id,
    checkedInAt: row.checked_in_at || undefined,
    checkedInBy: row.checked_in_by || undefined,
  }
}

/** Parses "Segunda-feira, 09/08/2026" or "09/08/2026" + "20:30". */
export function parseTicketSessionAt(sessionDate, sessionTime) {
  const dateMatch = String(sessionDate || '').match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!dateMatch) return null

  const [, day, month, year] = dateMatch
  const [hoursRaw, minutesRaw] = String(sessionTime || '00:00').split(':')
  const hours = Number(hoursRaw) || 0
  const minutes = Number(minutesRaw) || 0

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    hours,
    minutes,
    0,
    0,
  )
}

export function isTicketSessionUpcoming(sessionDate, sessionTime) {
  const at = parseTicketSessionAt(sessionDate, sessionTime)
  if (!at) return false
  return at.getTime() > Date.now()
}

export function listTicketsForUser(userId) {
  const rows = db
    .prepare(
      `SELECT * FROM tickets
       WHERE user_id = ?
       ORDER BY purchased_at DESC`,
    )
    .all(userId)
  return rows.map(mapTicket)
}

export function createTickets(user, tickets, { holderKey } = {}) {
  if (!Array.isArray(tickets) || tickets.length === 0) {
    const err = new Error('Envie ao menos um ingresso.')
    err.status = 400
    throw err
  }

  const holder = String(holderKey || '').trim()

  const insert = db.prepare(`
    INSERT INTO tickets (
      id, user_id, user_email, movie_id, movie_title, movie_poster,
      session_id, session_date, session_time, cinema, room,
      seat_id, seat_label, cpf, payment_method, qr_payload,
      purchased_at, total_paid, status, cancelled_at, order_id
    ) VALUES (
      @id, @user_id, @user_email, @movie_id, @movie_title, @movie_poster,
      @session_id, @session_date, @session_time, @cinema, @room,
      @seat_id, @seat_label, @cpf, @payment_method, @qr_payload,
      @purchased_at, @total_paid, @status, @cancelled_at, @order_id
    )
  `)

  const created = []
  // IMMEDIATE locks writes so two checkouts cannot claim the same seat.
  db.exec('BEGIN IMMEDIATE')
  try {
    const bySession = new Map()

    for (const ticket of tickets) {
      const sessionId = String(ticket.sessionId ?? '')
      const seatId = String(ticket.seatId ?? '')
      if (!sessionId || !seatId) {
        const err = new Error('Sessão e assento são obrigatórios.')
        err.status = 400
        throw err
      }

      if (!bySession.has(sessionId)) bySession.set(sessionId, [])
      const seats = bySession.get(sessionId)
      if (seats.includes(seatId)) {
        const err = new Error(
          `Assento duplicado na compra: ${seatId}.`,
        )
        err.status = 400
        throw err
      }
      seats.push(seatId)
    }

    for (const [sessionId, seatIds] of bySession) {
      assertSeatsAvailable(sessionId, seatIds, { holderKey: holder })
    }

    for (const ticket of tickets) {
      const row = {
        id: String(ticket.id),
        user_id: user.id,
        user_email: user.email,
        movie_id: String(ticket.movieId ?? ''),
        movie_title: String(ticket.movieTitle ?? ''),
        movie_poster: String(ticket.moviePoster ?? ''),
        session_id: String(ticket.sessionId ?? ''),
        session_date: String(ticket.sessionDate ?? ''),
        session_time: String(ticket.sessionTime ?? ''),
        cinema: String(ticket.cinema ?? ''),
        room: String(ticket.room ?? ''),
        seat_id: String(ticket.seatId ?? ''),
        seat_label: String(ticket.seatLabel ?? ''),
        cpf: String(ticket.cpf ?? ''),
        payment_method: String(ticket.paymentMethod ?? 'credit_card'),
        qr_payload: String(ticket.qrPayload ?? ''),
        purchased_at: String(ticket.purchasedAt ?? new Date().toISOString()),
        total_paid: Number(ticket.totalPaid) || 0,
        status: 'active',
        cancelled_at: null,
        order_id: String(ticket.orderId ?? ticket.id),
      }
      insert.run(row)
      created.push(mapTicket(row))
    }

    if (holder) {
      for (const [sessionId, seatIds] of bySession) {
        releaseSeatsForHolder(sessionId, seatIds, holder)
      }
    }

    db.exec('COMMIT')
  } catch (error) {
    try {
      db.exec('ROLLBACK')
    } catch {
      // ignore if transaction already closed
    }
    if (isUniqueSeatConflict(error)) {
      const err = new Error(
        'Um ou mais assentos acabaram de ser reservados por outra pessoa. Escolha outros assentos.',
      )
      err.status = 409
      throw err
    }
    throw error
  }

  return created
}

export function cancelTicketForUser(userId, ticketId) {
  const row = db
    .prepare('SELECT * FROM tickets WHERE id = ? AND user_id = ?')
    .get(ticketId, userId)

  if (!row) {
    const err = new Error('Ingresso não encontrado.')
    err.status = 404
    throw err
  }

  if ((row.status || 'active') === 'cancelled') {
    const err = new Error('Este ingresso já foi cancelado.')
    err.status = 400
    throw err
  }

  if (!isTicketSessionUpcoming(row.session_date, row.session_time)) {
    const err = new Error(
      'Não é possível cancelar após o início da sessão.',
    )
    err.status = 400
    throw err
  }

  const cancelledAt = new Date().toISOString()
  db.prepare(
    `UPDATE tickets
     SET status = 'cancelled', cancelled_at = ?
     WHERE id = ? AND user_id = ?`,
  ).run(cancelledAt, ticketId, userId)

  return mapTicket({
    ...row,
    status: 'cancelled',
    cancelled_at: cancelledAt,
  })
}

export function parseTicketIdFromQr(qrPayload) {
  const raw = String(qrPayload || '').trim()
  if (!raw) return null
  const match = raw.match(/(?:^|\|)ID:([^|]+)/)
  return match ? match[1].trim() : null
}

export function listGateSessions({
  beforeMinutes = 60,
  afterMinutes = 180,
} = {}) {
  const fromTickets = db
    .prepare(
      `SELECT
         session_id AS sessionId,
         movie_title AS movieTitle,
         session_date AS sessionDate,
         session_time AS sessionTime,
         cinema,
         room,
         COUNT(*) AS tickets,
         SUM(CASE WHEN checked_in_at IS NOT NULL THEN 1 ELSE 0 END) AS checkedIn
       FROM tickets
       WHERE status = 'active'
       GROUP BY session_id, movie_title, session_date, session_time, cinema, room`,
    )
    .all()

  const fromShowtimes = db
    .prepare(
      `SELECT
         s.id AS sessionId,
         m.title AS movieTitle,
         s.session_date AS sessionDate,
         s.session_time AS sessionTime,
         s.cinema AS cinema,
         s.room AS room,
         (
           SELECT COUNT(*) FROM tickets t
           WHERE t.session_id = s.id AND t.status = 'active'
         ) AS tickets,
         (
           SELECT COUNT(*) FROM tickets t
           WHERE t.session_id = s.id
             AND t.status = 'active'
             AND t.checked_in_at IS NOT NULL
         ) AS checkedIn
       FROM showtimes s
       JOIN movies m ON m.id = s.movie_id
       WHERE COALESCE(m.is_active, 1) = 1`,
    )
    .all()

  const byId = new Map()
  for (const row of [...fromShowtimes, ...fromTickets]) {
    const sessionId = String(row.sessionId)
    const prev = byId.get(sessionId)
    byId.set(sessionId, {
      sessionId,
      movieTitle: String(row.movieTitle || prev?.movieTitle || ''),
      sessionDate: String(row.sessionDate || prev?.sessionDate || ''),
      sessionTime: String(row.sessionTime || prev?.sessionTime || ''),
      cinema: String(row.cinema || prev?.cinema || 'CineRay'),
      room: String(row.room || prev?.room || ''),
      tickets: Math.max(Number(row.tickets) || 0, Number(prev?.tickets) || 0),
      checkedIn: Math.max(
        Number(row.checkedIn) || 0,
        Number(prev?.checkedIn) || 0,
      ),
    })
  }

  const now = Date.now()
  const beforeMs = Math.max(0, Number(beforeMinutes) || 60) * 60 * 1000
  const afterMs = Math.max(0, Number(afterMinutes) || 180) * 60 * 1000

  const nearby = [...byId.values()]
    .map((session) => {
      const startsAt = parseTicketSessionAt(session.sessionDate, session.sessionTime)
      if (!startsAt || Number.isNaN(startsAt.getTime())) return null
      const startMs = startsAt.getTime()
      const minutesFromNow = Math.round((startMs - now) / 60000)
      return {
        ...session,
        startsAt: startsAt.toISOString(),
        minutesFromNow,
      }
    })
    .filter((session) => {
      if (!session) return false
      const startMs = new Date(session.startsAt).getTime()
      return startMs >= now - beforeMs && startMs <= now + afterMs
    })
    .sort(
      (a, b) =>
        Math.abs(a.minutesFromNow) - Math.abs(b.minutesFromNow) ||
        a.minutesFromNow - b.minutesFromNow,
    )

  return nearby.map((session, index) => ({
    ...session,
    suggested: index === 0,
  }))
}

export function listRecentCheckIns({ limit = 30 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100)
  const rows = db
    .prepare(
      `SELECT *
       FROM tickets
       WHERE checked_in_at IS NOT NULL
       ORDER BY checked_in_at DESC
       LIMIT ?`,
    )
    .all(safeLimit)
  return rows.map(mapTicket)
}

export function validateTicketCheckIn(staffUser, qrPayload, options = {}) {
  const expectedSessionId = String(options.expectedSessionId || '').trim()
  const force = Boolean(options.force)

  const ticketId = parseTicketIdFromQr(qrPayload)
  if (!ticketId) {
    const err = new Error('QR inválido. Não foi possível ler o ID do ingresso.')
    err.status = 400
    throw err
  }

  const row = db.prepare(`SELECT * FROM tickets WHERE id = ?`).get(ticketId)
  if (!row) {
    const err = new Error('Ingresso não encontrado.')
    err.status = 404
    throw err
  }

  if ((row.status || 'active') === 'cancelled') {
    const err = new Error('Ingresso cancelado.')
    err.status = 409
    err.ticket = mapTicket(row)
    throw err
  }

  if (row.checked_in_at) {
    const err = new Error(
      `Ingresso já utilizado em ${new Date(row.checked_in_at).toLocaleString('pt-BR')}.`,
    )
    err.status = 409
    err.ticket = mapTicket(row)
    throw err
  }

  const at = parseTicketSessionAt(row.session_date, row.session_time)
  if (!at) {
    const err = new Error('Data da sessão inválida neste ingresso.')
    err.status = 400
    err.ticket = mapTicket(row)
    throw err
  }

  const now = Date.now()
  const windowEnd = at.getTime() + 3 * 60 * 60 * 1000
  if (now > windowEnd) {
    const err = new Error(
      'Sessão encerrada. Este ingresso não pode mais ser validado.',
    )
    err.status = 409
    err.ticket = mapTicket(row)
    throw err
  }

  if (expectedSessionId && row.session_id !== expectedSessionId && !force) {
    const err = new Error(
      'Este ingresso é de outra sessão/sala. Confira o filme e o horário.',
    )
    err.status = 409
    err.code = 'SESSION_MISMATCH'
    err.ticket = mapTicket(row)
    throw err
  }

  const checkedInAt = new Date().toISOString()
  db.prepare(
    `UPDATE tickets
     SET checked_in_at = ?, checked_in_by = ?
     WHERE id = ? AND checked_in_at IS NULL`,
  ).run(checkedInAt, staffUser.id, ticketId)

  const updated = db.prepare(`SELECT * FROM tickets WHERE id = ?`).get(ticketId)
  const ticket = mapTicket(updated)
  const mismatched =
    Boolean(expectedSessionId) && ticket.sessionId !== expectedSessionId

  return {
    ok: true,
    message: mismatched
      ? 'Check-in feito com alerta: sessão diferente da sala selecionada.'
      : 'Ingresso validado com sucesso.',
    warning: mismatched || undefined,
    ticket,
  }
}
