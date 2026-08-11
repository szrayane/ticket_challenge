const APP_API_URL = (import.meta.env.VITE_APP_API_URL || '/api').replace(
  /\/$/,
  '',
)

const TOKEN_KEY = 'cineray.auth.token'
const RETRY_STATUSES = new Set([502, 503, 504])

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
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function connectionErrorMessage() {
  if (/onrender\.com/i.test(APP_API_URL)) {
    return 'API acordando no Render (plano free). Espere ~30s e tente de novo.'
  }
  return 'Não foi possível conectar à API. Confira se o backend está rodando (porta 3333).'
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

  const method = String(init?.method || 'GET').toUpperCase()
  const canRetry = method === 'GET' || method === 'HEAD'
  const maxAttempts = canRetry ? 3 : 1

  let response: Response | null = null
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      response = await fetch(`${APP_API_URL}${path}`, {
        ...init,
        headers,
      })
    } catch {
      if (attempt < maxAttempts) {
        await sleep(800 * attempt)
        continue
      }
      throw new AppApiError(connectionErrorMessage(), 0)
    }

    // Retries só no cold start do Render; 502/503 locais (ex.: TMDb) devem falhar rápido.
    if (
      RETRY_STATUSES.has(response.status) &&
      attempt < maxAttempts &&
      /onrender\.com/i.test(APP_API_URL)
    ) {
      await sleep(1000 * attempt)
      continue
    }
    break
  }

  if (!response) {
    throw new AppApiError(connectionErrorMessage(), 0)
  }

  if (!response.ok) {
    let message =
      RETRY_STATUSES.has(response.status) && /onrender\.com/i.test(APP_API_URL)
        ? 'API temporariamente indisponível (Render). Atualize em alguns segundos.'
        : `API error: ${response.status}`
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
    }
    throw new AppApiError(message, response.status, ticket, code)
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}
