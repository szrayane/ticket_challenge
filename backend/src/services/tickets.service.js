import { randomBytes } from 'node:crypto'
import {
  execute,
  isDuplicateKeyError,
  query,
  queryOne,
  withTransaction,
} from '../db/index.js'
import {
  assertSeatsAvailable,
  releaseSeatsForHolder,
} from './seats.service.js'
import {
  buildSignedQrPayload,
  createShareToken,
  verifySignedQrPayload,
} from './qr.service.js'
import { getShowtime } from './showtimes.service.js'

function createId(prefix) {
  return `${prefix}_${randomBytes(10).toString('hex')}`
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
    totalPaid: Number(row.total_paid),
    status: row.status || 'active',
    cancelledAt: row.cancelled_at || undefined,
    orderId: row.order_id || row.id,
    checkedInAt: row.checked_in_at || undefined,
    checkedInBy: row.checked_in_by || undefined,
    shareToken: row.share_token || undefined,
    sharePath: row.share_token ? `/i/${row.share_token}` : undefined,
  }
}

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

export async function listTicketsForUser(userId) {
  const rows = await query(
    `SELECT * FROM tickets
     WHERE user_id = ?
     ORDER BY purchased_at DESC`,
    [userId],
  )
  return rows.map(mapTicket)
}

export async function createTickets(user, tickets, { holderKey } = {}) {
  const role = String(user?.role || 'cliente').toLowerCase()
  if (role !== 'cliente') {
    const err = new Error(
      'Contas de organizador e portaria não podem comprar ingressos.',
    )
    err.status = 403
    throw err
  }

  if (!Array.isArray(tickets) || tickets.length === 0) {
    const err = new Error('Envie ao menos um ingresso.')
    err.status = 400
    throw err
  }

  const holder = String(holderKey || '').trim()

  try {
    return await withTransaction(async (conn) => {
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
          const err = new Error(`Assento duplicado na compra: ${seatId}.`)
          err.status = 400
          throw err
        }
        seats.push(seatId)
      }

      for (const [sessionId, seatIds] of bySession) {
        const showtime = await getShowtime(sessionId)
        if (!showtime) {
          const err = new Error('Sessão não encontrada.')
          err.status = 404
          throw err
        }
        if (!isTicketSessionUpcoming(showtime.date, showtime.time)) {
          const err = new Error(
            'Esta sessão já passou. Escolha outra data ou horário.',
          )
          err.status = 400
          throw err
        }
        await assertSeatsAvailable(sessionId, seatIds, {
          holderKey: holder,
          forUpdate: true,
          conn,
        })
      }

      const created = []
      for (const ticket of tickets) {
        const id = String(ticket.id || createId('tkt'))
        const shareToken = createShareToken()
        const qrPayload = buildSignedQrPayload({ ticketId: id })

        const row = {
          id,
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
          qr_payload: qrPayload,
          purchased_at: String(ticket.purchasedAt ?? new Date().toISOString()),
          total_paid: Number(ticket.totalPaid) || 0,
          status: 'active',
          cancelled_at: null,
          order_id: String(ticket.orderId ?? id),
          share_token: shareToken,
        }

        await execute(
          `INSERT INTO tickets (
            id, user_id, user_email, movie_id, movie_title, movie_poster,
            session_id, session_date, session_time, cinema, room,
            seat_id, seat_label, cpf, payment_method, qr_payload,
            purchased_at, total_paid, status, cancelled_at, order_id, share_token
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id,
            row.user_id,
            row.user_email,
            row.movie_id,
            row.movie_title,
            row.movie_poster,
            row.session_id,
            row.session_date,
            row.session_time,
            row.cinema,
            row.room,
            row.seat_id,
            row.seat_label,
            row.cpf,
            row.payment_method,
            row.qr_payload,
            row.purchased_at,
            row.total_paid,
            row.status,
            row.cancelled_at,
            row.order_id,
            row.share_token,
          ],
          conn,
        )
        created.push(mapTicket(row))
      }

      if (holder) {
        for (const [sessionId, seatIds] of bySession) {
          await releaseSeatsForHolder(sessionId, seatIds, holder, conn)
        }
      }

      return created
    })
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const err = new Error(
        'Um ou mais assentos acabaram de ser reservados por outra pessoa. Escolha outros assentos.',
      )
      err.status = 409
      throw err
    }
    throw error
  }
}

export async function cancelTicketForUser(userId, ticketId) {
  const row = await queryOne(
    'SELECT * FROM tickets WHERE id = ? AND user_id = ?',
    [ticketId, userId],
  )

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
  await execute(
    `UPDATE tickets
     SET status = 'cancelled', cancelled_at = ?
     WHERE id = ? AND user_id = ?`,
    [cancelledAt, ticketId, userId],
  )

  return mapTicket({
    ...row,
    status: 'cancelled',
    cancelled_at: cancelledAt,
  })
}

export function parseTicketIdFromQr(qrPayload) {
  const verified = verifySignedQrPayload(qrPayload)
  if (verified.ok && verified.ticketId) return verified.ticketId

  const raw = String(qrPayload || '').trim()
  if (!raw) return null
  const match = raw.match(/(?:^|\|)ID:([^|]+)/)
  return match ? match[1].trim() : null
}

export async function getTicketByShareToken(shareToken) {
  const token = String(shareToken || '').trim()
  if (!token) return null
  const row = await queryOne(`SELECT * FROM tickets WHERE share_token = ?`, [
    token,
  ])
  return row ? mapTicket(row) : null
}

export async function getTicketForUser(userId, ticketId) {
  const row = await queryOne(
    'SELECT * FROM tickets WHERE id = ? AND user_id = ?',
    [String(ticketId || ''), String(userId || '')],
  )
  return row ? mapTicket(row) : null
}

const TRANSFER_TTL_MS = 48 * 60 * 60 * 1000

export async function createTicketTransfer(userId, ticketId) {
  const row = await queryOne(
    'SELECT * FROM tickets WHERE id = ? AND user_id = ?',
    [String(ticketId || ''), String(userId || '')],
  )
  if (!row) {
    const err = new Error('Ingresso não encontrado.')
    err.status = 404
    throw err
  }
  if ((row.status || 'active') === 'cancelled') {
    const err = new Error('Ingresso cancelado não pode ser transferido.')
    err.status = 409
    throw err
  }
  if (row.checked_in_at) {
    const err = new Error('Ingresso já utilizado. Transferência bloqueada.')
    err.status = 409
    throw err
  }
  if (!isTicketSessionUpcoming(row.session_date, row.session_time)) {
    const err = new Error('Não é possível transferir após o início da sessão.')
    err.status = 409
    throw err
  }

  const transferToken = createShareToken()
  const expiresAt = new Date(Date.now() + TRANSFER_TTL_MS).toISOString()
  await execute(
    `UPDATE tickets
     SET transfer_token = ?, transfer_expires_at = ?
     WHERE id = ? AND user_id = ?`,
    [transferToken, expiresAt, row.id, userId],
  )

  return {
    ticketId: row.id,
    transferToken,
    transferPath: `/transferir/${transferToken}`,
    expiresAt,
  }
}

export async function getTransferPreview(token) {
  const transferToken = String(token || '').trim()
  if (!transferToken) return null
  const row = await queryOne(
    `SELECT * FROM tickets WHERE transfer_token = ?`,
    [transferToken],
  )
  if (!row) return null
  if ((row.status || 'active') === 'cancelled' || row.checked_in_at) return null
  if (
    row.transfer_expires_at &&
    new Date(row.transfer_expires_at).getTime() < Date.now()
  ) {
    return null
  }

  return {
    movieTitle: row.movie_title,
    moviePoster: row.movie_poster,
    sessionDate: row.session_date,
    sessionTime: row.session_time,
    cinema: row.cinema,
    room: row.room,
    seatLabel: row.seat_label,
    expiresAt: row.transfer_expires_at || undefined,
  }
}

export async function claimTicketTransfer(user, token) {
  const transferToken = String(token || '').trim()
  if (!transferToken) {
    const err = new Error('Token de transferência inválido.')
    err.status = 400
    throw err
  }

  const row = await queryOne(
    `SELECT * FROM tickets WHERE transfer_token = ?`,
    [transferToken],
  )
  if (!row) {
    const err = new Error('Link de transferência inválido ou já usado.')
    err.status = 404
    throw err
  }
  if (row.user_id === user.id) {
    const err = new Error('Este ingresso já está na sua conta.')
    err.status = 409
    throw err
  }
  if ((row.status || 'active') === 'cancelled') {
    const err = new Error('Ingresso cancelado.')
    err.status = 409
    throw err
  }
  if (row.checked_in_at) {
    const err = new Error('Ingresso já utilizado.')
    err.status = 409
    throw err
  }
  if (
    row.transfer_expires_at &&
    new Date(row.transfer_expires_at).getTime() < Date.now()
  ) {
    const err = new Error('Link de transferência expirado.')
    err.status = 410
    throw err
  }
  if (!isTicketSessionUpcoming(row.session_date, row.session_time)) {
    const err = new Error('Sessão já iniciou. Transferência bloqueada.')
    err.status = 409
    throw err
  }

  const shareToken = createShareToken()
  const qrPayload = buildSignedQrPayload({ ticketId: row.id })

  await execute(
    `UPDATE tickets
     SET user_id = ?,
         user_email = ?,
         cpf = ?,
         qr_payload = ?,
         share_token = ?,
         transfer_token = NULL,
         transfer_expires_at = NULL
     WHERE id = ? AND transfer_token = ?`,
    [
      user.id,
      user.email,
      user.cpf || row.cpf || '',
      qrPayload,
      shareToken,
      row.id,
      transferToken,
    ],
  )

  const updated = await queryOne(`SELECT * FROM tickets WHERE id = ?`, [row.id])
  return mapTicket(updated)
}

export async function listGateSessions({
  beforeMinutes = 60,
  afterMinutes = 180,
} = {}) {
  const fromTickets = await query(
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

  const fromShowtimes = await query(
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

export async function listRecentCheckIns({ limit = 30 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100)
  const rows = await query(
    `SELECT *
     FROM tickets
     WHERE checked_in_at IS NOT NULL
     ORDER BY checked_in_at DESC
     LIMIT ${safeLimit}`,
  )
  return rows.map(mapTicket)
}

export async function validateTicketCheckIn(staffUser, qrPayload, options = {}) {
  const expectedSessionId = String(options.expectedSessionId || '').trim()
  const force = Boolean(options.force)

  const verified = verifySignedQrPayload(qrPayload)
  if (!verified.ok) {
    const err = new Error(
      'QR inválido ou adulterado. Este código não foi emitido pela CineRay.',
    )
    err.status = 400
    throw err
  }

  const ticketId = verified.ticketId
  if (!ticketId) {
    const err = new Error('QR inválido. Não foi possível ler o ID do ingresso.')
    err.status = 400
    throw err
  }

  const row = await queryOne(`SELECT * FROM tickets WHERE id = ?`, [ticketId])
  if (!row) {
    const err = new Error('Ingresso não encontrado.')
    err.status = 404
    throw err
  }

  if (String(row.qr_payload || '') !== String(qrPayload || '').trim()) {
    const err = new Error(
      'QR não corresponde ao ingresso emitido (possível falsificação).',
    )
    err.status = 400
    err.ticket = mapTicket(row)
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
  await execute(
    `UPDATE tickets
     SET checked_in_at = ?, checked_in_by = ?
     WHERE id = ? AND checked_in_at IS NULL`,
    [checkedInAt, staffUser.id, ticketId],
  )

  const updated = await queryOne(`SELECT * FROM tickets WHERE id = ?`, [ticketId])
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
