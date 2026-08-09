import { useEffect, useState } from 'react'
import { AppApiError } from '../api/appClient'
import {
  fetchGoogleWalletSaveUrl,
  fetchGoogleWalletStatus,
} from '../api/auth'
import type { CustomerTicket } from '../types'
import { Icon } from './Icon'

type TicketWalletActionsProps = {
  ticket: CustomerTicket
  onHint?: (message: string) => void
  onError?: (message: string) => void
}

function getShareUrl(ticket: CustomerTicket) {
  const path = ticket.sharePath || (ticket.shareToken ? `/i/${ticket.shareToken}` : '')
  return path ? `${window.location.origin}${path}` : ''
}

export function TicketWalletActions({
  ticket,
  onHint,
  onError,
}: TicketWalletActionsProps) {
  const [googleConfigured, setGoogleConfigured] = useState<boolean | null>(null)
  const [addingGoogle, setAddingGoogle] = useState(false)
  const [sendingIphone, setSendingIphone] = useState(false)
  const shareUrl = getShareUrl(ticket)

  useEffect(() => {
    let active = true
    void fetchGoogleWalletStatus()
      .then((status) => {
        if (active) setGoogleConfigured(Boolean(status.configured))
      })
      .catch(() => {
        if (active) setGoogleConfigured(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function handleAddGoogleWallet() {
    setAddingGoogle(true)
    onError?.('')
    try {
      const data = await fetchGoogleWalletSaveUrl(ticket.id)
      window.open(data.saveUrl, '_blank', 'noopener,noreferrer')
      onHint?.(
        'Salvo na Google Wallet. Para o iPhone: use “Enviar para iPhone”.',
      )
    } catch (err) {
      const message =
        err instanceof AppApiError
          ? err.message
          : 'Não foi possível gerar o passe do Google Wallet.'
      onError?.(message)
    } finally {
      setAddingGoogle(false)
    }
  }

  async function handleSendToIphone() {
    if (!shareUrl) {
      onError?.('Este ingresso ainda não tem link de compartilhamento.')
      return
    }

    setSendingIphone(true)
    onError?.('')
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Ingresso ${ticket.movieTitle}`,
          text: `Seu ingresso CineRay (abre o QR no iPhone):\n${ticket.movieTitle} • ${ticket.sessionDate} ${ticket.sessionTime} • Assento ${ticket.seatLabel}`,
          url: shareUrl,
        })
        onHint?.('Link enviado. No iPhone, abra o link para ver o QR.')
        return
      }

      await navigator.clipboard.writeText(shareUrl)
      onHint?.(
        'Link copiado. Cole no WhatsApp/AirDrop e abra no iPhone para ver o QR.',
      )
    } catch (err) {
      if (err instanceof Error && /abort/i.test(err.message)) return
      try {
        await navigator.clipboard.writeText(shareUrl)
        onHint?.(
          'Link copiado. Cole no WhatsApp e abra no iPhone para ver o QR.',
        )
      } catch {
        onError?.('Não foi possível compartilhar. Copie o link manualmente.')
      }
    } finally {
      setSendingIphone(false)
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-caption text-on-surface-variant">
        No Android use a Google Wallet. No iPhone, envie o link do ingresso
        (QR no Safari).
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={addingGoogle || googleConfigured === false}
          onClick={() => {
            void handleAddGoogleWallet()
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-[#1a73e8] px-4 py-2 text-caption text-white transition-all hover:brightness-110 disabled:opacity-50"
          title={
            googleConfigured === false
              ? 'Configure GOOGLE_WALLET_* no backend'
              : 'Salvar QR na Google Wallet'
          }
        >
          <Icon name="account_balance_wallet" className="text-[16px]" />
          {addingGoogle
            ? 'Gerando…'
            : googleConfigured === false
              ? 'Google Wallet (configurar)'
              : 'Adicionar à Google Wallet'}
        </button>
        <button
          type="button"
          disabled={sendingIphone}
          onClick={() => {
            void handleSendToIphone()
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-4 py-2 text-caption text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          <Icon name="phone_iphone" className="text-[16px]" />
          {sendingIphone ? 'Abrindo…' : 'Enviar para iPhone'}
        </button>
      </div>
      {googleConfigured === false && (
        <p className="text-[11px] leading-snug text-on-surface-variant/80">
          Sem credenciais Google: o botão da Wallet fica off; “Enviar para
          iPhone” continua disponível.
        </p>
      )}
    </div>
  )
}
