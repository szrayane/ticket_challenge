import { useEffect, useState } from 'react'
import { AppApiError } from '../api/appClient'
import {
  fetchGoogleWalletSaveUrl,
  fetchGoogleWalletStatus,
} from '../api/auth'

const BADGE_SRC = '/pt_add_to_google_wallet_add-wallet-badge.png'

type GoogleWalletBadgeButtonProps = {
  ticketId: string
  className?: string
  onHint?: (message: string) => void
  onError?: (message: string) => void
}

export function GoogleWalletBadgeButton({
  ticketId,
  className = '',
  onHint,
  onError,
}: GoogleWalletBadgeButtonProps) {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    void fetchGoogleWalletStatus()
      .then((status) => {
        if (active) setConfigured(Boolean(status.configured))
      })
      .catch(() => {
        if (active) setConfigured(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function handleClick() {
    if (busy || configured === false) return
    setBusy(true)
    onError?.('')
    // Abre a aba no clique (antes do await) — senão o Android bloqueia o popup.
    const popup = window.open('about:blank', '_blank')
    try {
      const data = await fetchGoogleWalletSaveUrl(ticketId)
      if (popup && !popup.closed) {
        popup.location.href = data.saveUrl
      } else {
        window.location.assign(data.saveUrl)
      }
      onHint?.(
        'Abrindo Google Wallet… Se a aba não abrir, permita pop-ups neste site.',
      )
    } catch (err) {
      popup?.close()
      const message =
        err instanceof AppApiError
          ? err.message
          : 'Não foi possível gerar o passe do Google Wallet.'
      onError?.(message)
    } finally {
      setBusy(false)
    }
  }

  const disabled = busy || configured === false

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        void handleClick()
      }}
      className={`inline-flex items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      title={
        configured === false
          ? 'Configure GOOGLE_WALLET_* no backend'
          : busy
            ? 'Gerando passe…'
            : 'Adicionar à Carteira do Google'
      }
      aria-label="Adicionar à Carteira do Google"
    >
      <img
        src={BADGE_SRC}
        alt="Adicionar à Carteira do Google"
        className={`h-10 w-auto select-none ${busy ? 'opacity-70' : ''}`}
        draggable={false}
      />
    </button>
  )
}
