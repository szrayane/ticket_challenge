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

  function openSaveUrl(saveUrl: string) {
    const popup = window.open(saveUrl, '_blank', 'noopener,noreferrer')
    if (popup) return true

    const anchor = document.createElement('a')
    anchor.href = saveUrl
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    return true
  }

  async function handleClick() {
    if (busy || configured === false) return
    setBusy(true)
    onError?.('')
    try {
      const data = await fetchGoogleWalletSaveUrl(ticketId)
      openSaveUrl(data.saveUrl)
      onHint?.('Google Wallet aberto numa nova aba.')
    } catch (err) {
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
      className={`inline-flex max-w-full shrink items-center justify-center overflow-hidden rounded-lg transition disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
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
        className={`h-9 w-auto max-w-[168px] object-contain object-left select-none sm:h-10 sm:max-w-[200px] ${
          busy ? 'opacity-70' : ''
        }`}
        draggable={false}
      />
    </button>
  )
}
