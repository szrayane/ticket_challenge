import { randomBytes } from 'node:crypto'

const SESSION_TTL_MS = 60 * 60 * 1000
const PENDING_TTL_MS = 15 * 60 * 1000

/** @type {Map<string, { id: string, userId: string | null, holderKey: string, history: any[], updatedAt: number }>} */
const sessions = new Map()

/** @type {Map<string, any>} */
const pendingPayments = new Map()

function createId(prefix) {
  return `${prefix}_${randomBytes(8).toString('hex')}`
}

function purgeExpired() {
  const now = Date.now()
  for (const [id, session] of sessions) {
    if (now - session.updatedAt > SESSION_TTL_MS) sessions.delete(id)
  }
  for (const [id, pending] of pendingPayments) {
    if (pending.expiresAt <= now) pendingPayments.delete(id)
  }
}

export function getOrCreateChatSession({
  sessionId,
  userId,
  holderKey,
} = {}) {
  purgeExpired()
  const existing = sessionId ? sessions.get(String(sessionId)) : null
  if (existing) {
    if (userId) existing.userId = userId
    if (holderKey) existing.holderKey = holderKey
    existing.updatedAt = Date.now()
    return existing
  }

  const session = {
    id: createId('chat'),
    userId: userId || null,
    holderKey:
      String(holderKey || '').trim() ||
      `chat_${randomBytes(12).toString('hex')}`,
    history: [],
    provider: null,
    updatedAt: Date.now(),
  }
  sessions.set(session.id, session)
  return session
}

export function saveChatHistory(sessionId, history) {
  const session = sessions.get(String(sessionId))
  if (!session) return
  session.history = history
  session.updatedAt = Date.now()
}

export function createPendingPayment(data) {
  purgeExpired()
  const id = createId('pay')
  const pending = {
    id,
    ...data,
    expiresAt: Date.now() + PENDING_TTL_MS,
    createdAt: Date.now(),
  }
  pendingPayments.set(id, pending)
  return pending
}

export function getPendingPayment(pendingId) {
  purgeExpired()
  return pendingPayments.get(String(pendingId)) || null
}

export function consumePendingPayment(pendingId) {
  const pending = getPendingPayment(pendingId)
  if (!pending) return null
  pendingPayments.delete(String(pendingId))
  return pending
}
