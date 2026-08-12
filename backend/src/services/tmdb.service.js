const TMDB_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'

function apiKey() {
  return String(process.env.TMDB_API_KEY || '').trim()
}

function mapMovie(item) {
  const posterPath = item.poster_path
  const backdropPath = item.backdrop_path
  return {
    tmdbId: item.id,
    title: item.title || item.name || 'Sem título',
    synopsis: item.overview || '',
    rating: Number(item.vote_average) || 0,
    releaseDate: item.release_date || '',
    poster: posterPath ? `${IMAGE_BASE}/w500${posterPath}` : '',
    backdrop: backdropPath ? `${IMAGE_BASE}/w1280${backdropPath}` : '',
    genre: Array.isArray(item.genre_ids) ? 'Cinema' : 'Cinema',
  }
}

function networkErrorMessage(cause) {
  const code = String(cause?.cause?.code || cause?.code || '')
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return 'Não foi possível alcançar a TMDb (DNS). Confira a internet e se a API tem saída para a web.'
  }
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT') {
    return 'Timeout ao conectar na TMDb. Tente de novo em instantes.'
  }
  return 'Falha de rede ao consultar a TMDb. Tente de novo.'
}

async function tmdbFetch(path, query = {}) {
  const key = apiKey()
  if (!key) {
    const err = new Error(
      'TMDB_API_KEY não configurada. Crie uma chave grátis em themoviedb.org e coloque no .env do backend.',
    )
    err.status = 503
    throw err
  }

  const url = new URL(`${TMDB_BASE}${path}`)
  url.searchParams.set('api_key', key)
  url.searchParams.set('language', 'pt-BR')
  for (const [k, v] of Object.entries(query)) {
    if (v != null && v !== '') url.searchParams.set(k, String(v))
  }

  let response
  try {
    response = await fetch(url)
  } catch (cause) {
    const err = new Error(networkErrorMessage(cause))
    err.status = 502
    err.cause = cause
    throw err
  }

  if (!response.ok) {
    let detail = ''
    try {
      const body = await response.json()
      detail = String(body?.status_message || '').trim()
    } catch {
    }

    const message =
      response.status === 401
        ? 'TMDB_API_KEY inválida. Confira a chave no .env do backend (ou nos secrets do Fly).'
        : detail
          ? `Falha na TMDb (${response.status}): ${detail}`
          : `Falha na TMDb (${response.status}).`

    const err = new Error(message)
    err.status = response.status === 401 ? 503 : 502
    throw err
  }
  return response.json()
}

export async function searchTmdbMovies(query, { page = 1 } = {}) {
  const q = String(query || '').trim()
  if (!q) {
    const data = await tmdbFetch('/movie/popular', { page })
    return {
      results: (data.results || []).map(mapMovie),
      page: data.page,
      totalPages: data.total_pages,
    }
  }

  const data = await tmdbFetch('/search/movie', { query: q, page })
  return {
    results: (data.results || []).map(mapMovie),
    page: data.page,
    totalPages: data.total_pages,
  }
}

export async function getTmdbMovie(tmdbId) {
  const data = await tmdbFetch(`/movie/${encodeURIComponent(tmdbId)}`)
  const genres = Array.isArray(data.genres)
    ? data.genres.map((g) => g.name).join(', ')
    : 'Cinema'
  const runtime = data.runtime ? `${data.runtime} min` : ''
  const trailerUrl = await getTmdbTrailerUrl(tmdbId)
  return {
    ...mapMovie(data),
    genre: genres || 'Cinema',
    runtime,
    trailerUrl,
  }
}

function pickYoutubeTrailer(results) {
  const yt = (Array.isArray(results) ? results : []).filter(
    (video) =>
      String(video?.site || '') === 'YouTube' && String(video?.key || '').trim(),
  )
  if (!yt.length) return ''

  const byType = (type, officialOnly) =>
    yt.find(
      (video) =>
        String(video.type || '') === type &&
        (!officialOnly || Boolean(video.official)),
    )

  const hit =
    byType('Trailer', true) ||
    byType('Trailer', false) ||
    byType('Teaser', true) ||
    byType('Teaser', false) ||
    yt[0]

  return hit?.key ? `https://www.youtube.com/watch?v=${hit.key}` : ''
}

export async function getTmdbTrailerUrl(tmdbId) {
  const id = Number(tmdbId)
  if (!Number.isFinite(id) || id <= 0) return ''

  const key = apiKey()
  if (!key) return ''

  const fetchVideos = async (language) => {
    const url = new URL(`${TMDB_BASE}/movie/${encodeURIComponent(id)}/videos`)
    url.searchParams.set('api_key', key)
    if (language) url.searchParams.set('language', language)
    try {
      const response = await fetch(url)
      if (!response.ok) return []
      const data = await response.json()
      return Array.isArray(data.results) ? data.results : []
    } catch {
      return []
    }
  }

  for (const language of ['pt-BR', 'en-US', '']) {
    const trailer = pickYoutubeTrailer(await fetchVideos(language))
    if (trailer) return trailer
  }
  return ''
}

function mapCastMember(person) {
  const profilePath = person.profile_path
  return {
    id: person.id,
    name: person.name || 'Desconhecido',
    character: person.character || '',
    photo: profilePath ? `${IMAGE_BASE}/w185${profilePath}` : '',
    order: Number(person.order) || 0,
  }
}

async function resolveTmdbId({ tmdbId, title } = {}) {
  const id = Number(tmdbId)
  if (Number.isFinite(id) && id > 0) return id

  const q = String(title || '').trim()
  if (!q) return null

  const data = await tmdbFetch('/search/movie', { query: q, page: 1 })
  const first = Array.isArray(data.results) ? data.results[0] : null
  return first?.id ? Number(first.id) : null
}

export async function getTmdbCast({ tmdbId, title, limit = 12 } = {}) {
  const resolvedId = await resolveTmdbId({ tmdbId, title })
  if (!resolvedId) {
    return { tmdbId: null, cast: [] }
  }

  const data = await tmdbFetch(`/movie/${encodeURIComponent(resolvedId)}/credits`)
  const cast = (Array.isArray(data.cast) ? data.cast : [])
    .slice()
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .slice(0, Math.max(1, Math.min(Number(limit) || 12, 24)))
    .map(mapCastMember)

  return { tmdbId: resolvedId, cast }
}
