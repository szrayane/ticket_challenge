import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  getMovieShowtimes,
  getShowtimeSeats,
  groupSeatsByRow,
} from '../api/cinema'
import {
  fetchOccupiedSeatIds,
  holdSeat,
  refreshSeatHolds,
  releaseSeatHold,
} from '../api/auth'
import { AppApiError } from '../api/appClient'
import { Icon } from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { useBooking } from '../context/BookingContext'
import { formatHoldCountdown } from '../lib/holdTimer'
import { formatMoney, TICKET_LABELS, TICKET_PRICES } from '../lib/money'
import { getHoldClientId } from '../lib/seatHold'
import type { Movie, Seat, Session } from '../types'

function markOccupiedSeats(seats: Seat[], occupiedIds: string[]): Seat[] {
  const occupied = new Set(occupiedIds.map(String))
  return seats.map((seat) =>
    occupied.has(String(seat.id))
      ? { ...seat, status: 'unavailable' as const }
      : seat,
  )
}

export function SeatsPage() {
  const { movieId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const sessionFromUrl = searchParams.get('session') || ''
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const {
    movie,
    session,
    selectedSeats,
    startBooking,
    toggleSeat,
    clearSeats,
    subtotal,
    serviceFee,
    total,
  } = useBooking()

  const [resolvedMovie, setResolvedMovie] = useState<Movie | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [scheduleStart, setScheduleStart] = useState<string | undefined>()
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [baseSeatMap, setBaseSeatMap] = useState<Seat[]>([])
  const [occupiedSeatIds, setOccupiedSeatIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [seatsLoading, setSeatsLoading] = useState(false)
  const [holdingSeatId, setHoldingSeatId] = useState<string | null>(null)
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null)
  const [holdMsLeft, setHoldMsLeft] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const holderKeyRef = useRef(getHoldClientId())

  const seatMap = useMemo(
    () => markOccupiedSeats(baseSeatMap, occupiedSeatIds),
    [baseSeatMap, occupiedSeatIds],
  )

  useEffect(() => {
    let active = true

    async function loadShowtimes() {
      if (!movieId) return

      try {
        setLoading(true)
        setError(null)
        const data = await getMovieShowtimes(movieId)
        if (!active) return

        setResolvedMovie(data.movie)
        setSessions(data.sessions)
        setScheduleStart(data.scheduleStart)
        const preferred =
          sessionFromUrl &&
          data.sessions.some((item) => item.id === sessionFromUrl)
            ? sessionFromUrl
            : data.sessions[0]?.id ?? ''
        setSelectedSessionId(preferred)
      } catch {
        if (active) setError('Não foi possível carregar as sessões deste filme.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadShowtimes()
    return () => {
      active = false
    }
  }, [movieId, sessionFromUrl])

  useEffect(() => {
    let active = true
    const previousSelected = selectedSeats

    async function loadSeats() {
      if (!selectedSessionId || !scheduleStart) {
        // Sessões locais não dependem do scheduleStart da Cineflex.
        if (!selectedSessionId) return
        if (!scheduleStart && !String(selectedSessionId).startsWith('st_')) return
      }

      // Libera holds da sessão anterior ao trocar.
      if (previousSelected.length > 0 && session?.id && session.id !== selectedSessionId) {
        const holderKey = holderKeyRef.current
        await Promise.allSettled(
          previousSelected.map((seat) =>
            releaseSeatHold({
              sessionId: session.id,
              seatId: seat.id,
              holderKey,
            }),
          ),
        )
      }

      try {
        setSeatsLoading(true)
        setError(null)
        const data = await getShowtimeSeats(
          selectedSessionId,
          scheduleStart,
          movieId,
        )
        if (!active) return

        let occupiedIds: string[] = []
        try {
          occupiedIds = await fetchOccupiedSeatIds(
            selectedSessionId,
            holderKeyRef.current,
          )
        } catch {
          // Local API offline — still show Cineflex map.
        }
        if (!active) return

        setBaseSeatMap(data.seats)
        setOccupiedSeatIds(occupiedIds)
        startBooking(resolvedMovie ?? data.movie, data.session)
      } catch {
        if (active) setError('Não foi possível carregar os assentos desta sessão.')
      } finally {
        if (active) setSeatsLoading(false)
      }
    }

    void loadSeats()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload on session/movie change
  }, [selectedSessionId, scheduleStart, startBooking, movieId, resolvedMovie])

  // Atualiza ocupação (vendidos + holds de outras pessoas) enquanto o mapa está aberto.
  useEffect(() => {
    if (!selectedSessionId) return

    let active = true

    async function refreshOccupied() {
      try {
        const occupiedIds = await fetchOccupiedSeatIds(
          selectedSessionId,
          holderKeyRef.current,
        )
        if (!active) return
        setOccupiedSeatIds(occupiedIds)
      } catch {
        // ignore
      }
    }

    const intervalId = window.setInterval(refreshOccupied, 2500)
    const onFocus = () => {
      void refreshOccupied()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      active = false
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
    }
  }, [selectedSessionId])

  // Renova o hold dos assentos selecionados para não expirar no checkout.
  useEffect(() => {
    if (!selectedSessionId || selectedSeats.length === 0) return

    const seatIds = selectedSeats.map((seat) => seat.id)

    async function renew() {
      try {
        const result = await refreshSeatHolds({
          sessionId: selectedSessionId,
          seatIds,
          holderKey: holderKeyRef.current,
        })
        if (result.expiresAt) setHoldExpiresAt(result.expiresAt)
      } catch {
        // ignore — checkout ainda valida
      }
    }

    void renew()
    const intervalId = window.setInterval(renew, 60_000)
    return () => window.clearInterval(intervalId)
  }, [selectedSessionId, selectedSeats])

  useEffect(() => {
    if (selectedSeats.length === 0) {
      setHoldExpiresAt(null)
      setHoldMsLeft(0)
      return
    }
    if (!holdExpiresAt) return

    function tick() {
      const left = new Date(holdExpiresAt!).getTime() - Date.now()
      setHoldMsLeft(left)
      if (left <= 0) {
        clearSeats()
        setHoldExpiresAt(null)
        setError('O tempo de reserva dos assentos expirou. Selecione novamente.')
      }
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [holdExpiresAt, selectedSeats.length, clearSeats])

  // Se o assento selecionado foi vendido/holdado por outro, remove da seleção.
  useEffect(() => {
    if (selectedSeats.length === 0 || occupiedSeatIds.length === 0) return
    const occupied = new Set(occupiedSeatIds.map(String))
    if (selectedSeats.some((seat) => occupied.has(String(seat.id)))) {
      clearSeats()
      setError('Um dos assentos selecionados acabou de ser reservado. Escolha outros.')
    }
  }, [occupiedSeatIds, selectedSeats, clearSeats])

  const selectedIds = useMemo(
    () => new Set(selectedSeats.map((s) => s.id)),
    [selectedSeats],
  )

  const seatsByRow = useMemo(() => groupSeatsByRow(seatMap), [seatMap])

  async function handleSeatClick(seat: Seat) {
    if (seat.status === 'unavailable' || holdingSeatId) return
    if (!selectedSessionId) return

    const holderKey = holderKeyRef.current
    const alreadySelected = selectedIds.has(seat.id)

    setHoldingSeatId(seat.id)
    setError(null)

    try {
      if (alreadySelected) {
        try {
          await releaseSeatHold({
            sessionId: selectedSessionId,
            seatId: seat.id,
            holderKey,
          })
        } catch {
          // still deselect locally
        }
        toggleSeat(seat)
        if (selectedSeats.length <= 1) setHoldExpiresAt(null)
      } else {
        if (selectedSeats.length >= 6) {
          setError('Você pode selecionar no máximo 6 assentos.')
          return
        }
        const held = await holdSeat({
          sessionId: selectedSessionId,
          seatId: seat.id,
          holderKey,
        })
        setHoldExpiresAt(held.expiresAt)
        toggleSeat(seat)
        // Refresh so other tabs see this seat as taken soon.
        void fetchOccupiedSeatIds(selectedSessionId, holderKey).then(
          setOccupiedSeatIds,
        )
      }
    } catch (err) {
      const message =
        err instanceof AppApiError
          ? err.message
          : 'Não foi possível reservar este assento. Tente outro.'
      setError(message)
      try {
        const occupiedIds = await fetchOccupiedSeatIds(
          selectedSessionId,
          holderKey,
        )
        setOccupiedSeatIds(occupiedIds)
      } catch {
        // ignore
      }
    } finally {
      setHoldingSeatId(null)
    }
  }

  function seatClass(seat: Seat) {
    if (seat.status === 'unavailable') {
      return 'seat cursor-not-allowed bg-surface-variant opacity-40'
    }
    if (selectedIds.has(seat.id)) {
      return 'seat selected text-white'
    }
    if (seat.status === 'vip') {
      return 'seat available vip border border-secondary'
    }
    if (seat.status === 'premium') {
      return 'seat available premium border border-primary/50'
    }
    return 'seat available basic border border-white/20 bg-surface-container'
  }

  function handleProceed() {
    if (selectedSeats.length === 0) return
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout')
      return
    }
    navigate('/checkout')
  }

  const displayMovie = movie ?? resolvedMovie
  const displaySession =
    session ?? sessions.find((item) => item.id === selectedSessionId) ?? null

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-[1440px] items-center justify-center px-5">
        <p className="text-body-lg text-on-surface-variant">Carregando sessão…</p>
      </main>
    )
  }

  if (error && !displayMovie) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-[1440px] flex-col items-center justify-center gap-4 px-5">
        <p className="text-body-lg text-primary">{error}</p>
        <Link to="/" className="text-label-md text-on-surface-variant underline">
          Voltar aos filmes
        </Link>
      </main>
    )
  }

  if (!displayMovie || !displaySession) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-[1440px] items-center justify-center px-5">
        <p className="text-body-lg text-primary">Sessão não encontrada.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-grow flex-col gap-12 px-5 py-8 md:px-container-margin md:py-12">
      <header className="relative z-10 flex flex-col justify-between gap-6 border-b border-white/5 pb-8 md:flex-row md:items-end">
        <div className="flex flex-col gap-2">
          <Link
            to={`/filme/${displayMovie.id}`}
            className="mb-2 inline-flex items-center gap-2 text-label-md text-primary transition-colors hover:text-primary-container"
          >
            <Icon name="arrow_back" className="text-[20px]" />
            Voltar ao filme
          </Link>
          <h1 className="text-headline-lg-mobile text-on-background md:text-headline-lg">
            {displayMovie.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-body-md text-on-surface-variant">
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-200">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-caption">Mapa ao vivo</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-white/5 bg-surface-container px-3 py-1">
              <Icon name="calendar_month" className="text-[18px]" />
              <span>{displaySession.dateLabel}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-white/5 bg-surface-container px-3 py-1">
              <Icon name="schedule" className="text-[18px]" />
              <span>{displaySession.time}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-white/5 bg-surface-container px-3 py-1">
              <Icon name="theaters" className="text-[18px]" />
              <span>
                {displaySession.cinema} • {displaySession.room}
              </span>
            </div>
          </div>
        </div>

        {sessions.length > 1 && (
          <div className="flex max-w-full flex-wrap gap-2">
            {sessions.slice(0, 8).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedSessionId(item.id)}
                className={`rounded-full px-4 py-2 text-label-md transition-colors ${
                  item.id === selectedSessionId
                    ? 'bg-primary text-white'
                    : 'border border-white/10 text-on-surface-variant hover:border-primary/40 hover:text-primary'
                }`}
              >
                {item.time} · {item.date}
              </button>
            ))}
          </div>
        )}
      </header>

      {selectedSeats.length > 0 && holdMsLeft > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
          <p className="text-body-md text-primary">
            Assentos reservados para você por 10 minutos.
          </p>
          <p className="inline-flex items-center gap-2 text-label-md text-white">
            <Icon name="timer" className="text-[18px] text-primary" />
            {formatHoldCountdown(holdMsLeft)}
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-body-md text-primary">
          {error}
        </p>
      )}

      <div className="relative z-10 grid grid-cols-1 gap-gutter lg:grid-cols-12">
        <div className="flex flex-col gap-8 lg:col-span-8">
          <div className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-white/8 bg-surface-container-low p-4 md:p-8">
            <div className="relative mb-12 flex w-3/4 max-w-lg flex-col items-center md:mb-16">
              <div className="h-8 w-full rounded-[100%] border-t-4 border-primary/35" />
              <span className="mt-4 text-label-md tracking-[0.2em] text-on-surface-variant uppercase">
                Tela
              </span>
            </div>

            {seatsLoading ? (
              <p className="py-16 text-body-md text-on-surface-variant">Carregando assentos…</p>
            ) : (
              <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 overflow-x-auto">
                {seatsByRow.map(({ row, seats }) => (
                  <div key={row} className="flex items-center gap-2 md:gap-4">
                    <span className="w-4 text-center text-label-md text-on-surface-variant">
                      {row}
                    </span>
                    <div className="flex justify-center gap-1.5 md:gap-2">
                      {seats.map((seat, index) => (
                        <div key={seat.id} className="contents">
                          {(index === 2 || index === 8) && (
                            <div className="w-2 md:w-4" aria-hidden />
                          )}
                          <button
                            type="button"
                            disabled={
                              seat.status === 'unavailable' ||
                              holdingSeatId === seat.id
                            }
                            onClick={() => void handleSeatClick(seat)}
                            className={`flex h-7 w-7 items-center justify-center rounded-t-lg rounded-b-sm md:h-8 md:w-8 ${seatClass(seat)}`}
                            aria-label={`Assento ${seat.number}`}
                            aria-pressed={selectedIds.has(seat.id)}
                          >
                            {seat.status === 'unavailable' ? (
                              <Icon name="close" className="text-[14px]" />
                            ) : (
                              <span
                                className={`text-[10px] ${
                                  selectedIds.has(seat.id) ? 'font-bold' : 'text-white/50'
                                }`}
                              >
                                {seat.number}
                              </span>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                    <span className="w-4 text-center text-label-md text-on-surface-variant">
                      {row}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-6 rounded-xl border border-white/5 bg-surface-container/30 p-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-t-md rounded-b-sm bg-primary-container" />
              <span className="text-caption text-on-surface-variant">Selecionado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-t-md rounded-b-sm bg-surface-variant opacity-50">
                <Icon name="close" className="text-[10px]" />
              </div>
              <span className="text-caption text-on-surface-variant">Indisponível</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-t-md rounded-b-sm border border-white/20 bg-surface-container" />
              <span className="text-caption text-on-surface-variant">
                {TICKET_LABELS.basic} ({formatMoney(TICKET_PRICES.basic)})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-t-md rounded-b-sm border border-primary/50 bg-primary/15" />
              <span className="text-caption text-primary">
                {TICKET_LABELS.premium} ({formatMoney(TICKET_PRICES.premium)})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-t-md rounded-b-sm border border-secondary bg-secondary/20" />
              <span className="text-caption text-secondary">
                {TICKET_LABELS.vip} ({formatMoney(TICKET_PRICES.vip)})
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="sticky top-28 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface-container-high/60 shadow-xl backdrop-blur-2xl">
            <div className="relative h-24 overflow-hidden bg-surface-container">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{
                  backgroundImage: `url('${displayMovie.backdrop ?? displayMovie.poster}')`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high/60 to-transparent" />
            </div>

            <div className="relative z-10 -mt-8 flex flex-col gap-6 p-card-padding">
              <h2 className="text-headline-md text-white drop-shadow-md">Resumo</h2>

              <div className="flex flex-col gap-3">
                <h3 className="text-label-md text-on-surface-variant">
                  Assentos selecionados ({selectedSeats.length})
                </h3>
                {selectedSeats.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-white/10 p-4 text-caption text-on-surface-variant">
                    Selecione assentos no mapa para continuar.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedSeats.map((seat) => (
                      <div
                        key={seat.id}
                        className="flex items-center justify-between rounded-lg border border-white/5 bg-surface-container/50 p-3 transition-colors hover:border-primary/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                            {seat.row}
                            {seat.number}
                          </div>
                          <span className="text-body-md text-on-background">{seat.label}</span>
                        </div>
                        <span className="text-body-md font-semibold text-white">
                          {formatMoney(seat.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="my-2 h-px w-full bg-white/10" />

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-body-md text-on-surface-variant">
                  <span>Subtotal</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-body-md text-on-surface-variant">
                  <span>Taxa de serviço</span>
                  <span>{formatMoney(serviceFee)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-headline-md text-primary">
                  <span>Total</span>
                  <span>{formatMoney(total)}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={selectedSeats.length === 0}
                onClick={handleProceed}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container py-4 text-label-md tracking-wider text-white uppercase transition-all duration-300 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
              >
                Ir para o pagamento
                {!isAuthenticated && selectedSeats.length > 0 ? ' (login)' : ''}
                <Icon name="arrow_forward" className="text-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
