const APP_API_URL = (import.meta.env.VITE_APP_API_URL || '/api').replace(
  /\/$/,
  '',
)

const TOKEN_KEY = 'cineray.auth.token'

export class AppApiError extends Error {
  status: number
  ticket?: unknown
  code?: string

  constructor(message: string, status: number, ticket?: unknown, code?: string) {
    super(message)
    this.name = 'AppApiError'
    this.status = status
    this.ticket = ticket
    this.code = code
  }
}

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore quota / private mode
  }
}

export async function appRequest<T>(
  path: string,
  init?: RequestInit & { auth?: boolean },
): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (init?.auth !== false) {
    const token = getAuthToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response
  try {
    response = await fetch(`${APP_API_URL}${path}`, {
      ...init,
      headers,
    })
  } catch {
    throw new AppApiError(
      'Não foi possível conectar à API. Confira se o backend está rodando (porta 3333).',
      0,
    )
  }

  if (!response.ok) {
    let message = `API error: ${response.status}`
    let ticket: unknown
    let code: string | undefined
    try {
      const data = (await response.json()) as {
        message?: string
        ticket?: unknown
        code?: string
      }
      if (data.message) message = data.message
      if (data.ticket) ticket = data.ticket
      if (data.code) code = data.code
    } catch {
      // ignore
    }
    throw new AppApiError(message, response.status, ticket, code)
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}
