import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppApiError } from '../api/appClient'
import {
  claimTicketTransfer,
  fetchTransferPreview,
} from '../api/catalog'
import { Icon } from '../components/Icon'
import { useAuth } from '../context/AuthContext'

export function ClaimTransferPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [preview, setPreview] = useState<{
    movieTitle: string
    moviePoster: string
    sessionDate: string
    sessionTime: string
    cinema: string
    room: string
    seatLabel: string
    expiresAt?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      if (!token) return
      try {
        setLoading(true)
        setError(null)
        const data = await fetchTransferPreview(token)
        if (active) setPreview(data.transfer)
      } catch (err) {
        if (active) {
          setPreview(null)
          setError(
            err instanceof AppApiError
              ? err.message
              : 'Link de transferência inválido ou expirado.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [token])

  async function handleClaim() {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/transferir/${encodeURIComponent(token)}`)
      return
    }
    try {
      setClaiming(true)
      setError(null)
      await claimTicketTransfer(token)
      navigate('/conta', { replace: true })
    } catch (err) {
      setError(
        err instanceof AppApiError
          ? err.message
          : 'Não foi possível reivindicar o ingresso.',
      )
    } finally {
      setClaiming(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col justify-center px-5 py-section-gap">
      <p className="mb-2 text-caption uppercase tracking-wider text-on-surface-variant">
        Transferência de ingresso
      </p>
      <h1 className="mb-6 text-headline-lg-mobile text-on-surface md:text-headline-lg">
        Receber ingresso
      </h1>

      {loading ? (
        <p className="text-body-md text-on-surface-variant">Carregando…</p>
      ) : error && !preview ? (
        <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/10 p-6">
          <p className="text-body-lg text-on-surface">{error}</p>
          <Link to="/" className="text-label-md text-primary underline">
            Voltar ao início
          </Link>
        </div>
      ) : preview ? (
        <div className="space-y-5 rounded-xl border border-white/10 bg-surface-container p-6">
          <div className="flex gap-4">
            <img
              src={preview.moviePoster}
              alt=""
              className="h-28 w-20 rounded-lg object-cover"
            />
            <div className="space-y-1">
              <h2 className="text-headline-md text-on-surface">
                {preview.movieTitle}
              </h2>
              <p className="text-body-md text-on-surface-variant">
                {preview.sessionDate} · {preview.sessionTime}
              </p>
              <p className="text-body-md text-on-surface-variant">
                {preview.cinema} · {preview.room} · Assento {preview.seatLabel}
              </p>
            </div>
          </div>

          <p className="text-body-md text-on-surface-variant">
            Ao reivindicar, o QR antigo é invalidado e um novo código é gerado
            para {user?.email || 'sua conta'}.
          </p>

          {error && (
            <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-caption text-primary">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={claiming}
            onClick={() => void handleClaim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neon px-6 py-4 text-label-md text-white disabled:opacity-50"
          >
            <Icon name="handshake" />
            {claiming
              ? 'Transferindo…'
              : isAuthenticated
                ? 'Reivindicar ingresso'
                : 'Entrar para reivindicar'}
          </button>
        </div>
      ) : null}
    </main>
  )
}
