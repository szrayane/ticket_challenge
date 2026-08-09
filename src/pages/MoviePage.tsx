import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMovieShowtimes, getMovies } from '../api/cinema'
import { fetchMovieCast, type MovieCastMember } from '../api/localCatalog'
import { Icon } from '../components/Icon'
import { TrailerModal } from '../components/TrailerModal'
import type { Movie, Session } from '../types'

function parseSessionAt(session: Session) {
  const dateMatch = String(session.date || '').match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!dateMatch) return null
  const [, day, month, year] = dateMatch
  const [h = '0', m = '0'] = String(session.time || '00:00').split(':')
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(h) || 0,
    Number(m) || 0,
    0,
    0,
  )
}

function formatCountdown(ms: number) {
  if (ms <= 0) return 'agora'
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  if (days > 0) return `${days}d ${hours}h ${mins}m`
  if (hours > 0) return `${hours}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
  return `${mins}m ${String(secs).padStart(2, '0')}s`
}

export function MoviePage() {
  const { movieId = '' } = useParams()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [cast, setCast] = useState<MovieCastMember[]>([])
  const [similar, setSimilar] = useState<Movie[]>([])
  const [castLoading, setCastLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trailerOpen, setTrailerOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let active = true

    async function load() {
      if (!movieId) return
      try {
        setLoading(true)
        setError(null)
        setCast([])
        setSimilar([])
        const data = await getMovieShowtimes(movieId)
        if (!active) return
        setMovie(data.movie)
        setSessions(data.sessions)

        setCastLoading(true)
        try {
          const [castData, catalog] = await Promise.all([
            fetchMovieCast({
              title: data.movie.title,
              tmdbId: data.movie.tmdbId,
              limit: 12,
            }),
            getMovies().catch(() => [] as Movie[]),
          ])
          if (!active) return
          setCast(castData.cast)
          const genreKey = (data.movie.genre || '').split(/[/,]/)[0]?.trim().toLowerCase()
          setSimilar(
            catalog
              .filter((item) => item.id !== data.movie.id)
              .filter((item) =>
                genreKey
                  ? item.genre.toLowerCase().includes(genreKey)
                  : true,
              )
              .slice(0, 6),
          )
        } catch {
          if (active) setCast([])
        } finally {
          if (active) setCastLoading(false)
        }
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

  const nextSession = useMemo(() => {
    const upcoming = sessions
      .map((session) => ({ session, at: parseSessionAt(session) }))
      .filter((item) => item.at && item.at.getTime() > now)
      .sort((a, b) => (a.at!.getTime() - b.at!.getTime()))
    return upcoming[0] || null
  }, [sessions, now])

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
            {nextSession && (
              <div className="inline-flex flex-wrap items-center gap-3 rounded-xl border border-neon/30 bg-neon/10 px-4 py-3">
                <Icon name="timer" className="text-neon" />
                <div>
                  <p className="text-caption uppercase tracking-wider text-on-surface-variant">
                    Próxima sessão
                  </p>
                  <p className="text-label-md text-on-surface">
                    {nextSession.session.dateLabel} · {nextSession.session.time} ·{' '}
                    <span className="text-neon">
                      {formatCountdown(nextSession.at!.getTime() - now)}
                    </span>
                  </p>
                </div>
              </div>
            )}
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

      {(castLoading || cast.length > 0) && (
        <section className="mx-auto w-full max-w-[1440px] px-5 py-section-gap md:px-container-margin">
          <h2 className="mb-6 text-headline-md text-on-surface">Elenco</h2>
          {castLoading ? (
            <p className="text-body-md text-on-surface-variant">
              Carregando elenco…
            </p>
          ) : (
            <ul className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {cast.map((person) => (
                <li
                  key={person.id}
                  className="w-28 shrink-0 space-y-2 text-center"
                >
                  <div className="mx-auto aspect-square w-24 overflow-hidden rounded-full bg-surface-container">
                    {person.photo ? (
                      <img
                        src={person.photo}
                        alt={person.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                        <Icon name="person" className="text-[32px]" />
                      </div>
                    )}
                  </div>
                  <p className="truncate text-label-md text-on-surface">
                    {person.name}
                  </p>
                  {person.character && (
                    <p className="line-clamp-2 text-caption text-on-surface-variant">
                      {person.character}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

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

      {similar.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-5 py-section-gap md:px-container-margin">
          <h2 className="mb-6 text-headline-md text-on-surface">Mais como este</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {similar.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/filme/${item.id}`}
                  className="group block space-y-2"
                >
                  <div className="aspect-[2/3] overflow-hidden rounded-lg bg-surface-container">
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <p className="truncate text-label-md text-on-surface group-hover:text-primary">
                    {item.title}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

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
