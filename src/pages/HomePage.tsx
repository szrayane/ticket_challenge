import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getMovies } from '../api/cinema'
import { MovieCard } from '../components/MovieCard'
import { Icon } from '../components/Icon'
import { TrailerModal } from '../components/TrailerModal'
import { formatMoney } from '../lib/money'
import type { Movie } from '../types'

const FEATURED_COUNT = 3
const FEATURED_ROTATE_MS = 4000

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('search')?.toLowerCase().trim() || ''
  const genreFilter = searchParams.get('genre') || ''
  const maxPriceFilter = searchParams.get('maxPrice') || ''
  const onlyEvents = searchParams.get('events') === '1'

  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [trailerOpen, setTrailerOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const data = await getMovies()
        if (active) setMovies(data)
      } catch {
        if (active) setError('Não foi possível carregar os filmes da API.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const genres = useMemo(() => {
    const set = new Set<string>()
    for (const movie of movies) {
      String(movie.genre || '')
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean)
        .forEach((g) => set.add(g))
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [movies])

  const filteredMovies = movies.filter((movie) => {
    if (searchQuery) {
      const hit =
        movie.title.toLowerCase().includes(searchQuery) ||
        movie.synopsis?.toLowerCase().includes(searchQuery)
      if (!hit) return false
    }
    if (genreFilter) {
      const parts = String(movie.genre || '')
        .split(',')
        .map((g) => g.trim().toLowerCase())
      if (!parts.includes(genreFilter.toLowerCase())) return false
    }
    if (onlyEvents && !movie.nextSession) return false
    if (maxPriceFilter) {
      const max = Number(maxPriceFilter)
      if (!Number.isFinite(max)) return true
      const price = movie.nextSession?.price
      if (price == null || price > max) return false
    }
    return true
  })

  const hasExtraFilters = Boolean(genreFilter || maxPriceFilter || onlyEvents)
  const featured = movies.slice(0, FEATURED_COUNT)
  const activeFeatured = featured[featuredIndex] ?? featured[0]
  const displayMovies =
    searchQuery || hasExtraFilters
      ? filteredMovies
      : movies

  function patchFilters(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (!value) next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    if (featured.length <= 1 || searchQuery || hasExtraFilters || trailerOpen) {
      return
    }

    const timer = window.setInterval(() => {
      setFeaturedIndex((current) => (current + 1) % featured.length)
    }, FEATURED_ROTATE_MS)

    return () => window.clearInterval(timer)
  }, [featured.length, searchQuery, hasExtraFilters, trailerOpen])

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-[1440px] items-center justify-center px-5">
        <p className="text-body-lg text-on-surface-variant">Carregando filmes…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-[1440px] flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="text-body-lg text-primary">{error}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            setError(null)
            void getMovies()
              .then(setMovies)
              .catch(() => setError('Não foi possível carregar os filmes da API.'))
              .finally(() => setLoading(false))
          }}
          className="rounded-lg bg-primary px-6 py-3 text-label-md text-white"
        >
          Tentar de novo
        </button>
      </main>
    )
  }

  return (
    <main>
      {!searchQuery && !hasExtraFilters && activeFeatured && (
        <section className="relative flex min-h-[420px] h-[70vh] max-h-[760px] w-full items-end pt-24 pb-section-gap sm:min-h-[520px] sm:h-[85vh] sm:pt-32">
          <div className="absolute inset-0 z-0 overflow-hidden bg-background">
            {featured.map((movie, index) => {
              const src = movie.hero ?? movie.poster
              const visible = index === featuredIndex
              return (
                <img
                  key={movie.id}
                  alt={movie.title}
                  src={src}
                  fetchPriority={visible ? 'high' : 'low'}
                  decoding="async"
                  className={`absolute inset-0 h-full w-full object-cover object-[center_20%] transition-opacity duration-700 ${
                    visible ? 'opacity-80' : 'opacity-0'
                  }`}
                />
              )
            })}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/70 via-background/20 to-transparent" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 md:px-container-margin">
            <div
              key={activeFeatured.id}
              className="max-w-3xl animate-fade-up space-y-6"
            >
              <div className="mb-4 flex flex-wrap items-center gap-3">
                {activeFeatured.badge && (
                  <span className="rounded-full bg-secondary-container px-3 py-1 text-label-md tracking-wider text-on-primary uppercase">
                    {activeFeatured.badge}
                  </span>
                )}
                <span className="flex items-center text-label-md text-primary">
                  <Icon name="star" className="mr-1 text-[16px]" filled />
                  {activeFeatured.rating.toFixed(1)} Avaliação
                </span>
              </div>

              <h1 className="break-words text-headline-lg-mobile font-extrabold text-on-surface drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] [overflow-wrap:anywhere] md:text-display-lg">
                {activeFeatured.title}
                {activeFeatured.highlight ? (
                  <>
                    :
                    <br />
                    <span className="text-primary">{activeFeatured.highlight}</span>
                  </>
                ) : null}
              </h1>

              <p className="max-w-2xl text-body-lg text-on-surface-variant line-clamp-3">
                {activeFeatured.synopsis}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <button
                  type="button"
                  disabled={!activeFeatured.trailerUrl}
                  onClick={() => {
                    if (activeFeatured.trailerUrl) setTrailerOpen(true)
                  }}
                  className="flex items-center gap-2 rounded-lg bg-neon px-8 py-4 text-label-md text-white uppercase transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="play_arrow" className="text-headline-md" filled />
                  Ver trailer
                </button>
                <Link
                  to={`/filme/${activeFeatured.id}`}
                  className="glass-card rounded-lg border border-white/20 px-8 py-4 text-label-md text-on-surface uppercase transition-all duration-300 hover:bg-tertiary-container hover:text-on-tertiary-container"
                >
                  Ver filme
                </Link>
              </div>
            </div>

            {featured.length > 1 && (
              <div className="mt-8 flex items-center gap-2">
                {featured.map((movie, index) => (
                  <button
                    key={movie.id}
                    type="button"
                    aria-label={`Ver destaque: ${movie.title}`}
                    aria-current={index === featuredIndex}
                    onClick={() => setFeaturedIndex(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === featuredIndex
                        ? 'w-8 bg-primary-container'
                        : 'w-1.5 bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[1440px] px-5 py-section-gap md:px-container-margin">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="flex items-center gap-3 text-headline-lg-mobile text-on-surface md:text-headline-lg">
              <Icon
                name={searchQuery || hasExtraFilters ? 'search' : 'local_movies'}
                className="text-[32px] text-primary md:text-[40px]"
              />
              {searchQuery || hasExtraFilters ? 'Resultados filtrados' : 'Em cartaz'}
            </h2>
            <p className="mt-2 text-body-md text-on-surface-variant">
              {searchQuery || hasExtraFilters
                ? `Encontramos ${filteredMovies.length} título(s)`
                : `${movies.length} título(s) no catálogo.`}
            </p>
          </div>
        </div>

        <div className="mb-10 rounded-xl border border-white/8 bg-surface-container/60 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className="inline-flex items-center gap-2 text-label-md text-on-surface transition-colors hover:text-primary"
              aria-expanded={filtersOpen}
            >
              <Icon name="tune" className="text-[18px]" />
              Filtros
              {hasExtraFilters && (
                <span className="rounded-md bg-primary/20 px-2 py-0.5 text-caption text-primary-fixed">
                  ativos
                </span>
              )}
              <Icon
                name={filtersOpen ? 'expand_less' : 'expand_more'}
                className="text-[20px] text-on-surface-variant"
              />
            </button>

            <div className="flex flex-wrap items-center gap-3">
              {!filtersOpen && hasExtraFilters && (
                <p className="max-w-[220px] truncate text-caption text-on-surface-variant sm:max-w-none">
                  {[
                    genreFilter || null,
                    maxPriceFilter ? `até ${formatMoney(Number(maxPriceFilter))}` : null,
                    onlyEvents ? 'com sessão' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
              {hasExtraFilters && (
                <button
                  type="button"
                  onClick={() =>
                    patchFilters({ genre: null, maxPrice: null, events: null })
                  }
                  className="text-caption text-primary underline-offset-2 hover:underline"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out ${
              filtersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="overflow-hidden">
              <div
                className={`space-y-4 border-t border-white/8 px-4 py-4 transition-opacity duration-300 ease-out ${
                  filtersOpen ? 'opacity-100' : 'opacity-0'
                }`}
              >
              <div className="space-y-2">
                <p className="text-caption uppercase tracking-wider text-on-surface-variant">
                  Gênero
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => patchFilters({ genre: null })}
                    className={`filter-chip rounded-lg px-3 py-1.5 text-caption ${
                      !genreFilter ? 'is-active' : ''
                    }`}
                  >
                    Todos
                  </button>
                  {genres.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() =>
                        patchFilters({
                          genre: genreFilter === genre ? null : genre,
                        })
                      }
                      className={`filter-chip rounded-lg px-3 py-1.5 text-caption ${
                        genreFilter === genre ? 'is-active' : ''
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-caption uppercase tracking-wider text-on-surface-variant">
                  Preço máx.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['', 'Qualquer'],
                    ['25', formatMoney(25)],
                    ['32', formatMoney(32)],
                    ['40', formatMoney(40)],
                    ['50', formatMoney(50)],
                  ].map(([value, label]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        patchFilters({ maxPrice: value || null })
                      }
                      className={`filter-chip rounded-lg px-3 py-1.5 text-caption ${
                        maxPriceFilter === value ? 'is-active' : ''
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  patchFilters({ events: onlyEvents ? null : '1' })
                }
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/8 bg-surface-container-high/50 px-4 py-3 text-left transition-colors hover:border-white/15 sm:w-auto"
              >
                <span className="text-body-md text-on-surface">
                  Só com sessão publicada
                </span>
                <span
                  className={`toggle-track inline-flex items-center ${
                    onlyEvents ? 'is-on' : ''
                  }`}
                  aria-hidden
                >
                  <span className="toggle-thumb" />
                </span>
              </button>
              </div>
            </div>
          </div>
        </div>

        {displayMovies.length > 0 ? (
          <div
            id="catalog"
            key={`${genreFilter}|${maxPriceFilter}|${onlyEvents}|${searchQuery}`}
            className="grid grid-cols-1 gap-gutter sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          >
            {displayMovies.map((movie) => (
              <div
                key={movie.id}
                className="animate-fade-in"
              >
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center transition-opacity duration-300">
            <p className="text-body-lg text-on-surface-variant">
              Nenhum filme encontrado com os filtros atuais.
            </p>
          </div>
        )}
      </section>

      {trailerOpen && activeFeatured?.trailerUrl && (
        <TrailerModal
          title={activeFeatured.title}
          trailerUrl={activeFeatured.trailerUrl}
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </main>
  )
}
