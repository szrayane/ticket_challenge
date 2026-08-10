import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  POSTER_GALLERY,
  createEventFromTmdb,
  createLocalMovie,
  createLocalShowtime,
  deleteLocalMovie,
  deleteLocalShowtime,
  duplicateLocalShowtime,
  fetchAdminLocalMovies,
  fetchLocalMovieShowtimes,
  fetchOrganizerReport,
  fetchShowtimeOccupancy,
  searchTmdbCatalog,
  setLocalMovieActive,
  toBrDate,
  toIsoDate,
  updateLocalMovie,
  updateLocalShowtime,
  type LocalMovieInput,
  type OrganizerReport,
  type ShowtimeOccupancy,
} from '../api/localCatalog'
import { AppApiError } from '../api/appClient'
import { RequireRole } from '../components/RequireRole'
import { useAuth } from '../context/AuthContext'
import { connectRealtime } from '../lib/realtime'
import type { Movie, Session } from '../types'

type TabId = 'dashboard' | 'publicar' | 'filmes' | 'sessoes'

const emptyMovie: LocalMovieInput = {
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

function fieldError(form: LocalMovieInput) {
  if (!form.title.trim()) return 'Informe o título do filme.'
  if (!form.poster.trim()) return 'Informe a URL do poster ou escolha da galeria.'
  if (!/^https?:\/\//i.test(form.poster.trim())) {
    return 'A URL do poster precisa começar com http:// ou https://.'
  }
  if (form.trailerUrl?.trim() && !/^https?:\/\//i.test(form.trailerUrl.trim())) {
    return 'A URL do trailer precisa começar com http:// ou https://.'
  }
  return null
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
  const [form, setForm] = useState<LocalMovieInput>(emptyMovie)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sessionDateIso, setSessionDateIso] = useState('')
  const [sessionTime, setSessionTime] = useState('20:00')
  const [room, setRoom] = useState('Sala 1')
  const [capacity, setCapacity] = useState('40')
  const [price, setPrice] = useState('32')
  const [cinema, setCinema] = useState('CineRay Centro')
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
  const [eventDateIso, setEventDateIso] = useState('')
  const [eventTime, setEventTime] = useState('20:00')
  const [eventRoom, setEventRoom] = useState('Sala 1')
  const [eventCapacity, setEventCapacity] = useState('40')
  const [eventPrice, setEventPrice] = useState('32')
  const [eventCinema, setEventCinema] = useState('CineRay Centro')

  const selectedMovie = useMemo(
    () => movies.find((m) => m.id === selectedId) || null,
    [movies, selectedId],
  )

  async function reloadMovies() {
    const list = await fetchAdminLocalMovies()
    setMovies(list)
    return list
  }

  async function reloadSessions(movieId: string) {
    const data = await fetchLocalMovieShowtimes(movieId)
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

  async function handleSaveMovie(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const hint = fieldError(form)
    setFormHint(hint)
    if (hint) return

    try {
      if (editingId) {
        await updateLocalMovie(editingId, form)
        setSuccess('Filme atualizado.')
      } else {
        const movie = await createLocalMovie(form)
        setSuccess('Filme criado.')
        setSelectedId(movie.id)
      }
      setForm(emptyMovie)
      setEditingId(null)
      setFormHint(null)
      await reloadMovies()
    } catch (err) {
      setError(err instanceof AppApiError ? err.message : 'Não foi possível salvar.')
    }
  }

  async function handleToggleActive(movie: Movie) {
    const next = !(movie.isActive !== false)
    try {
      await setLocalMovieActive(movie.id, next)
      await reloadMovies()
      setSuccess(next ? 'Filme ativado no catálogo.' : 'Filme desativado do catálogo.')
    } catch (err) {
      setError(err instanceof AppApiError ? err.message : 'Falha ao alterar status.')
    }
  }

  async function handleDeleteMovie(id: string) {
    if (
      !window.confirm(
        'Excluir este filme? Se houver ingressos ativos, a exclusão será bloqueada — use Desativar.',
      )
    ) {
      return
    }
    try {
      await deleteLocalMovie(id)
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
      room: room.trim() || 'Sala 1',
      cinema: cinema.trim() || 'CineRay',
      capacity: Number(capacity) || 40,
      price: Number(price) || 28,
    }

    try {
      if (editingSessionId) {
        await updateLocalShowtime(editingSessionId, payload)
        setSuccess('Sessão atualizada.')
      } else {
        await createLocalShowtime(selectedId, payload)
        setSuccess('Sessão adicionada.')
      }
      setEditingSessionId(null)
      setSessionDateIso('')
      setSessionTime('20:00')
      setRoom('Sala 1')
      await reloadSessions(selectedId)
      if (tab === 'dashboard') await reloadReport()
    } catch (err) {
      setError(err instanceof AppApiError ? err.message : 'Falha ao salvar sessão.')
    }
  }

  async function handleDuplicateSession(session: Session) {
    if (!selectedId) return
    try {
      await duplicateLocalShowtime(session.id)
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
      await deleteLocalShowtime(id)
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
  }

  function startEditSession(session: Session) {
    setEditingSessionId(session.id)
    setSessionDateIso(toIsoDate(session.date))
    setSessionTime(session.time)
    setRoom(session.room || 'Sala 1')
    setCinema(session.cinema || 'CineRay')
    setCapacity(String(session.capacity || 40))
    setPrice(String(session.price || 28))
  }

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'publicar', label: 'Publicar (TMDb)' },
    { id: 'filmes', label: 'Filmes' },
    { id: 'sessoes', label: 'Sessões' },
  ]

  async function handleSearchTmdb(e?: FormEvent) {
    e?.preventDefault()
    setTmdbLoading(true)
    setError(null)
    try {
      const data = await searchTmdbCatalog(tmdbQuery)
      setTmdbResults(data.results)
      if (data.results.length === 0) {
        setSuccess(null)
        setError('Nenhum filme encontrado na TMDb.')
      }
    } catch (err) {
      setError(err instanceof AppApiError ? err.message : 'Falha ao buscar na TMDb.')
    } finally {
      setTmdbLoading(false)
    }
  }

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
        cinema: eventCinema,
        room: eventRoom,
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
            Dashboard
          </h1>
          <p className="text-body-md text-on-surface-variant">{user?.email}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/"
            className="rounded-lg border border-white/15 px-5 py-2.5 text-label-md text-on-surface-variant"
          >
            Ver catálogo
          </Link>
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
              Busque um filme na API externa e publique com data, local, capacidade e preço.
            </p>
            <form onSubmit={(e) => void handleSearchTmdb(e)} className="flex gap-2">
              <input
                className="glass-input flex-1 rounded-lg px-4 py-3 text-body-md"
                placeholder="Ex.: Duna, Batman…"
                value={tmdbQuery}
                onChange={(e) => setTmdbQuery(e.target.value)}
              />
              <button
                type="submit"
                disabled={tmdbLoading}
                className="rounded-lg bg-primary-container px-5 py-3 text-label-md text-white disabled:opacity-50"
              >
                {tmdbLoading ? 'Buscando…' : 'Buscar'}
              </button>
            </form>
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
                      <p className="text-caption text-on-surface-variant">
                        {item.releaseDate || 's/d'} • ★ {item.rating.toFixed(1)}
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
              Selecionado: {selectedTmdbId ? `TMDb #${selectedTmdbId}` : 'nenhum'}
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
            <label className="block space-y-1">
              <span className="text-label-md text-on-surface-variant">Sala</span>
              <input
                value={eventRoom}
                onChange={(e) => setEventRoom(e.target.value)}
                className="glass-input w-full rounded-lg px-3 py-2 text-body-md"
              />
            </label>
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
        <div className="grid gap-8 lg:grid-cols-2">
          <form
            onSubmit={(e) => void handleSaveMovie(e)}
            className="glass-card space-y-4 rounded-xl p-card-padding"
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
                  setForm((prev) => ({ ...prev, poster: e.target.value }))
                }}
                placeholder="https://..."
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
                    <img src={item.url} alt={item.label} className="aspect-[2/3] w-full object-cover" />
                  </button>
                ))}
              </div>
              {form.poster && (
                <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                  <p className="px-3 py-2 text-caption text-on-surface-variant">Pré-visualização</p>
                  <img
                    src={form.poster}
                    alt="Prévia do poster"
                    className="max-h-72 w-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.opacity = '0.3'
                    }}
                  />
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
                  }}
                  className="rounded-lg border border-white/15 px-6 py-3 text-label-md text-on-surface-variant"
                >
                  Cancelar edição
                </button>
              )}
            </div>
          </form>

          <div className="space-y-4">
            <h2 className="text-headline-md text-on-surface">Filmes locais</h2>
            {loading ? (
              <p className="text-body-md text-on-surface-variant">Carregando…</p>
            ) : movies.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/15 p-6 text-body-md text-on-surface-variant">
                Nenhum filme local ainda. Crie o primeiro ao lado.
              </p>
            ) : (
              <div className="space-y-3">
                {movies.map((movie) => {
                  const active = movie.isActive !== false
                  return (
                    <article
                      key={movie.id}
                      className={`glass-card rounded-xl border p-4 ${
                        selectedId === movie.id ? 'border-primary/50' : 'border-white/10'
                      } ${!active ? 'opacity-70' : ''}`}
                    >
                      <div className="flex gap-3">
                        <img
                          src={movie.poster}
                          alt=""
                          className="h-20 w-14 rounded object-cover"
                        />
                        <div className="min-w-0 flex-1">
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
                          </div>
                          <p className="text-caption text-on-surface-variant">
                            {movie.genre} • {movie.runtime}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedId(movie.id)
                                setTab('sessoes')
                              }}
                              className="rounded-lg border border-white/15 px-3 py-1 text-caption"
                            >
                              Sessões
                            </button>
                            <button
                              type="button"
                              onClick={() => startEdit(movie)}
                              className="rounded-lg border border-white/15 px-3 py-1 text-caption"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleToggleActive(movie)}
                              className="rounded-lg border border-white/15 px-3 py-1 text-caption"
                            >
                              {active ? 'Desativar' : 'Ativar'}
                            </button>
                            <Link
                              to={`/filme/${movie.id}`}
                              className="rounded-lg border border-white/15 px-3 py-1 text-caption"
                            >
                              Ver
                            </Link>
                            <button
                              type="button"
                              onClick={() => void handleDeleteMovie(movie.id)}
                              className="rounded-lg border border-primary/30 px-3 py-1 text-caption text-primary"
                            >
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
                  <label className="space-y-1">
                    <span className="text-label-md text-on-surface-variant">Sala</span>
                    <input
                      type="text"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      className="glass-input w-full rounded-lg px-3 py-2 text-body-md"
                      placeholder="Sala 1"
                    />
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
                        setRoom('Sala 1')
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
              <h2 className="text-headline-md text-on-surface">Dashboard</h2>
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
                          <tr key={session.id} className="border-t border-white/10">
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
