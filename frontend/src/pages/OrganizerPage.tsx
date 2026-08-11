import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  POSTER_GALLERY,
  createEventFromTmdb,
  createMovie,
  createShowtime,
  deleteMovie,
  deleteShowtime,
  duplicateShowtime,
  fetchAdminMovies,
  fetchMovieShowtimes,
  fetchShowtimeSeats,
  fetchOrganizerReport,
  fetchShowtimeOccupancy,
  searchTmdbCatalog,
  setMovieActive,
  toBrDate,
  toIsoDate,
  updateMovie,
  updateShowtime,
  type MovieInput,
  type OrganizerReport,
  type ShowtimeOccupancy,
} from '../api/catalog'
import { AppApiError } from '../api/appClient'
import { Icon } from '../components/Icon'
import { RequireRole } from '../components/RequireRole'
import { RoomPicker } from '../components/RoomPicker'
import { useAuth } from '../context/AuthContext'
import { CINEMA_NAME, normalizeCinemaRoom } from '../lib/cinemaRooms'
import { connectRealtime } from '../lib/realtime'
import type { Movie, Session } from '../types'

type SeatMapSeat = {
  id: string
  name: string
  isAvailable: boolean
  row: string
  number: number
  ticketType: 'basic' | 'premium' | 'vip'
}

type SeatMapView = {
  sessionId: string
  movieTitle: string
  room: string
  time: string
  date: string
  sold: number
  available: number
  totalSeats: number
  occupancyPct: number
  seats: SeatMapSeat[]
}

function groupSeatMapByRow(seats: SeatMapSeat[]) {
  const rows = new Map<string, SeatMapSeat[]>()
  for (const seat of seats) {
    const list = rows.get(seat.row) ?? []
    list.push(seat)
    rows.set(seat.row, list)
  }
  return Array.from(rows.entries()).map(([row, rowSeats]) => ({
    row,
    seats: [...rowSeats].sort((a, b) => a.number - b.number),
  }))
}

type TabId = 'dashboard' | 'publicar' | 'filmes' | 'sessoes'

const emptyMovie: MovieInput = {
  title: '',
  synopsis: '',
  genre: 'Drama',
  rating: 8,
  runtime: '120 min',
  format: '2D',
  badge: 'Local',
  poster: '',
  trailerUrl: '',
}

function fieldError(form: MovieInput) {
  if (!form.title.trim()) return 'Informe o título do filme.'
  if (!form.poster.trim()) return 'Informe a URL do poster ou escolha da galeria.'
  const poster = normalizePosterUrl(form.poster)
  if (!/^https?:\/\//i.test(poster)) {
    return 'A URL do poster precisa começar com http:// ou https://.'
  }
  if (form.trailerUrl?.trim() && !/^https?:\/\//i.test(form.trailerUrl.trim())) {
    return 'A URL do trailer precisa começar com http:// ou https://.'
  }
  return null
}

function normalizePosterUrl(raw: string) {
  const value = String(raw || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('/')) {
    return `https://image.tmdb.org/t/p/w500${value}`
  }
  return value
}

function sessionSortKey(session: { date: string; time: string }) {
  const match = String(session.date || '').match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return `${session.date} ${session.time}`
  const [, day, month, year] = match
  return `${year}-${month}-${day}T${session.time || '00:00'}`
}

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function OrganizerDashboard() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<TabId>('dashboard')
  const [movies, setMovies] = useState<Movie[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [occupancy, setOccupancy] = useState<Record<string, ShowtimeOccupancy>>({})
  const [report, setReport] = useState<OrganizerReport | null>(null)
  const [reportLive, setReportLive] = useState(false)
  const [form, setForm] = useState<MovieInput>(emptyMovie)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [posterBroken, setPosterBroken] = useState(false)
  const [sessionDateIso, setSessionDateIso] = useState('')
  const [sessionTime, setSessionTime] = useState('20:00')
  const [room, setRoom] = useState<string>(normalizeCinemaRoom('Sala 1'))
  const [capacity, setCapacity] = useState('40')
  const [price, setPrice] = useState('32')
  const [cinema, setCinema] = useState(CINEMA_NAME)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [formHint, setFormHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tmdbQuery, setTmdbQuery] = useState('')
  const [tmdbResults, setTmdbResults] = useState<
    Array<{
      tmdbId: number
      title: string
      synopsis: string
      poster: string
      rating: number
      releaseDate: string
    }>
  >([])
  const [selectedTmdbId, setSelectedTmdbId] = useState<number | null>(null)
  const [tmdbLoading, setTmdbLoading] = useState(false)
  const [tmdbHint, setTmdbHint] = useState<string | null>(null)
  const [eventDateIso, setEventDateIso] = useState('')
  const [eventTime, setEventTime] = useState('20:00')
  const [eventRoom, setEventRoom] = useState<string>(normalizeCinemaRoom('Sala 1'))
  const [eventCapacity, setEventCapacity] = useState('40')
  const [eventPrice, setEventPrice] = useState('32')
  const [eventCinema, setEventCinema] = useState(CINEMA_NAME)
  const [seatMapView, setSeatMapView] = useState<SeatMapView | null>(null)
  const [seatMapLoading, setSeatMapLoading] = useState(false)
  const [seatMapError, setSeatMapError] = useState<string | null>(null)

  const selectedMovie = useMemo(
    () => movies.find((m) => m.id === selectedId) || null,
    [movies, selectedId],
  )

  const seatMapRows = useMemo(
    () => (seatMapView ? groupSeatMapByRow(seatMapView.seats) : []),
    [seatMapView],
  )

  async function openSeatMap(
    session: OrganizerReport['sessions'][number],
  ) {
    setSeatMapError(null)
    setSeatMapLoading(true)
    setSeatMapView({
      sessionId: session.id,
      movieTitle: session.movieTitle,
      room: String(session.room || '—'),
      time: session.time,
      date: session.date,
      sold: session.sold,
      available: session.available,
      totalSeats: session.totalSeats,
      occupancyPct: session.occupancyPct ?? 0,
      seats: [],
    })
    try {
      const data = await fetchShowtimeSeats(session.id)
      setSeatMapView((prev) =>
        prev && prev.sessionId === session.id
          ? { ...prev, seats: data.seats }
          : prev,
      )
    } catch (err) {
      setSeatMapError(
        err instanceof Error ? err.message : 'Falha ao carregar o mapa de assentos.',
      )
    } finally {
      setSeatMapLoading(false)
    }
  }

  function closeSeatMap() {
    setSeatMapView(null)
    setSeatMapError(null)
    setSeatMapLoading(false)
  }

  async function reloadMovies() {
    const list = await fetchAdminMovies()
    setMovies(list)
    return list
  }

  async function reloadSessions(movieId: string) {
    const data = await fetchMovieShowtimes(movieId)
    setSessions(data.sessions)
    const next: Record<string, ShowtimeOccupancy> = {}
    await Promise.all(
      data.sessions.map(async (session) => {
        try {
          next[session.id] = await fetchShowtimeOccupancy(session.id)
        } catch {
        }
      }),
    )
    setOccupancy(next)
  }

  async function reloadReport() {
    setReport(await fetchOrganizerReport())
  }

  useEffect(() => {
    void reloadMovies()
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Falha ao carregar filmes.'),
      )
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setSessions([])
      setOccupancy({})
      return
    }
    void reloadSessions(selectedId).catch(() => setSessions([]))
  }, [selectedId])

  useEffect(() => {
    if (tab !== 'dashboard') return
    let active = true

    async function refresh() {
      try {
        const data = await fetchOrganizerReport()
        if (active) setReport(data)
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Falha ao carregar relatório.',
          )
        }
      }
    }

    void refresh()
    const intervalId = window.setInterval(() => {
      void refresh()
    }, 5000)

    const client = connectRealtime()
    client.subscribe('organizer')
    const off = client.on((payload) => {
      if (payload.type === 'connected') setReportLive(true)
      if (payload.type === 'disconnected') setReportLive(false)
      if (payload.type === 'stats.changed') void refresh()
    })

    return () => {
      active = false
      window.clearInterval(intervalId)
      off()
      client.close()
      setReportLive(false)
    }
  }, [tab])

  useEffect(() => {
    if (!seatMapView) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSeatMap()
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [seatMapView?.sessionId])

  async function handleSaveMovie(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const hint = fieldError(form)
    setFormHint(hint)
    if (hint) return
    if (posterBroken) {
      setFormHint(
        'Poster não carregou. Escolha outro da galeria ou cole uma URL válida.',
      )
      return
    }

    try {
      const payload = {
        ...form,
        poster: normalizePosterUrl(form.poster),
        hero: normalizePosterUrl(form.hero || form.poster),
        backdrop: normalizePosterUrl(form.backdrop || form.poster),
      }
      if (editingId) {
        await updateMovie(editingId, payload)
        setSuccess('Filme atualizado.')
      } else {
        const movie = await createMovie(payload)
        setSuccess('Filme criado.')
        setSelectedId(movie.id)
      }
      setForm(emptyMovie)
      setEditingId(null)
      setFormHint(null)
      setPosterBroken(false)
      await reloadMovies()
    } catch (err) {
      setError(err instanceof AppApiError ? err.message : 'Não foi possível salvar.')
    }
  }

  async function handleToggleActive(movie: Movie) {
    const next = !(movie.isActive !== false)
    try {
      await setMovieActive(movie.id, next)
      await reloadMovies()
      setSuccess(next ? 'Filme ativado no catálogo.' : 'Filme desativado do catálogo.')
    } catch (err) {
      setError(err instanceof AppApiError ? err.message : 'Falha ao alterar status.')
    }
  }

  async function handleDeleteMovie(id: string) {
    if (
      !window.confirm(
        'Excluir este filme? Se houver ingressos ativos, a exclusão será bloqueada. Use Desativar.',
      )
    ) {
      return
    }
    try {
      await deleteMovie(id)
      if (selectedId === id) setSelectedId(null)
      if (editingId === id) {
        setEditingId(null)
        setForm(emptyMovie)
      }
      await reloadMovies()
      setSuccess('Filme removido.')
    } catch (err) {
      setError(err instanceof AppApiError ? err.message : 'Falha ao excluir.')
    }
  }

  async function handleSaveSession(e: FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    setError(null)
    if (!sessionDateIso) {
      setError('Escolha a data da sessão.')
      return
    }
    if (!/^\d{2}:\d{2}$/.test(sessionTime)) {
      setError('Horário inválido.')
      return
    }

    const payload = {
      sessionDate: toBrDate(sessionDateIso),
      sessionTime,
      room: normalizeCinemaRoom(room),
      cinema: cinema.trim() || CINEMA_NAME,
      capacity: Number(capacity) || 40,
      price: Number(price) || 28,
    }

    try {
      if (editingSessionId) {
        await updateShowtime(editingSessionId, payload)
        setSuccess('Sessão atualizada.')
      } else {
        await createShowtime(selectedId, payload)
        setSuccess('Sessão adicionada.')
      }
      setEditingSessionId(null)
      setSessionDateIso('')
      setSessionTime('20:00')
      setRoom(normalizeCinemaRoom('Sala 1'))
      await reloadSessions(selectedId)
      if (tab === 'dashboard') await reloadReport()
    } catch (err) {
      setError(err instanceof AppApiError ? err.message : 'Falha ao salvar sessão.')
    }
  }

  async function handleDuplicateSession(session: Session) {
    if (!selectedId) return
    try {
      await duplicateShowtime(session.id)
      await reloadSessions(selectedId)
      setSuccess('Sessão duplicada. Ajuste data/hora se precisar.')
    } catch (err) {
      setError(err instanceof AppApiError ? err.message : 'Falha ao duplicar.')
    }
  }

  async function handleDeleteSession(id: string) {
    if (!window.confirm('Remover esta sessão? Bloqueado se houver ingressos ativos.')) {
      return
    }
    try {
      await deleteShowtime(id)
      if (selectedId) await reloadSessions(selectedId)
      setSuccess('Sessão removida.')
    } catch (err) {
      setError(err instanceof AppApiError ? err.message : 'Falha ao remover sessão.')
    }
  }

  function startEdit(movie: Movie) {
    setTab('filmes')
    setEditingId(movie.id)
    setSelectedId(movie.id)
    setFormHint(null)
    setPosterBroken(false)
    setForm({
      title: movie.title,
      synopsis: movie.synopsis,
      genre: movie.genre,
      rating: movie.rating,
      runtime: movie.runtime,
      format: movie.format || '',
      badge: movie.badge || 'Local',
      poster: movie.poster,
      hero: movie.hero,
      backdrop: movie.backdrop,
      trailerUrl: movie.trailerUrl || '',
    })
    window.requestAnimationFrame(() => {
      document.getElementById('organizer-movie-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  function startEditSession(session: Session) {
    setEditingSessionId(session.id)
    setSessionDateIso(toIsoDate(session.date))
    setSessionTime(session.time)
    setRoom(normalizeCinemaRoom(session.room))
    setCinema(session.cinema || CINEMA_NAME)
    setCapacity(String(session.capacity || 40))
    setPrice(String(session.price || 28))
  }

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'dashboard', label: 'Visão geral' },
    { id: 'publicar', label: 'Publicar (TMDb)' },
    { id: 'filmes', label: 'Filmes' },
    { id: 'sessoes', label: 'Sessões' },
  ]

  useEffect(() => {
    if (tab !== 'publicar') return

    const q = tmdbQuery.trim()
    if (q.length < 2) {
      setTmdbResults([])
      setTmdbLoading(false)
      setTmdbHint(q.length === 0 ? null : 'Digite pelo menos 2 letras.')
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      setTmdbLoading(true)
      setTmdbHint(null)
      void searchTmdbCatalog(q)
        .then((data) => {
          if (cancelled) return
          setTmdbResults(data.results)
          setTmdbHint(
            data.results.length === 0
              ? 'Nenhum filme encontrado na TMDb.'
              : null,
          )
        })
        .catch((err) => {
          if (cancelled) return
          setTmdbResults([])
          setTmdbHint(
            err instanceof AppApiError
              ? err.message
              : 'Falha ao buscar na TMDb.',
          )
        })
        .finally(() => {
          if (!cancelled) setTmdbLoading(false)
        })
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [tab, tmdbQuery])

  const selectedTmdbTitle = useMemo(
    () => tmdbResults.find((item) => item.tmdbId === selectedTmdbId)?.title,
    [tmdbResults, selectedTmdbId],
  )

  async function handlePublishEvent(e: FormEvent) {
    e.preventDefault()
    if (!selectedTmdbId) {
      setError('Selecione um filme da TMDb.')
      return
    }
    if (!eventDateIso) {
      setError('Informe a data do evento.')
      return
    }
    setError(null)
    setSuccess(null)
    try {
      const result = await createEventFromTmdb({
        tmdbId: selectedTmdbId,
        sessionDate: toBrDate(eventDateIso),
        sessionTime: eventTime,
        cinema: eventCinema.trim() || CINEMA_NAME,
        room: normalizeCinemaRoom(eventRoom),
        capacity: Number(eventCapacity) || 40,
        price: Number(eventPrice) || 32,
      })
      setSuccess(`Evento publicado: ${result.movie.title}.`)
      setSelectedTmdbId(null)
      await reloadMovies()
      setSelectedId(result.movie.id)
      setTab('sessoes')
    } catch (err) {
      setError(err instanceof AppApiError ? err.message : 'Falha ao publicar evento.')
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] px-5 py-section-gap md:px-container-margin">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-caption uppercase tracking-wider text-on-surface-variant">
            Painel do organizador
          </p>
          <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
            Visão geral
          </h1>
          <p className="text-body-md text-on-surface-variant">
            {user?.name} · {user?.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-lg border border-white/15 px-5 py-2.5 text-label-md text-on-surface-variant"
          >
            Sair
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 rounded-full bg-white/5 p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-5 py-2.5 text-label-md transition-colors ${
              tab === item.id
                ? 'bg-primary text-white'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-body-md text-primary">
          {error}
        </p>
      )}
      {success && (
        <p className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-body-md text-emerald-300">
          {success}
        </p>
      )}

      {tab === 'publicar' && (
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="glass-card space-y-4 rounded-xl p-card-padding">
            <h2 className="text-headline-md text-on-surface">Catálogo TMDb</h2>
            <p className="text-body-md text-on-surface-variant">
              Digite o nome do filme. A lista atualiza sozinha; escolha um título
              e preencha data, local, capacidade e preço.
            </p>
            <div className="relative">
              <input
                className="glass-input w-full rounded-lg px-4 py-3 pr-12 text-body-md"
                placeholder="Ex.: Duna, Batman…"
                value={tmdbQuery}
                onChange={(e) => {
                  setTmdbQuery(e.target.value)
                  setSelectedTmdbId(null)
                }}
                autoComplete="off"
                aria-label="Buscar filme na TMDb"
              />
              {tmdbLoading && (
                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-caption text-on-surface-variant">
                  …
                </span>
              )}
            </div>
            {tmdbHint && (
              <p className="text-caption text-on-surface-variant">{tmdbHint}</p>
            )}
            <ul className="max-h-[420px] space-y-2 overflow-y-auto">
              {tmdbResults.map((item) => (
                <li key={item.tmdbId}>
                  <button
                    type="button"
                    onClick={() => setSelectedTmdbId(item.tmdbId)}
                    className={`flex w-full gap-3 rounded-xl border p-3 text-left ${
                      selectedTmdbId === item.tmdbId
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-white/10'
                    }`}
                  >
                    {item.poster ? (
                      <img src={item.poster} alt="" className="h-16 w-11 rounded object-cover" />
                    ) : (
                      <div className="h-16 w-11 rounded bg-white/10" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-body-md text-on-surface">{item.title}</p>
                      <p className="truncate text-caption text-on-surface-variant">
                        <span className="whitespace-nowrap">
                          {item.releaseDate || 's/d'} • ★ {item.rating.toFixed(1)}
                        </span>
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <form
            onSubmit={(e) => void handlePublishEvent(e)}
            className="glass-card space-y-4 rounded-xl p-card-padding"
          >
            <h2 className="text-headline-md text-on-surface">Dados do evento</h2>
            <p className="text-caption text-on-surface-variant">
              Selecionado:{' '}
              {selectedTmdbId
                ? selectedTmdbTitle || `TMDb #${selectedTmdbId}`
                : 'nenhum'}
            </p>
            <label className="block space-y-1">
              <span className="text-label-md text-on-surface-variant">Data *</span>
              <input
                type="date"
                required
                value={eventDateIso}
                onChange={(e) => setEventDateIso(e.target.value)}
                className="glass-input w-full rounded-lg px-3 py-2 text-body-md"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-label-md text-on-surface-variant">Horário *</span>
              <input
                type="time"
                required
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="glass-input w-full rounded-lg px-3 py-2 text-body-md"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-label-md text-on-surface-variant">Local / cinema</span>
              <input
                value={eventCinema}
                onChange={(e) => setEventCinema(e.target.value)}
                className="glass-input w-full rounded-lg px-3 py-2 text-body-md"
              />
            </label>
            <RoomPicker value={eventRoom} onChange={setEventRoom} />
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-label-md text-on-surface-variant">Capacidade</span>
                <input
                  type="number"
                  min={10}
                  max={200}
                  value={eventCapacity}
                  onChange={(e) => setEventCapacity(e.target.value)}
                  className="glass-input w-full rounded-lg px-3 py-2 text-body-md"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-label-md text-on-surface-variant">Preço (R$)</span>
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  value={eventPrice}
                  onChange={(e) => setEventPrice(e.target.value)}
                  className="glass-input w-full rounded-lg px-3 py-2 text-body-md"
                />
              </label>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-neon px-6 py-3 text-label-md text-white"
            >
              Publicar evento
            </button>
          </form>
        </div>
      )}

      {tab === 'filmes' && (
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <form
            id="organizer-movie-form"
            onSubmit={(e) => void handleSaveMovie(e)}
            className="glass-card h-fit space-y-4 rounded-xl p-card-padding"
            noValidate
          >
            <h2 className="text-headline-md text-on-surface">
              {editingId ? 'Editar filme' : 'Novo filme'}
            </h2>

            {formHint && (
              <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-body-md text-amber-200">
                {formHint}
              </p>
            )}

            {(
              [
                ['title', 'Título *'],
                ['genre', 'Gênero'],
                ['runtime', 'Duração'],
                ['format', 'Formato'],
                ['badge', 'Selo'],
                ['trailerUrl', 'URL do trailer (YouTube)'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <label className="text-label-md text-on-surface-variant">{label}</label>
                <input
                  className="glass-input w-full rounded-lg px-4 py-3 text-body-md"
                  value={String(form[key] ?? '')}
                  onChange={(e) => {
                    setFormHint(null)
                    setForm((prev) => ({ ...prev, [key]: e.target.value }))
                  }}
                  required={key === 'title'}
                />
              </div>
            ))}

            <div className="space-y-2">
              <label className="text-label-md text-on-surface-variant">
                Poster * (URL ou galeria)
              </label>
              <input
                className="glass-input w-full rounded-lg px-4 py-3 text-body-md"
                value={form.poster}
                onChange={(e) => {
                  setFormHint(null)
                  setPosterBroken(false)
                  const next = e.target.value
                  setForm((prev) => ({
                    ...prev,
                    poster: next,
                    hero: next,
                    backdrop: next,
                  }))
                }}
                onBlur={() => {
                  const normalized = normalizePosterUrl(form.poster)
                  if (normalized !== form.poster) {
                    setForm((prev) => ({
                      ...prev,
                      poster: normalized,
                      hero: normalized,
                      backdrop: normalized,
                    }))
                  }
                }}
                placeholder="https://image.tmdb.org/t/p/w500/..."
                required
              />
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {POSTER_GALLERY.map((item) => (
                  <button
                    key={item.url}
                    type="button"
                    title={item.label}
                    onClick={() => {
                      setFormHint(null)
                      setPosterBroken(false)
                      setForm((prev) => ({
                        ...prev,
                        poster: item.url,
                        hero: item.url,
                        backdrop: item.url,
                      }))
                    }}
                    className={`overflow-hidden rounded-lg border-2 ${
                      form.poster === item.url
                        ? 'border-primary'
                        : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={item.url}
                      alt={item.label}
                      className="aspect-[2/3] w-full bg-white/5 object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const el = e.currentTarget
                        el.style.visibility = 'hidden'
                        el.parentElement?.classList.add('bg-white/10')
                      }}
                    />
                  </button>
                ))}
              </div>
              {form.poster && (
                <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                  <p className="px-3 py-2 text-caption text-on-surface-variant">
                    Pré-visualização
                  </p>
                  {posterBroken ? (
                    <div className="flex min-h-40 flex-col items-center justify-center gap-2 bg-white/5 px-4 py-8 text-center">
                      <Icon name="broken_image" className="text-[32px] text-on-surface-variant" />
                      <p className="text-caption text-primary">
                        Poster não carregou. Escolha outro da galeria ou cole uma URL válida.
                      </p>
                    </div>
                  ) : (
                    <img
                      key={form.poster}
                      src={normalizePosterUrl(form.poster)}
                      alt="Prévia do poster"
                      className="max-h-72 w-full object-cover"
                      onError={() => setPosterBroken(true)}
                      onLoad={() => setPosterBroken(false)}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-label-md text-on-surface-variant">Sinopse</label>
              <textarea
                className="glass-input min-h-28 w-full rounded-lg px-4 py-3 text-body-md"
                value={form.synopsis}
                onChange={(e) => setForm((prev) => ({ ...prev, synopsis: e.target.value }))}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-lg bg-primary-container px-6 py-3 text-label-md text-white"
              >
                {editingId ? 'Salvar alterações' : 'Criar filme'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setForm(emptyMovie)
                    setFormHint(null)
                    setPosterBroken(false)
                  }}
                  className="rounded-lg border border-white/15 px-6 py-3 text-label-md text-on-surface-variant"
                >
                  Cancelar edição
                </button>
              )}
            </div>
          </form>

          <div className="space-y-4">
            <h2 className="text-headline-md text-on-surface">Catálogo</h2>
            {loading ? (
              <p className="text-body-md text-on-surface-variant">Carregando…</p>
            ) : movies.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/15 p-6 text-body-md text-on-surface-variant">
                Nenhum filme no catálogo ainda. Publique o primeiro ao lado.
              </p>
            ) : (
              <div className="space-y-3">
                {movies.map((movie) => {
                  const active = movie.isActive !== false
                  return (
                    <article
                      key={movie.id}
                      className={`glass-card rounded-xl border p-4 ${
                        editingId === movie.id
                          ? 'border-primary/60 bg-primary/5'
                          : selectedId === movie.id
                            ? 'border-primary/50'
                            : 'border-white/10'
                      } ${!active ? 'opacity-70' : ''}`}
                    >
                      <div className="flex gap-3">
                        <img
                          src={movie.poster}
                          alt=""
                          className="h-24 w-16 shrink-0 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1 space-y-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-body-lg text-on-surface">
                                {movie.title}
                              </h3>
                              <span
                                className={`rounded-full px-2 py-0.5 text-caption ${
                                  active
                                    ? 'bg-emerald-400/15 text-emerald-300'
                                    : 'bg-white/10 text-on-surface-variant'
                                }`}
                              >
                                {active ? 'Ativo' : 'Inativo'}
                              </span>
                              {editingId === movie.id && (
                                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-caption text-primary">
                                  Editando
                                </span>
                              )}
                            </div>
                            <p className="text-caption text-on-surface-variant">
                              {movie.genre} • {movie.runtime}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(movie)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-container px-3 py-2 text-caption text-white transition-colors hover:brightness-110"
                            >
                              <Icon name="edit" className="text-[16px]" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedId(movie.id)
                                setTab('sessoes')
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-caption text-on-surface transition-colors hover:border-primary/40 hover:text-primary"
                            >
                              <Icon name="schedule" className="text-[16px]" />
                              Sessões
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleToggleActive(movie)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-caption text-on-surface transition-colors hover:border-primary/40 hover:text-primary"
                            >
                              <Icon
                                name={active ? 'visibility_off' : 'visibility'}
                                className="text-[16px]"
                              />
                              {active ? 'Desativar' : 'Ativar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteMovie(movie.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-caption text-primary transition-colors hover:bg-primary/20"
                            >
                              <Icon name="delete" className="text-[16px]" />
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'sessoes' && (
        <div className="space-y-6">
          <div className="space-y-4 rounded-2xl border border-white/8 bg-surface-container/70 p-card-padding">
            <div>
              <h2 className="text-headline-md text-on-surface">Gerenciar sessões</h2>
              <p className="mt-1 text-body-md text-on-surface-variant">
                Escolha o filme para criar, editar ou remover horários.
              </p>
            </div>
            <label className="block space-y-2">
              <span className="text-caption uppercase tracking-wider text-on-surface-variant">
                Filme
              </span>
              <select
                className="field-select w-full rounded-xl border border-white/10 px-4 py-3.5 text-body-md text-on-surface"
                value={selectedId || ''}
                onChange={(e) => setSelectedId(e.target.value || null)}
              >
                <option value="">Selecione um filme</option>
                {movies.map((movie) => (
                  <option key={movie.id} value={movie.id}>
                    {movie.title}
                    {movie.isActive === false ? ' (inativo)' : ''}
                  </option>
                ))}
              </select>
            </label>

            {selectedMovie && (
              <p className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-body-md text-on-surface">
                Sessões de <span className="font-medium">{selectedMovie.title}</span>
              </p>
            )}

            {selectedId ? (
              <>
                <form
                  onSubmit={(e) => void handleSaveSession(e)}
                  className="grid gap-3 sm:grid-cols-3"
                >
                  <label className="space-y-1">
                    <span className="text-label-md text-on-surface-variant">Data *</span>
                    <input
                      type="date"
                      value={sessionDateIso}
                      onChange={(e) => setSessionDateIso(e.target.value)}
                      className="glass-input w-full rounded-lg px-3 py-2 text-body-md"
                      required
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-label-md text-on-surface-variant">Horário *</span>
                    <input
                      type="time"
                      value={sessionTime}
                      onChange={(e) => setSessionTime(e.target.value)}
                      className="glass-input w-full rounded-lg px-3 py-2 text-body-md"
                      required
                    />
                  </label>
                  <label className="space-y-1 sm:col-span-3">
                    <RoomPicker value={room} onChange={setRoom} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-label-md text-on-surface-variant">Cinema</span>
                    <input
                      type="text"
                      value={cinema}
                      onChange={(e) => setCinema(e.target.value)}
                      className="glass-input w-full rounded-lg px-3 py-2 text-body-md"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-label-md text-on-surface-variant">Capacidade</span>
                    <input
                      type="number"
                      min={10}
                      max={200}
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="glass-input w-full rounded-lg px-3 py-2 text-body-md"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-label-md text-on-surface-variant">Preço (R$)</span>
                    <input
                      type="number"
                      min={1}
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="glass-input w-full rounded-lg px-3 py-2 text-body-md"
                    />
                  </label>
                  <div className="flex items-end gap-2 sm:col-span-3">
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-neon px-4 py-2.5 text-label-md text-white"
                    >
                      {editingSessionId ? 'Salvar sessão' : 'Adicionar'}
                    </button>
                  </div>
                  {editingSessionId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSessionId(null)
                        setSessionDateIso('')
                        setSessionTime('20:00')
                        setRoom(normalizeCinemaRoom('Sala 1'))
                      }}
                      className="rounded-lg border border-white/15 px-4 py-2 text-label-md text-on-surface-variant sm:col-span-4"
                    >
                      Cancelar edição da sessão
                    </button>
                  )}
                </form>

                <ul className="space-y-3">
                  {sessions.map((session) => {
                    const occ = occupancy[session.id]
                    return (
                      <li
                        key={session.id}
                        className="rounded-xl border border-white/10 px-4 py-3"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-body-md text-on-surface">
                              {session.dateLabel || session.date} • {session.time} •{' '}
                              {session.room}
                            </p>
                            {occ ? (
                              <p className="mt-1 text-caption text-on-surface-variant">
                                Ocupação: {occ.sold}/{occ.totalSeats} vendidos
                                {occ.held > 0 ? ` · ${occ.held} em hold` : ''} ·{' '}
                                {occ.available} livres · {money(occ.revenue)}
                              </p>
                            ) : (
                              <p className="mt-1 text-caption text-on-surface-variant">
                                Carregando ocupação…
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startEditSession(session)}
                              className="rounded-lg border border-white/15 px-3 py-1 text-caption"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDuplicateSession(session)}
                              className="rounded-lg border border-white/15 px-3 py-1 text-caption"
                            >
                              Duplicar
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteSession(session.id)}
                              className="rounded-lg border border-primary/30 px-3 py-1 text-caption text-primary"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                        {occ && (
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (occ.sold / Math.max(1, occ.totalSeats)) * 100,
                                )}%`,
                              }}
                            />
                          </div>
                        )}
                      </li>
                    )
                  })}
                  {sessions.length === 0 && (
                    <li className="text-caption text-on-surface-variant">
                      Nenhuma sessão cadastrada.
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <p className="text-body-md text-on-surface-variant">
                Selecione um filme para criar e editar sessões.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-headline-md text-on-surface">Visão geral</h2>
              <p className="text-body-md text-on-surface-variant">
                Visão geral do cinema: eventos, vendas e próximas sessões.
              </p>
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-caption ${
                reportLive
                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                  : 'border-white/10 text-on-surface-variant'
              }`}
            >
              <span
                className={`size-2 rounded-full ${
                  reportLive ? 'bg-emerald-400' : 'bg-on-surface-variant'
                }`}
              />
              {reportLive ? 'Ao vivo' : 'Atualizando…'}
            </div>
          </div>

          {!report ? (
            <p className="text-body-md text-on-surface-variant">Carregando dashboard…</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Eventos', String(report.activeMovies || report.movies)],
                  ['Ingressos vendidos', String(report.ticketsSold)],
                  ['Receita', money(report.revenue)],
                  [
                    'Ocupação média',
                    `${
                      report.sessions.length > 0
                        ? Math.round(
                            report.sessions.reduce(
                              (sum, s) => sum + (s.occupancyPct ?? 0),
                              0,
                            ) / report.sessions.length,
                          )
                        : 0
                    }%`,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="min-w-0 rounded-xl border border-white/10 bg-surface-container p-5"
                  >
                    <p className="text-caption uppercase tracking-wider text-on-surface-variant">
                      {label}
                    </p>
                    <p className="mt-2 break-words text-3xl font-semibold tracking-tight text-on-surface sm:text-4xl">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <div className="border-b border-white/10 px-4 py-4">
                  <h3 className="text-label-md uppercase tracking-wider text-on-surface-variant">
                    Próximas sessões
                  </h3>
                  <p className="mt-1 text-caption text-on-surface-variant/80">
                    Clique numa sessão para ver o mapa de assentos.
                  </p>
                </div>
                <table className="min-w-full text-left text-body-md">
                  <thead className="bg-white/5 text-caption text-on-surface-variant">
                    <tr>
                      <th className="px-4 py-3 font-medium">Filme</th>
                      <th className="px-4 py-3 font-medium">Sala</th>
                      <th className="px-4 py-3 font-medium">Horário</th>
                      <th className="px-4 py-3 font-medium">Ocupação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...report.sessions]
                      .sort((a, b) =>
                        sessionSortKey(a).localeCompare(sessionSortKey(b)),
                      )
                      .slice(0, 10)
                      .map((session) => {
                        const pct = session.occupancyPct ?? 0
                        const roomLabel = String(session.room || '—').replace(
                          /^Sala\s+/i,
                          '',
                        )
                        return (
                          <tr
                            key={session.id}
                            className="cursor-pointer border-t border-white/10 transition-colors hover:bg-white/5"
                            onClick={() => void openSeatMap(session)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                void openSeatMap(session)
                              }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-label={`Ver mapa de assentos de ${session.movieTitle}`}
                          >
                            <td className="max-w-[220px] truncate px-4 py-3 text-on-surface">
                              {session.movieTitle}
                            </td>
                            <td className="px-4 py-3 text-on-surface-variant">
                              {roomLabel}
                            </td>
                            <td className="px-4 py-3 text-on-surface-variant">
                              {session.time}
                              <span className="ml-2 text-caption text-on-surface-variant/70">
                                {session.date}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex min-w-[120px] items-center gap-3">
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className="h-full rounded-full bg-neon transition-all duration-500"
                                    style={{ width: `${Math.min(100, pct)}%` }}
                                  />
                                </div>
                                <span className="w-10 shrink-0 text-right text-label-md text-on-surface">
                                  {pct}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    {report.sessions.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-6 text-center text-on-surface-variant"
                        >
                          Sem sessões ainda. Publique um evento ou crie uma sessão.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {seatMapView && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={`Mapa de assentos: ${seatMapView.movieTitle}`}
          onClick={closeSeatMap}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-background shadow-[0_20px_60px_rgba(0,0,0,0.6)] animate-fade-up"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <p className="text-caption uppercase tracking-wider text-on-surface-variant">
                  Mapa de assentos
                </p>
                <h3 className="mt-1 truncate text-title-md text-on-surface">
                  {seatMapView.movieTitle}
                </h3>
                <p className="mt-1 text-body-md text-on-surface-variant">
                  {seatMapView.room} · {seatMapView.time} · {seatMapView.date}
                </p>
              </div>
              <button
                type="button"
                onClick={closeSeatMap}
                className="shrink-0 rounded-lg border border-white/10 p-2 text-on-surface-variant transition-colors hover:bg-white/5 hover:text-on-surface"
                aria-label="Fechar mapa"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 border-b border-white/10 px-5 py-4 text-center">
              <div>
                <p className="text-caption text-on-surface-variant">Ocupação</p>
                <p className="mt-1 text-title-sm text-on-surface">
                  {seatMapView.occupancyPct}%
                </p>
              </div>
              <div>
                <p className="text-caption text-on-surface-variant">Vendidos</p>
                <p className="mt-1 text-title-sm text-on-surface">
                  {seatMapView.sold}/{seatMapView.totalSeats}
                </p>
              </div>
              <div>
                <p className="text-caption text-on-surface-variant">Livres</p>
                <p className="mt-1 text-title-sm text-on-surface">
                  {seatMapView.available}
                </p>
              </div>
            </div>

            <div className="px-5 py-6">
              {seatMapLoading ? (
                <p className="py-16 text-center text-body-md text-on-surface-variant">
                  Carregando assentos…
                </p>
              ) : seatMapError ? (
                <p className="py-16 text-center text-body-md text-primary">
                  {seatMapError}
                </p>
              ) : (
                <>
                  <div className="relative mb-8 flex flex-col items-center">
                    <div className="h-8 w-3/4 max-w-lg rounded-[100%] border-t-4 border-primary/35" />
                    <span className="mt-4 text-label-md tracking-[0.2em] text-on-surface-variant uppercase">
                      Tela
                    </span>
                  </div>

                  <div className="mx-auto flex w-max max-w-full flex-col items-center gap-2 overflow-x-auto sm:gap-3">
                    {seatMapRows.map(({ row, seats }) => (
                      <div
                        key={row}
                        className="flex items-center gap-1.5 sm:gap-2 md:gap-4"
                      >
                        <span className="w-3 shrink-0 text-center text-caption text-on-surface-variant sm:w-4 sm:text-label-md">
                          {row}
                        </span>
                        <div className="flex justify-center gap-1 sm:gap-1.5 md:gap-2">
                          {seats.map((seat, index) => (
                            <div key={seat.id} className="contents">
                              {(index === 2 || index === 8) && (
                                <div
                                  className="w-1.5 sm:w-2 md:w-4"
                                  aria-hidden
                                />
                              )}
                              <div
                                className={`seat flex h-6 w-6 items-center justify-center rounded-t-lg rounded-b-sm sm:h-7 sm:w-7 md:h-8 md:w-8 ${
                                  seat.isAvailable
                                    ? 'border border-white/20 bg-surface-container'
                                    : 'bg-surface-variant opacity-40'
                                }`}
                                title={`${seat.name}: ${
                                  seat.isAvailable ? 'livre' : 'ocupado'
                                }`}
                                aria-label={`Assento ${seat.name}, ${
                                  seat.isAvailable ? 'livre' : 'ocupado'
                                }`}
                              >
                                {seat.isAvailable ? (
                                  <span className="text-[9px] text-white/50 sm:text-[10px]">
                                    {seat.number}
                                  </span>
                                ) : (
                                  <Icon
                                    name="close"
                                    className="text-[12px] sm:text-[14px]"
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <span className="w-3 shrink-0 text-center text-caption text-on-surface-variant sm:w-4 sm:text-label-md">
                          {row}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 flex flex-wrap justify-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-t-md rounded-b-sm border border-white/20 bg-surface-container" />
                      <span className="text-caption text-on-surface-variant">
                        Livre
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-t-md rounded-b-sm bg-surface-variant opacity-50">
                        <Icon name="close" className="text-[10px]" />
                      </div>
                      <span className="text-caption text-on-surface-variant">
                        Ocupado
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export function OrganizerPage() {
  return (
    <RequireRole roles={['organizador']}>
      <OrganizerDashboard />
    </RequireRole>
  )
}
