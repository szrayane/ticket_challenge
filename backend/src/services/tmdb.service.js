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
