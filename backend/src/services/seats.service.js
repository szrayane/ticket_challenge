import { db } from '../db/index.js'

export const HOLD_TTL_MS = 10 * 60 * 1000

function nowIso() {
  return new Date().toISOString()
}

function expiresAtIso(fromMs = Date.now()) {
  return new Date(fromMs + HOLD_TTL_MS).toISOString()
}

export function purgeExpiredHolds() {
  db.prepare(`DELETE FROM seat_holds WHERE expires_at <= ?`).run(nowIso())
}

export function listSoldSeatIds(sessionId) {
  const rows = db
    .prepare(
      `SELECT seat_id
       FROM tickets
       WHERE session_id = ? AND status = 'active'`,
    )
    .all(String(sessionId))
  return rows.map((row) => String(row.seat_id))
}

export function listHeldSeatIds(sessionId, { excludeHolderKey } = {}) {
  purgeExpiredHolds()
  const session = String(sessionId)
  const exclude = String(excludeHolderKey || '').trim()

  if (exclude) {
    const rows = db
      .prepare(
        `SELECT seat_id
         FROM seat_holds
         WHERE session_id = ?
           AND expires_at > ?
           AND holder_key != ?`,
      )
      .all(session, nowIso(), exclude)
    return rows.map((row) => String(row.seat_id))
  }

  const rows = db
    .prepare(
      `SELECT seat_id
       FROM seat_holds
       WHERE session_id = ?
         AND expires_at > ?`,
    )
    .all(session, nowIso())
  return rows.map((row) => String(row.seat_id))
}

/** Sold + held by others (optionally excluding the caller's holds). */
export function listUnavailableSeatIds(sessionId, { excludeHolderKey } = {}) {
  const sold = listSoldSeatIds(sessionId)
  const held = listHeldSeatIds(sessionId, { excludeHolderKey })
  return [...new Set([...sold, ...held])]
}

/** @deprecated use listUnavailableSeatIds */
export function listOccupiedSeatIds(sessionId) {
  return listUnavailableSeatIds(sessionId)
}

export function assertSeatsAvailable(sessionId, seatIds, { holderKey } = {}) {
  const session = String(sessionId || '').trim()
  const seats = [...new Set((seatIds || []).map((id) => String(id)))]
  const holder = String(holderKey || '').trim()

  if (!session) {
    const err = new Error('Sessão inválida.')
    err.status = 400
    throw err
  }

  if (seats.length === 0) {
    const err = new Error('Selecione ao menos um assento.')
    err.status = 400
    throw err
  }

  purgeExpiredHolds()

  const placeholders = seats.map(() => '?').join(', ')
  const sold = db
    .prepare(
      `SELECT seat_id
       FROM tickets
       WHERE session_id = ?
         AND status = 'active'
         AND seat_id IN (${placeholders})`,
    )
    .all(session, ...seats)

  if (sold.length > 0) {
    const labels = sold.map((row) => row.seat_id).join(', ')
    const err = new Error(
      `Assento(s) já comprado(s): ${labels}. Escolha outros assentos.`,
    )
    err.status = 409
    err.seatIds = sold.map((row) => String(row.seat_id))
    throw err
  }

  let held
  if (holder) {
    held = db
      .prepare(
        `SELECT seat_id
         FROM seat_holds
         WHERE session_id = ?
           AND expires_at > ?
           AND holder_key != ?
           AND seat_id IN (${placeholders})`,
      )
      .all(session, nowIso(), holder, ...seats)
  } else {
    held = db
      .prepare(
        `SELECT seat_id
         FROM seat_holds
         WHERE session_id = ?
           AND expires_at > ?
           AND seat_id IN (${placeholders})`,
      )
      .all(session, nowIso(), ...seats)
  }

  if (held.length > 0) {
    const labels = held.map((row) => row.seat_id).join(', ')
    const err = new Error(
      `Assento(s) em seleção por outra pessoa: ${labels}. Escolha outros.`,
    )
    err.status = 409
    err.seatIds = held.map((row) => String(row.seat_id))
    throw err
  }

  return true
}

export function holdSeat({ sessionId, seatId, holderKey }) {
  const session = String(sessionId || '').trim()
  const seat = String(seatId || '').trim()
  const holder = String(holderKey || '').trim()

  if (!session || !seat) {
    const err = new Error('Sessão e assento são obrigatórios.')
    err.status = 400
    throw err
  }
  if (!holder || holder.length < 8) {
    const err = new Error('Identificador de seleção inválido.')
    err.status = 400
    throw err
  }

  db.exec('BEGIN IMMEDIATE')
  try {
    purgeExpiredHolds()

    const sold = db
      .prepare(
        `SELECT 1 FROM tickets
         WHERE session_id = ? AND seat_id = ? AND status = 'active'`,
      )
      .get(session, seat)
    if (sold) {
      const err = new Error('Este assento já foi comprado.')
      err.status = 409
      throw err
    }

    const existing = db
      .prepare(
        `SELECT holder_key, expires_at
         FROM seat_holds
         WHERE session_id = ? AND seat_id = ?`,
      )
      .get(session, seat)

    const expires = expiresAtIso()

    if (existing) {
      if (existing.holder_key !== holder && existing.expires_at > nowIso()) {
        const err = new Error(
          'Este assento já está selecionado por outra pessoa.',
        )
        err.status = 409
        throw err
      }
      db.prepare(
        `UPDATE seat_holds
         SET holder_key = ?, expires_at = ?
         WHERE session_id = ? AND seat_id = ?`,
      ).run(holder, expires, session, seat)
    } else {
      db.prepare(
        `INSERT INTO seat_holds (session_id, seat_id, holder_key, expires_at)
         VALUES (?, ?, ?, ?)`,
      ).run(session, seat, holder, expires)
    }

    db.exec('COMMIT')
    return { sessionId: session, seatId: seat, expiresAt: expires }
  } catch (error) {
    try {
      db.exec('ROLLBACK')
    } catch {
      // ignore
    }
    throw error
  }
}

export function releaseSeat({ sessionId, seatId, holderKey }) {
  const session = String(sessionId || '').trim()
  const seat = String(seatId || '').trim()
  const holder = String(holderKey || '').trim()

  if (!session || !seat || !holder) {
    const err = new Error('Dados de liberação inválidos.')
    err.status = 400
    throw err
  }

  db.prepare(
    `DELETE FROM seat_holds
     WHERE session_id = ? AND seat_id = ? AND holder_key = ?`,
  ).run(session, seat, holder)

  return { released: true }
}

export function releaseSeatsForHolder(sessionId, seatIds, holderKey) {
  const session = String(sessionId || '').trim()
  const holder = String(holderKey || '').trim()
  const seats = [...new Set((seatIds || []).map((id) => String(id)))]
  if (!session || !holder || seats.length === 0) return

  const placeholders = seats.map(() => '?').join(', ')
  db.prepare(
    `DELETE FROM seat_holds
     WHERE session_id = ?
       AND holder_key = ?
       AND seat_id IN (${placeholders})`,
  ).run(session, holder, ...seats)
}

export function refreshHolds({ sessionId, seatIds, holderKey }) {
  const session = String(sessionId || '').trim()
  const holder = String(holderKey || '').trim()
  const seats = [...new Set((seatIds || []).map((id) => String(id)))]

  if (!session || !holder || seats.length === 0) {
    const err = new Error('Dados de renovação inválidos.')
    err.status = 400
    throw err
  }

  purgeExpiredHolds()
  const expires = expiresAtIso()
  const placeholders = seats.map(() => '?').join(', ')
  const result = db
    .prepare(
      `UPDATE seat_holds
       SET expires_at = ?
       WHERE session_id = ?
         AND holder_key = ?
         AND seat_id IN (${placeholders})`,
    )
    .run(expires, session, holder, ...seats)

  return { renewed: result.changes, expiresAt: expires }
}
