import { useState } from 'react'
import type { CustomerTicket } from '../types'
import { GoogleWalletBadgeButton } from './GoogleWalletBadgeButton'
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
  const [sendingIphone, setSendingIphone] = useState(false)
  const shareUrl = getShareUrl(ticket)

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
    <div className="min-w-0 max-w-full space-y-2 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-2.5 sm:p-3">
      <p className="text-caption leading-snug text-on-surface-variant">
        Android: Google Wallet · iPhone: envie o link do ingresso
      </p>
      <div className="flex min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="min-w-0 max-w-full shrink">
          <GoogleWalletBadgeButton
            ticketId={ticket.id}
            onHint={onHint}
            onError={onError}
          />
        </div>
        <button
          type="button"
          disabled={sendingIphone || !shareUrl}
          onClick={() => {
            void handleSendToIphone()
          }}
          className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-caption text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50 sm:w-auto"
        >
          <Icon name="phone_iphone" className="text-[16px]" />
          {sendingIphone ? 'Abrindo…' : 'Enviar para iPhone'}
        </button>
      </div>
    </div>
  )
}
