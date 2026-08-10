import { useState } from 'react'
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
  const [sending, setSending] = useState(false)
  const shareUrl = getShareUrl(ticket)

  async function handleShare() {
    if (!shareUrl) {
      onError?.('Este ingresso ainda não tem link de compartilhamento.')
      return
    }

    setSending(true)
    onError?.('')
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Ingresso ${ticket.movieTitle}`,
          text: `Ingresso CineRay:\n${ticket.movieTitle} • ${ticket.sessionDate} ${ticket.sessionTime} • Assento ${ticket.seatLabel}`,
          url: shareUrl,
        })
        onHint?.('Link enviado. Abra no celular para ver o QR.')
        return
      }

      await navigator.clipboard.writeText(shareUrl)
      onHint?.('Link copiado. Cole no WhatsApp/AirDrop para abrir o QR.')
    } catch (err) {
      if (err instanceof Error && /abort/i.test(err.message)) return
      try {
        await navigator.clipboard.writeText(shareUrl)
        onHint?.('Link copiado. Cole no WhatsApp para abrir o QR.')
      } catch {
        onError?.('Não foi possível compartilhar. Copie o link manualmente.')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-w-0 space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-caption leading-snug text-on-surface-variant">
        Compartilhe o link do ingresso para abrir o QR em outro aparelho.
      </p>
      <button
        type="button"
        disabled={sending || !shareUrl}
        onClick={() => {
          void handleShare()
        }}
        className="inline-flex w-full min-w-0 items-center justify-center gap-1 rounded-lg border border-white/15 px-3 py-2.5 text-caption leading-tight text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
      >
        <Icon name="share" className="shrink-0 text-[16px]" />
        <span className="min-w-0">{sending ? 'Abrindo…' : 'Compartilhar ingresso'}</span>
      </button>
    </div>
  )
}
