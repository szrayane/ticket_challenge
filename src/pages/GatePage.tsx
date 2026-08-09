import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppApiError } from '../api/appClient'
import {
  fetchGateCheckIns,
  fetchGateSessions,
  validateTicketQr,
  type GateSession,
} from '../api/localCatalog'
import { GateQrScanner } from '../components/GateQrScanner'
import { Icon } from '../components/Icon'
import { RequireRole } from '../components/RequireRole'
import { useAuth } from '../context/AuthContext'
import type { CustomerTicket } from '../types'

type GateResult = {
  ok: boolean
  message: string
  warning?: boolean
  mismatch?: boolean
  ticket?: CustomerTicket
  pendingPayload?: string
}

function GateDashboard() {
  const { user, logout } = useAuth()
  const [payload, setPayload] = useState('')
  const [expectedSessionId, setExpectedSessionId] = useState('')
  const [sessions, setSessions] = useState<GateSession[]>([])
  const [history, setHistory] = useState<CustomerTicket[]>([])
  const [result, setResult] = useState<GateResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const lastScanRef = useRef({ value: '', at: 0 })

  const selectedSession =
    sessions.find((s) => s.sessionId === expectedSessionId) || null

  async function reloadMeta(opts?: { preferAutoSelect?: boolean }) {
    const [nextSessions, nextHistory] = await Promise.all([
      fetchGateSessions(),
      fetchGateCheckIns(40),
    ])
    setSessions(nextSessions)
    setHistory(nextHistory)

    const suggested =
      nextSessions.find((s) => s.suggested) || nextSessions[0] || null

    setExpectedSessionId((current) => {
      if (current && nextSessions.some((s) => s.sessionId === current)) {
        return current
      }
      if (opts?.preferAutoSelect !== false && suggested) {
        return suggested.sessionId
      }
      return ''
    })
  }

  useEffect(() => {
    void reloadMeta({ preferAutoSelect: true }).catch(() => {
      /* keep empty lists */
    })
    const timer = window.setInterval(() => {
      void reloadMeta({ preferAutoSelect: false }).catch(() => undefined)
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const runValidate = useCallback(
    async (raw: string, force = false) => {
      const qrPayload = raw.trim()
      if (!qrPayload) return

      setSubmitting(true)
      setResult(null)
      try {
        const data = await validateTicketQr(qrPayload, {
          expectedSessionId: expectedSessionId || undefined,
          force,
        })
        setResult({
          ok: data.ok,
          message: data.message,
          warning: data.warning,
          ticket: data.ticket,
        })
        setPayload('')
        await reloadMeta().catch(() => undefined)
      } catch (err) {
        if (err instanceof AppApiError) {
          const mismatch = err.code === 'SESSION_MISMATCH'
          setResult({
            ok: false,
            message: err.message,
            mismatch,
            ticket: err.ticket as CustomerTicket | undefined,
            pendingPayload: mismatch ? qrPayload : undefined,
          })
        } else {
          setResult({
            ok: false,
            message: 'Não foi possível validar o QR.',
          })
        }
      } finally {
        setSubmitting(false)
      }
    },
    [expectedSessionId],
  )

  function handleValidate(e: FormEvent) {
    e.preventDefault()
    void runValidate(payload)
  }

  const handleScan = useCallback(
    (value: string) => {
      const now = Date.now()
      if (
        lastScanRef.current.value === value &&
        now - lastScanRef.current.at < 2500
      ) {
        return
      }
      lastScanRef.current = { value, at: now }
      setPayload(value)
      if (!submitting) void runValidate(value)
    },
    [runValidate, submitting],
  )

  return (
    <main className="mx-auto w-full max-w-[860px] px-5 py-section-gap md:px-container-margin">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-caption uppercase tracking-wider text-on-surface-variant">
            Portaria
          </p>
          <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
            Validar ingresso
          </h1>
          <p className="text-body-md text-on-surface-variant">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-full border border-white/15 px-5 py-2.5 text-label-md text-on-surface-variant"
        >
          Sair
        </button>
      </div>

      <section className="glass-card mb-6 space-y-3 rounded-xl p-card-padding">
        <label className="block space-y-1">
          <span className="text-label-md text-on-surface-variant">
            Sessão desta sala (próximas por horário)
          </span>
          <select
            className="glass-input w-full rounded-lg px-4 py-3 text-body-md"
            value={expectedSessionId}
            onChange={(e) => setExpectedSessionId(e.target.value)}
          >
            <option value="">Qualquer sessão — sem alerta de sala</option>
            {sessions.map((session) => {
              const mins = session.minutesFromNow ?? 0
              const when =
                mins === 0
                  ? 'agora'
                  : mins > 0
                    ? `em ${mins} min`
                    : `há ${Math.abs(mins)} min`
              return (
                <option key={session.sessionId} value={session.sessionId}>
                  {session.suggested ? '★ ' : ''}
                  {session.movieTitle} · {session.sessionTime} · {session.room} ·{' '}
                  {when} ({session.checkedIn}/{session.tickets})
                </option>
              )
            })}
          </select>
        </label>
        {sessions.length === 0 ? (
          <p className="text-caption text-on-surface-variant">
            Nenhuma sessão na janela próxima (1h atrás → 3h à frente). Crie uma
            sessão no organizador ou aguarde o horário.
          </p>
        ) : selectedSession ? (
          <p className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-caption text-amber-100">
            Conferindo contra{' '}
            <strong className="text-on-surface">{selectedSession.movieTitle}</strong>{' '}
            · {selectedSession.sessionTime} · {selectedSession.room}
            {typeof selectedSession.minutesFromNow === 'number' && (
              <>
                {' '}
                (
                {selectedSession.minutesFromNow === 0
                  ? 'começando agora'
                  : selectedSession.minutesFromNow > 0
                    ? `começa em ${selectedSession.minutesFromNow} min`
                    : `começou há ${Math.abs(selectedSession.minutesFromNow)} min`}
                )
              </>
            )}
            . Ingressos de outra sessão pedem confirmação.
          </p>
        ) : null}
      </section>

      <form
        onSubmit={handleValidate}
        className="glass-card space-y-4 rounded-xl p-card-padding"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-body-md text-on-surface-variant">
            Escaneie o QR com a câmera ou cole o código do cliente.
          </p>
          <button
            type="button"
            onClick={() => setCameraOn((prev) => !prev)}
            className="rounded-full border border-white/15 px-4 py-2 text-label-md text-on-surface-variant"
          >
            {cameraOn ? 'Fechar câmera' : 'Abrir câmera'}
          </button>
        </div>

        <GateQrScanner enabled={cameraOn} onScan={handleScan} />

        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          placeholder="CINERAY-TICKET|ID:..."
          className="glass-input min-h-28 w-full rounded-lg px-4 py-3 font-mono text-caption text-on-surface"
          required={!cameraOn}
        />
        <button
          type="submit"
          disabled={submitting || !payload.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-neon px-6 py-4 text-label-md text-white disabled:opacity-50"
        >
          <Icon name="qr_code_scanner" />
          {submitting ? 'Validando…' : 'Validar ingresso'}
        </button>
      </form>

      {result && (
        <section
          className={`mt-6 rounded-xl border p-6 ${
            result.ok
              ? result.warning
                ? 'border-amber-400/40 bg-amber-400/10'
                : 'border-emerald-400/40 bg-emerald-400/10'
              : 'border-primary/40 bg-primary/10'
          }`}
        >
          <div className="mb-3 flex items-center gap-2">
            <Icon
              name={
                result.ok
                  ? result.warning
                    ? 'warning'
                    : 'check_circle'
                  : 'error'
              }
              className={
                result.ok
                  ? result.warning
                    ? 'text-amber-200'
                    : 'text-emerald-300'
                  : 'text-primary'
              }
            />
            <h2 className="text-headline-md text-on-surface">{result.message}</h2>
          </div>
          {result.ticket && (
            <div className="space-y-1 text-left text-body-md text-on-surface-variant">
              <p>
                <span className="text-on-surface">{result.ticket.movieTitle}</span>
              </p>
              <p>
                {result.ticket.sessionDate} • {result.ticket.sessionTime}
              </p>
              <p>
                Assento {result.ticket.seatLabel} • {result.ticket.room}
              </p>
              <p>{result.ticket.userEmail}</p>
              {result.ticket.checkedInAt && (
                <p className="text-caption">
                  Check-in:{' '}
                  {new Date(result.ticket.checkedInAt).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          )}
          {result.mismatch && result.pendingPayload && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void runValidate(result.pendingPayload!, true)}
              className="mt-4 rounded-full border border-amber-300/40 bg-amber-400/15 px-5 py-2.5 text-label-md text-amber-100"
            >
              Confirmar check-in mesmo assim
            </button>
          )}
        </section>
      )}

      <section className="mt-8 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-headline-md text-on-surface">Últimos check-ins</h2>
          <button
            type="button"
            onClick={() => void reloadMeta()}
            className="rounded-full border border-white/15 px-3 py-1.5 text-caption text-on-surface-variant"
          >
            Atualizar
          </button>
        </div>
        {history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 p-5 text-body-md text-on-surface-variant">
            Nenhum check-in ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {history.map((ticket) => (
              <li
                key={`${ticket.id}-${ticket.checkedInAt}`}
                className="rounded-xl border border-white/10 px-4 py-3 text-body-md"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-on-surface">{ticket.movieTitle}</p>
                    <p className="text-caption text-on-surface-variant">
                      {ticket.sessionDate} {ticket.sessionTime} · Assento{' '}
                      {ticket.seatLabel} · {ticket.room}
                    </p>
                  </div>
                  <p className="text-caption text-on-surface-variant">
                    {ticket.checkedInAt
                      ? new Date(ticket.checkedInAt).toLocaleString('pt-BR')
                      : '—'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-center text-caption text-on-surface-variant">
        <Link to="/login" className="text-primary underline">
          Trocar usuário
        </Link>
      </p>
    </main>
  )
}

export function GatePage() {
  return (
    <RequireRole roles={['portaria']}>
      <GateDashboard />
    </RequireRole>
  )
}
