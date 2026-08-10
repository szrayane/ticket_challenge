import {
  execute,
  isDuplicateKeyError,
  query,
  queryOne,
  withTransaction,
} from '../db/index.js'

export const HOLD_TTL_MS = 10 * 60 * 1000

function nowIso() {
  return new Date().toISOString()
}

function expiresAtIso(fromMs = Date.now()) {
  return new Date(fromMs + HOLD_TTL_MS).toISOString()
}

export async function purgeExpiredHolds(conn = null) {
  await execute(`DELETE FROM seat_holds WHERE expires_at <= ?`, [nowIso()], conn)
}

export async function lockSessionForUpdate(sessionId, conn) {
  const session = String(sessionId || '').trim()
  if (!session) {
    const err = new Error('Sessão inválida.')
    err.status = 400
    throw err
  }
  if (!conn) {
    throw new Error('lockSessionForUpdate exige conexão de transação.')
  }

  const row = await queryOne(
    `SELECT id FROM showtimes WHERE id = ? FOR UPDATE`,
    [session],
    conn,
  )
  if (!row) {
    const err = new Error('Sessão não encontrada.')
    err.status = 404
    throw err
  }
  return row
}

export async function lockSeatsForUpdate(sessionId, seatIds, conn) {
  const session = String(sessionId || '').trim()
  const seats = [...new Set((seatIds || []).map((id) => String(id)).filter(Boolean))]
  if (!session || seats.length === 0) return { tickets: [], holds: [] }
  if (!conn) {
    throw new Error('lockSeatsForUpdate exige conexão de transação.')
  }

  await lockSessionForUpdate(session, conn)

  const placeholders = seats.map(() => '?').join(', ')

  const tickets = await query(
    `SELECT seat_id, status
     FROM tickets
     WHERE session_id = ?
       AND status = 'active'
       AND seat_id IN (${placeholders})
     FOR UPDATE`,
    [session, ...seats],
    conn,
  )

  const holds = await query(
    `SELECT seat_id, holder_key, expires_at
     FROM seat_holds
     WHERE session_id = ?
       AND seat_id IN (${placeholders})
     FOR UPDATE`,
    [session, ...seats],
    conn,
  )

  return { tickets, holds }
}

export async function listSoldSeatIds(sessionId) {
  const rows = await query(
    `SELECT seat_id
     FROM tickets
     WHERE session_id = ? AND status = 'active'`,
    [String(sessionId)],
  )
  return rows.map((row) => String(row.seat_id))
}

export async function listHeldSeatIds(sessionId, { excludeHolderKey } = {}) {
  await purgeExpiredHolds()
  const session = String(sessionId)
  const exclude = String(excludeHolderKey || '').trim()

  if (exclude) {
    const rows = await query(
      `SELECT seat_id
       FROM seat_holds
       WHERE session_id = ?
         AND expires_at > ?
         AND holder_key != ?`,
      [session, nowIso(), exclude],
    )
    return rows.map((row) => String(row.seat_id))
  }

  const rows = await query(
    `SELECT seat_id
     FROM seat_holds
     WHERE session_id = ?
       AND expires_at > ?`,
    [session, nowIso()],
  )
  return rows.map((row) => String(row.seat_id))
}

export async function listUnavailableSeatIds(sessionId, { excludeHolderKey } = {}) {
  const sold = await listSoldSeatIds(sessionId)
  const held = await listHeldSeatIds(sessionId, { excludeHolderKey })
  return [...new Set([...sold, ...held])]
}

export async function listOccupiedSeatIds(sessionId) {
  return listUnavailableSeatIds(sessionId)
}

export async function assertSeatsAvailable(
  sessionId,
  seatIds,
  { holderKey, forUpdate = false, conn = null } = {},
) {
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

  await purgeExpiredHolds(conn)

  if (forUpdate) {
    await lockSeatsForUpdate(session, seats, conn)
  }

  const placeholders = seats.map(() => '?').join(', ')
  const sold = await query(
    `SELECT seat_id
     FROM tickets
     WHERE session_id = ?
       AND status = 'active'
       AND seat_id IN (${placeholders})`,
    [session, ...seats],
    conn,
  )

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
    held = await query(
      `SELECT seat_id
       FROM seat_holds
       WHERE session_id = ?
         AND expires_at > ?
         AND holder_key != ?
         AND seat_id IN (${placeholders})`,
      [session, nowIso(), holder, ...seats],
      conn,
    )
  } else {
    held = await query(
      `SELECT seat_id
       FROM seat_holds
       WHERE session_id = ?
         AND expires_at > ?
         AND seat_id IN (${placeholders})`,
      [session, nowIso(), ...seats],
      conn,
    )
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

export async function holdSeat({ sessionId, seatId, holderKey }) {
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

  return withTransaction(async (conn) => {
    await purgeExpiredHolds(conn)

    const { tickets, holds } = await lockSeatsForUpdate(session, [seat], conn)
    if (tickets.length > 0) {
      const err = new Error('Este assento já foi comprado.')
      err.status = 409
      throw err
    }

    const existing = holds[0] || null
    const expires = expiresAtIso()

    if (existing) {
      if (existing.holder_key !== holder && existing.expires_at > nowIso()) {
        const err = new Error(
          'Este assento já está selecionado por outra pessoa.',
        )
        err.status = 409
        throw err
      }
      await execute(
        `UPDATE seat_holds
         SET holder_key = ?, expires_at = ?
         WHERE session_id = ? AND seat_id = ?`,
        [holder, expires, session, seat],
        conn,
      )
    } else {
      try {
        await execute(
          `INSERT INTO seat_holds (session_id, seat_id, holder_key, expires_at)
           VALUES (?, ?, ?, ?)`,
          [session, seat, holder, expires],
          conn,
        )
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          const err = new Error(
            'Este assento já está selecionado por outra pessoa.',
          )
          err.status = 409
          throw err
        }
        throw error
      }
    }

    return { sessionId: session, seatId: seat, expiresAt: expires }
  })
}

export async function releaseSeat({ sessionId, seatId, holderKey }) {
  const session = String(sessionId || '').trim()
  const seat = String(seatId || '').trim()
  const holder = String(holderKey || '').trim()

  if (!session || !seat || !holder) {
    const err = new Error('Dados de liberação inválidos.')
    err.status = 400
    throw err
  }

  await execute(
    `DELETE FROM seat_holds
     WHERE session_id = ? AND seat_id = ? AND holder_key = ?`,
    [session, seat, holder],
  )

  return { released: true }
}

export async function releaseSeatsForHolder(sessionId, seatIds, holderKey, conn = null) {
  const session = String(sessionId || '').trim()
  const holder = String(holderKey || '').trim()
  const seats = [...new Set((seatIds || []).map((id) => String(id)))]
  if (!session || !holder || seats.length === 0) return

  const placeholders = seats.map(() => '?').join(', ')
  await execute(
    `DELETE FROM seat_holds
     WHERE session_id = ?
       AND holder_key = ?
       AND seat_id IN (${placeholders})`,
    [session, holder, ...seats],
    conn,
  )
}

export async function refreshHolds({ sessionId, seatIds, holderKey }) {
  const session = String(sessionId || '').trim()
  const holder = String(holderKey || '').trim()
  const seats = [...new Set((seatIds || []).map((id) => String(id)))]

  if (!session || !holder || seats.length === 0) {
    const err = new Error('Dados de renovação inválidos.')
    err.status = 400
    throw err
  }

  await purgeExpiredHolds()
  const expires = expiresAtIso()
  const placeholders = seats.map(() => '?').join(', ')
  const result = await execute(
    `UPDATE seat_holds
     SET expires_at = ?
     WHERE session_id = ?
       AND holder_key = ?
       AND seat_id IN (${placeholders})`,
    [expires, session, holder, ...seats],
  )

  return { renewed: result.affectedRows || 0, expiresAt: expires }
}
