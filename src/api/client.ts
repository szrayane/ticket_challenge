const BASE_URL =
  import.meta.env.VITE_CINEMA_API_URL ??
  'https://mock-api.driven.com.br/api/v8/cineflex'

export class CinemaApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'CinemaApiError'
    this.status = status
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { headers: initHeaders, ...rest } = init ?? {}
  const headers = new Headers(initHeaders)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  if (rest.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers,
  })

  if (!response.ok) {
    throw new CinemaApiError(
      `Cinema API request failed: ${response.status} ${response.statusText}`,
      response.status,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  if (!text) return undefined as T

  try {
    return JSON.parse(text) as T
  } catch {
    // Algumas rotas da Cineflex (ex.: book-many) respondem texto puro ("OK!").
    return undefined as T
  }
}
