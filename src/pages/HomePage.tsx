import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getMovies } from '../api/cinema'
import { MovieCard } from '../components/MovieCard'
import { Icon } from '../components/Icon'
import { TrailerModal } from '../components/TrailerModal'
import type { Movie } from '../types'

const FEATURED_COUNT = 3
const FEATURED_ROTATE_MS = 4000

export function HomePage() {
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('search')?.toLowerCase().trim() || ''

  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [trailerOpen, setTrailerOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)

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

  const filteredMovies = movies.filter((movie) => {
    if (!searchQuery) return true
    return (
      movie.title.toLowerCase().includes(searchQuery) ||
      movie.synopsis?.toLowerCase().includes(searchQuery)
    )
  })

  const featured = movies.slice(0, FEATURED_COUNT)
  const trending = movies.slice(FEATURED_COUNT)
  const activeFeatured = featured[featuredIndex] ?? featured[0]
  const displayMovies = searchQuery
    ? filteredMovies
    : showAll
      ? movies
      : trending

  useEffect(() => {
    // Busca limpa o modo "ver todos"
    if (searchQuery) setShowAll(false)
  }, [searchQuery])

  useEffect(() => {
    if (featured.length <= 1 || searchQuery || trailerOpen) return

    const timer = window.setInterval(() => {
      setFeaturedIndex((current) => (current + 1) % featured.length)
    }, FEATURED_ROTATE_MS)

    return () => window.clearInterval(timer)
  }, [featured.length, searchQuery, trailerOpen])

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-[1440px] items-center justify-center px-5">
        <p className="text-body-lg text-on-surface-variant">Carregando filmes…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-[1440px] items-center justify-center px-5">
        <p className="text-body-lg text-primary">{error}</p>
      </main>
    )
  }

  return (
    <main>
      {!searchQuery && activeFeatured && (
        <section className="relative flex min-h-[600px] h-[85vh] w-full items-end pt-32 pb-section-gap">
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

              <h1 className="text-headline-lg-mobile font-extrabold text-on-surface drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] md:text-display-lg">
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
                  className="glow-hover flex items-center gap-2 rounded-full bg-neon px-8 py-4 text-label-md text-white uppercase transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="play_arrow" className="text-headline-md" filled />
                  Ver trailer
                </button>
                <Link
                  to={`/filme/${activeFeatured.id}`}
                  className="glass-card rounded-full border border-white/20 px-8 py-4 text-label-md text-on-surface uppercase transition-all duration-300 hover:bg-tertiary-container hover:text-on-tertiary-container"
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
                        ? 'w-8 bg-primary-container shadow-[0_0_10px_rgba(255,76,135,0.5)]'
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
        <div className="mb-12 flex items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-3 text-headline-lg-mobile text-on-surface md:text-headline-lg">
              <Icon
                name={searchQuery ? 'search' : showAll ? 'movie' : 'trending_up'}
                className="text-[32px] text-primary md:text-[40px]"
              />
              {searchQuery
                ? `Resultados para "${searchQuery}"`
                : showAll
                  ? 'Todos os filmes'
                  : 'Em alta'}
            </h2>
            <p className="mt-2 text-body-md text-on-surface-variant">
              {searchQuery
                ? `Encontramos ${filteredMovies.length} filme(s)`
                : showAll
                  ? `${movies.length} títulos em cartaz neste momento.`
                  : 'Os filmes mais assistidos desta semana.'}
            </p>
          </div>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => {
                const next = !showAll
                setShowAll(next)
                if (next) {
                  requestAnimationFrame(() => {
                    document
                      .getElementById('catalog')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  })
                }
              }}
              className="group flex items-center gap-1 text-label-md text-primary uppercase transition-colors hover:text-secondary"
            >
              {showAll ? 'Ver em alta' : 'Ver todos'}
              <Icon
                name={showAll ? 'arrow_upward' : 'arrow_forward'}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>
          )}
        </div>

        {displayMovies.length > 0 ? (
          <div
            id="catalog"
            className="grid grid-cols-1 gap-gutter sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          >
            {displayMovies.map((movie, index) => (
              <div
                key={movie.id}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-body-lg text-on-surface-variant">
              Nenhum filme encontrado com o termo informado.
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
