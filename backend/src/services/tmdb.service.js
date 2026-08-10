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

  const response = await fetch(url)
  if (!response.ok) {
    const err = new Error(`Falha na TMDb (${response.status}).`)
    err.status = 502
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
  return {
    ...mapMovie(data),
    genre: genres || 'Cinema',
    runtime,
  }
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
