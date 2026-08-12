import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  createEventFromTmdb,
  createShowtime,
  deleteShowtime,
  duplicateShowtime,
  fetchAdminMovies,
  fetchMovieShowtimes,
  fetchShowtimeSeats,
  fetchOrganizerReport,
  fetchShowtimeOccupancy,
  searchTmdbCatalog,
  toBrDate,
  toIsoDate,
  updateShowtime,
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

type TabId = 'dashboard' | 'publicar' | 'sessoes'

function sessionSortKey(session: { date: string; time: string }) {
  const match = String(session.date || '').match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return `${session.date} ${session.time}`
  const [, day, month, year] = match
  return `${year}-${month}-${day}T${session.time || '00:00'}`
}

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function heatSeatStyle(intensity: number): {
  backgroundColor: string
  color: string
  borderColor: string
} {
  const t = Math.max(0, Math.min(1, intensity))
  let r: number
  let g: number
  let b: number
  if (t <= 0.5) {
    const u = t / 0.5
    r = Math.round(34 + (234 - 34) * u)
    g = Math.round(197 + (179 - 197) * u)
    b = Math.round(94 + (8 - 94) * u)
  } else {
    const u = (t - 0.5) / 0.5
    r = Math.round(234 + (239 - 234) * u)
    g = Math.round(179 + (68 - 179) * u)
    b = Math.round(8 + (68 - 8) * u)
  }
  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: t > 0.4 ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.9)',
    borderColor: 'transparent',
  }
}

function groupHeatmapByRow(
  seats: Array<{ label: string; row: string; number: number; soldCount: number; intensity: number }>,
) {
  const rows = new Map<
    string,
    Array<{ label: string; row: string; number: number; soldCount: number; intensity: number }>
  >()
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

function OrganizerDashboard() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<TabId>('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [movies, setMovies] = useState<Movie[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [occupancy, setOccupancy] = useState<Record<string, ShowtimeOccupancy>>({})
  const [report, setReport] = useState<OrganizerReport | null>(null)
  const [reportLive, setReportLive] = useState(false)
  const [sessionDateIso, setSessionDateIso] = useState('')
  const [sessionTime, setSessionTime] = useState('20:00')
  const [room, setRoom] = useState<string>(normalizeCinemaRoom('Sala 1'))
  const [capacity, setCapacity] = useState('40')
  const [price, setPrice] = useState('32')
  const [cinema, setCinema] = useState(CINEMA_NAME)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
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

  const heatmapRows = useMemo(
    () =>
      report?.seatHeatmap?.seats
        ? groupHeatmapByRow(report.seatHeatmap.seats)
        : [],
    [report],
  )

  const heatmapColNumbers = useMemo(() => {
    const first = heatmapRows[0]?.seats
    if (!first?.length) {
      return Array.from({ length: 10 }, (_, i) => i + 1)
    }
    return first.map((seat) => seat.number)
  }, [heatmapRows])

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
    void reloadMovies().catch((err) =>
      setError(err instanceof Error ? err.message : 'Falha ao carregar filmes.'),
    )
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

  function resetSessionForm() {
    setEditingSessionId(null)
    setSessionDateIso('')
    setSessionTime('20:00')
    setRoom(normalizeCinemaRoom('Sala 1'))
    setCinema(CINEMA_NAME)
    setCapacity('40')
    setPrice('32')
  }

  async function handleSaveSession(e: FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    setError(null)
    setSuccess(null)
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
        setSuccess('Sessão criada.')
      }
      resetSessionForm()
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
      if (editingSessionId === id) resetSessionForm()
      if (selectedId) await reloadSessions(selectedId)
      setSuccess('Sessão removida.')
    } catch (err) {
      setError(err instanceof AppApiError ? err.message : 'Falha ao remover sessão.')
    }
  }

  function startEditSession(session: Session) {
    setEditingSessionId(session.id)
    setSessionDateIso(toIsoDate(session.date))
    setSessionTime(session.time)
    setRoom(normalizeCinemaRoom(session.room))
    setCinema(session.cinema || CINEMA_NAME)
    setCapacity(String(session.capacity || 40))
    setPrice(String(session.price || 28))
    setSuccess(null)
    setError(null)
    window.requestAnimationFrame(() => {
      document.getElementById('organizer-session-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'dashboard', label: 'Visão geral' },
    { id: 'publicar', label: 'Publicar (TMDb)' },
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
    <main className="mx-auto w-full min-w-0 max-w-[1200px] overflow-x-clip px-4 py-section-gap sm:px-5 md:px-container-margin">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-caption uppercase tracking-wider text-on-surface-variant">
            Painel do organizador
          </p>
          <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
            Visão geral
          </h1>
          <div className="relative mt-1 inline-block">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex max-w-full items-center gap-1.5 break-all text-left text-body-md text-on-surface-variant transition-colors hover:text-on-surface"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="truncate">
                {user?.name}
                {user?.email ? ` · ${user.email}` : ''}
              </span>
              <Icon
                name={menuOpen ? 'expand_less' : 'expand_more'}
                className="shrink-0 text-[18px]"
              />
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default"
                  aria-label="Fechar menu"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  role="menu"
                  className="absolute left-0 top-full z-50 mt-2 min-w-[160px] rounded-xl border border-white/10 bg-surface-container py-1 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      void logout()
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-label-md text-on-surface transition-colors hover:bg-white/5"
                  >
                    <Icon name="logout" className="text-[18px]" />
                    Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto rounded-full bg-white/5 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`shrink-0 rounded-full px-4 py-2.5 text-caption transition-colors sm:px-5 sm:text-label-md ${
              tab === item.id
                ? 'bg-primary text-white'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {item.id === 'publicar' ? (
              <>
                <span className="sm:hidden">Publicar</span>
                <span className="hidden sm:inline">{item.label}</span>
              </>
            ) : (
              item.label
            )}
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

      {tab === 'sessoes' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/8 bg-surface-container/70 p-card-padding">
            <div className="mb-4">
              <h2 className="text-headline-md text-on-surface">Sessões</h2>
              <p className="mt-1 text-body-md text-on-surface-variant">
                Escolha o filme, crie horários e edite ou remova pela lista.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-caption uppercase tracking-wider text-on-surface-variant">
                Filme
              </span>
              <select
                className="field-select w-full rounded-xl border border-white/10 px-4 py-3.5 text-body-md text-on-surface"
                value={selectedId || ''}
                onChange={(e) => {
                  setSelectedId(e.target.value || null)
                  resetSessionForm()
                }}
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
          </div>

          {!selectedId ? (
            <p className="rounded-xl border border-dashed border-white/12 px-4 py-8 text-center text-body-md text-on-surface-variant">
              Selecione um filme acima para gerenciar as sessões.
            </p>
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <form
                id="organizer-session-form"
                onSubmit={(e) => void handleSaveSession(e)}
                className="space-y-4 rounded-2xl border border-white/8 bg-surface-container/70 p-card-padding"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-headline-md text-on-surface">
                      {editingSessionId ? 'Editar sessão' : 'Nova sessão'}
                    </h3>
                    <p className="mt-1 text-caption text-on-surface-variant">
                      {selectedMovie?.title}
                    </p>
                  </div>
                  {editingSessionId && (
                    <span className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-caption text-on-surface-variant">
                      editando
                    </span>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
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
                </div>

                <label className="block space-y-1">
                  <span className="text-label-md text-on-surface-variant">Cinema</span>
                  <input
                    type="text"
                    value={cinema}
                    onChange={(e) => setCinema(e.target.value)}
                    className="glass-input w-full rounded-lg px-3 py-2 text-body-md"
                  />
                </label>

                <RoomPicker value={room} onChange={setRoom} />

                <div className="grid grid-cols-2 gap-3">
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
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-neon px-4 py-2.5 text-label-md text-white"
                  >
                    {editingSessionId ? 'Salvar alterações' : 'Criar sessão'}
                  </button>
                  {editingSessionId && (
                    <button
                      type="button"
                      onClick={() => resetSessionForm()}
                      className="rounded-lg border border-white/15 px-4 py-2.5 text-label-md text-on-surface-variant"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>

              <section className="space-y-3 rounded-2xl border border-white/8 bg-surface-container/70 p-card-padding">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {selectedMovie?.poster ? (
                      <img
                        src={selectedMovie.poster}
                        alt=""
                        className="h-16 w-11 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-16 w-11 shrink-0 rounded-lg bg-white/10" />
                    )}
                    <div className="min-w-0">
                      <h3 className="text-headline-md text-on-surface">Lista</h3>
                      <p className="mt-0.5 truncate text-caption text-on-surface-variant">
                        {selectedMovie?.title}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-caption text-on-surface-variant">
                    {sessions.length} {sessions.length === 1 ? 'sessão' : 'sessões'}
                  </span>
                </div>

                {sessions.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/12 px-4 py-6 text-center text-body-md text-on-surface-variant">
                    Nenhuma sessão ainda. Crie a primeira ao lado.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {sessions.map((session) => {
                      const occ = occupancy[session.id]
                      const isEditing = editingSessionId === session.id
                      return (
                        <li
                          key={session.id}
                          className={`rounded-xl border px-4 py-3 transition-colors ${
                            isEditing
                              ? 'border-white/30 bg-white/[0.06]'
                              : 'border-white/10 bg-white/[0.02]'
                          }`}
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-body-md text-on-surface">
                                  {session.dateLabel || session.date} · {session.time}
                                </p>
                                <p className="mt-0.5 text-caption text-on-surface-variant">
                                  {session.room}
                                  {session.cinema ? ` · ${session.cinema}` : ''}
                                  {session.price != null ? ` · ${money(session.price)}` : ''}
                                </p>
                                {occ ? (
                                  <p className="mt-1 text-caption text-on-surface-variant">
                                    {occ.sold}/{occ.totalSeats} vendidos
                                    {occ.held > 0 ? ` · ${occ.held} em hold` : ''} ·{' '}
                                    {occ.available} livres
                                  </p>
                                ) : (
                                  <p className="mt-1 text-caption text-on-surface-variant">
                                    Carregando ocupação…
                                  </p>
                                )}
                              </div>
                              {isEditing && (
                                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-on-surface-variant">
                                  em edição
                                </span>
                              )}
                            </div>

                            {occ && (
                              <div className="h-1.5 overflow-hidden rounded bg-white/10">
                                <div
                                  className="h-full rounded bg-white/40"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (occ.sold / Math.max(1, occ.totalSeats)) * 100,
                                    )}%`,
                                  }}
                                />
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => startEditSession(session)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-caption text-on-surface hover:bg-white/5"
                              >
                                <Icon name="edit" className="text-[15px]" />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDuplicateSession(session)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-caption text-on-surface hover:bg-white/5"
                              >
                                <Icon name="content_copy" className="text-[15px]" />
                                Duplicar
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteSession(session.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-caption text-primary hover:bg-primary/20"
                              >
                                <Icon name="delete" className="text-[15px]" />
                                Apagar
                              </button>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      )}

      {tab === 'dashboard' && (
        <div className="mx-auto w-full max-w-[820px] space-y-5">
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
              <div className="grid gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:items-stretch">
                <div className="grid grid-cols-2 gap-3">
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
                      className="flex min-h-[5.5rem] min-w-0 flex-col items-center justify-center rounded-xl border border-white/10 bg-surface-container px-3 py-4 text-center"
                    >
                      <p className="text-[10px] uppercase tracking-wider text-on-surface-variant sm:text-caption">
                        {label}
                      </p>
                      <p className="mt-1.5 break-words text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-white/10 bg-surface-container p-3 sm:p-4">
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h3 className="text-label-md uppercase tracking-wider text-on-surface-variant">
                        Mapa de calor
                      </h3>
                      <p className="mt-0.5 text-caption text-on-surface-variant/80">
                        Assentos mais vendidos em todas as sessões.
                      </p>
                    </div>
                    {report.seatHeatmap && report.seatHeatmap.maxSold > 0 && (
                      <p className="text-caption text-on-surface-variant">
                        Pico: {report.seatHeatmap.maxSold} venda
                        {report.seatHeatmap.maxSold === 1 ? '' : 's'}
                      </p>
                    )}
                  </div>

                  {heatmapRows.length === 0 ? (
                    <p className="py-8 text-center text-body-md text-on-surface-variant">
                      Sem dados de assentos ainda.
                    </p>
                  ) : (
                    <>
                      <div className="relative mb-3 flex flex-col items-center">
                        <div className="h-4 w-2/3 max-w-[240px] rounded-[100%] border-t-[3px] border-primary/35" />
                        <span className="mt-2 text-[10px] tracking-[0.2em] text-on-surface-variant uppercase sm:text-caption">
                          Tela
                        </span>
                      </div>

                      <div className="mx-auto flex w-max max-w-full scale-[0.92] flex-col items-center gap-1 overflow-x-auto origin-top sm:scale-100 sm:gap-1.5">
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <span className="w-2.5 shrink-0 sm:w-3" aria-hidden />
                          <div className="flex justify-center gap-0.5 sm:gap-1">
                            {heatmapColNumbers.map((n, index) => (
                              <div key={`col-${n}`} className="contents">
                                {(index === 2 || index === 8) && (
                                  <div className="w-1 sm:w-1.5" aria-hidden />
                                )}
                                <span className="flex h-4 w-5 items-center justify-center text-[8px] text-on-surface-variant/70 sm:w-5">
                                  {n}
                                </span>
                              </div>
                            ))}
                          </div>
                          <span className="w-2.5 shrink-0 sm:w-3" aria-hidden />
                        </div>

                        {heatmapRows.map(({ row, seats }) => (
                          <div
                            key={row}
                            className="flex items-center gap-1 sm:gap-1.5"
                          >
                            <span className="w-2.5 shrink-0 text-center text-[9px] text-on-surface-variant sm:w-3 sm:text-caption">
                              {row}
                            </span>
                            <div className="flex justify-center gap-0.5 sm:gap-1">
                              {seats.map((seat, index) => {
                                const style = heatSeatStyle(seat.intensity)
                                return (
                                  <div key={seat.label} className="contents">
                                    {(index === 2 || index === 8) && (
                                      <div className="w-1 sm:w-1.5" aria-hidden />
                                    )}
                                    <div
                                      className="seat flex h-5 w-5 items-center justify-center rounded-t-md rounded-b-sm text-[8px] font-medium"
                                      style={style}
                                      title={`${seat.label}: ${seat.soldCount} venda${
                                        seat.soldCount === 1 ? '' : 's'
                                      }`}
                                      aria-label={`Assento ${seat.label}, ${seat.soldCount} vendas`}
                                    >
                                      {seat.number}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            <span className="w-2.5 shrink-0 text-center text-[9px] text-on-surface-variant sm:w-3 sm:text-caption">
                              {row}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-7 rounded-sm"
                            style={{
                              background:
                                'linear-gradient(90deg, rgb(34,197,94), rgb(234,179,8), rgb(239,68,68))',
                            }}
                            aria-hidden
                          />
                          <span className="text-caption text-on-surface-variant">
                            Menos vendido → mais vendido
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <div className="border-b border-white/10 px-4 py-3">
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
                      <th className="px-4 py-2.5 font-medium">Filme</th>
                      <th className="px-4 py-2.5 font-medium">Sala</th>
                      <th className="px-4 py-2.5 font-medium">Horário</th>
                      <th className="px-4 py-2.5 font-medium">Ocupação</th>
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
                            <td className="max-w-[220px] truncate px-4 py-2.5 text-on-surface">
                              {session.movieTitle}
                            </td>
                            <td className="px-4 py-2.5 text-on-surface-variant">
                              {roomLabel}
                            </td>
                            <td className="px-4 py-2.5 text-on-surface-variant">
                              {session.time}
                              <span className="ml-2 text-caption text-on-surface-variant/70">
                                {session.date}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
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
