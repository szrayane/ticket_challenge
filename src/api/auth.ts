import { appRequest, setAuthToken } from './appClient'
import type { CustomerTicket, CustomerUser } from '../types'

type AuthResponse = {
  user: CustomerUser
  token: string
}

export async function registerAccount(input: {
  name: string
  email: string
  password: string
}) {
  const data = await appRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(input),
  })
  setAuthToken(data.token)
  return data.user
}

export async function registerStaffAccount(input: {
  name: string
  email: string
  password: string
  role: 'organizador' | 'portaria'
  inviteCode: string
}) {
  const data = await appRequest<AuthResponse>('/auth/staff/register', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(input),
  })
  setAuthToken(data.token)
  return data.user
}

export async function loginAccount(input: { email: string; password: string }) {
  const data = await appRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(input),
  })
  setAuthToken(data.token)
  return data.user
}

export async function fetchMe() {
  const data = await appRequest<{ user: CustomerUser }>('/auth/me')
  return data.user
}

export async function logoutAccount() {
  try {
    await appRequest<void>('/auth/logout', { method: 'POST' })
  } finally {
    setAuthToken(null)
  }
}

export async function patchProfile(
  patch: Partial<Pick<CustomerUser, 'name' | 'cpf'>>,
) {
  const data = await appRequest<{ user: CustomerUser }>('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return data.user
}

export async function changePassword(input: {
  currentPassword: string
  newPassword: string
}) {
  await appRequest<{ ok: boolean }>('/auth/password', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function fetchMyTickets() {
  const data = await appRequest<{ tickets: CustomerTicket[] }>('/tickets')
  return data.tickets
}

export async function saveMyTickets(
  tickets: CustomerTicket[],
  holderKey?: string,
) {
  const data = await appRequest<{ tickets: CustomerTicket[] }>('/tickets', {
    method: 'POST',
    body: JSON.stringify({ tickets, holderKey }),
    headers: holderKey ? { 'X-Hold-Key': holderKey } : undefined,
  })
  return data.tickets
}

export async function cancelMyTicket(ticketId: string) {
  const data = await appRequest<{ ticket: CustomerTicket }>(
    `/tickets/${encodeURIComponent(ticketId)}/cancel`,
    { method: 'POST' },
  )
  return data.ticket
}

export async function fetchOccupiedSeatIds(
  sessionId: string,
  holderKey?: string,
) {
  const key = holderKey ? `?holderKey=${encodeURIComponent(holderKey)}` : ''
  const data = await appRequest<{ sessionId: string; seatIds: string[] }>(
    `/seats/occupied/${encodeURIComponent(sessionId)}${key}`,
    { auth: false },
  )
  return data.seatIds
}

export async function holdSeat(input: {
  sessionId: string
  seatId: string
  holderKey: string
}) {
  return appRequest<{ sessionId: string; seatId: string; expiresAt: string }>(
    '/seats/hold',
    {
      method: 'POST',
      auth: false,
      body: JSON.stringify(input),
      headers: { 'X-Hold-Key': input.holderKey },
    },
  )
}

export async function releaseSeatHold(input: {
  sessionId: string
  seatId: string
  holderKey: string
}) {
  return appRequest<{ released: boolean }>('/seats/release', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(input),
    headers: { 'X-Hold-Key': input.holderKey },
  })
}

export async function refreshSeatHolds(input: {
  sessionId: string
  seatIds: string[]
  holderKey: string
}) {
  return appRequest<{ renewed: number; expiresAt: string }>('/seats/refresh', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(input),
    headers: { 'X-Hold-Key': input.holderKey },
  })
}

export async function checkSeatsAvailable(
  sessionId: string,
  seatIds: string[],
  holderKey?: string,
) {
  await appRequest<{ available: boolean }>('/seats/check', {
    method: 'POST',
    body: JSON.stringify({ sessionId, seatIds, holderKey }),
    headers: holderKey ? { 'X-Hold-Key': holderKey } : undefined,
  })
}
