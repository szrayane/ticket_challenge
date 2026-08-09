import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMovieShowtimes } from '../api/cinema'
import { Icon } from '../components/Icon'
import { TrailerModal } from '../components/TrailerModal'
import type { Movie, Session } from '../types'

export function MoviePage() {
  const { movieId = '' } = useParams()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trailerOpen, setTrailerOpen] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      if (!movieId) return
      try {
        setLoading(true)
        setError(null)
        const data = await getMovieShowtimes(movieId)
        if (!active) return
        setMovie(data.movie)
        setSessions(data.sessions)
      } catch {
        if (active) setError('Não foi possível carregar este filme.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [movieId])

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>()
    for (const session of sessions) {
      const list = map.get(session.dateLabel) ?? []
      list.push(session)
      map.set(session.dateLabel, list)
    }
    return [...map.entries()]
  }, [sessions])

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-[1440px] items-center justify-center px-5">
        <p className="text-body-lg text-on-surface-variant">Carregando filme…</p>
      </main>
    )
  }

  if (error || !movie) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-[1440px] flex-col items-center justify-center gap-4 px-5">
        <p className="text-body-lg text-primary">{error ?? 'Filme não encontrado.'}</p>
        <Link to="/" className="text-label-md text-on-surface-variant underline">
          Voltar aos filmes
        </Link>
      </main>
    )
  }

  const hero = movie.hero ?? movie.backdrop ?? movie.poster

  return (
    <main>
      <section className="relative flex min-h-[520px] w-full items-end pb-12 pt-28">
        <div className="absolute inset-0 z-0 overflow-hidden bg-background">
          <img
            src={hero}
            alt=""
            className="h-full w-full object-cover object-[center_20%] opacity-80"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/80 via-background/30 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-5 md:flex-row md:items-end md:px-container-margin">
          <img
            src={movie.poster}
            alt={movie.title}
            className="hidden h-72 w-48 rounded-xl object-cover shadow-2xl md:block"
          />
          <div className="max-w-2xl space-y-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-label-md text-primary"
            >
              <Icon name="arrow_back" className="text-[18px]" />
              Filmes
            </Link>
            {movie.badge && (
              <span className="inline-flex rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-caption text-primary">
                {movie.badge}
              </span>
            )}
            <h1 className="text-headline-lg-mobile text-on-background md:text-headline-lg">
              {movie.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-body-md text-on-surface-variant">
              <span>{movie.genre}</span>
              <span className="h-1 w-1 rounded-full bg-surface-variant" />
              <span>{movie.runtime}</span>
              <span className="h-1 w-1 rounded-full bg-surface-variant" />
              <span className="inline-flex items-center text-primary">
                <Icon name="star" className="mr-1 text-[16px]" filled />
                {movie.rating.toFixed(1)}
              </span>
              {movie.format && (
                <>
                  <span className="h-1 w-1 rounded-full bg-surface-variant" />
                  <span>{movie.format}</span>
                </>
              )}
            </div>
            <p className="text-body-lg text-on-surface-variant">{movie.synopsis}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to={`/seats/${movie.id}`}
                className="rounded-lg bg-neon px-8 py-4 text-label-md text-white uppercase transition-all hover:brightness-110"
              >
                Escolher assentos
              </Link>
              {movie.trailerUrl && (
                <button
                  type="button"
                  onClick={() => setTrailerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-8 py-4 text-label-md text-on-surface uppercase transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Icon name="play_circle" />
                  Trailer
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-5 py-section-gap md:px-container-margin">
        <h2 className="mb-6 text-headline-md text-on-surface">Sessões</h2>
        {sessionsByDate.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">
            Nenhuma sessão disponível no momento.
          </p>
        ) : (
          <div className="space-y-8">
            {sessionsByDate.map(([dateLabel, daySessions]) => (
              <div key={dateLabel} className="space-y-3">
                <h3 className="text-label-md text-on-surface-variant uppercase tracking-wider">
                  {dateLabel}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {daySessions.map((session) => (
                    <Link
                      key={session.id}
                      to={`/seats/${movie.id}?session=${encodeURIComponent(session.id)}`}
                      className="rounded-lg border border-white/15 bg-surface-container px-5 py-3 text-label-md text-on-surface transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      {session.time}
                      <span className="ml-2 text-caption text-on-surface-variant">
                        {session.room}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {trailerOpen && movie.trailerUrl && (
        <TrailerModal
          title={movie.title}
          trailerUrl={movie.trailerUrl}
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </main>
  )
}
