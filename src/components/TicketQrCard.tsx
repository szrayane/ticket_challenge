import { useRef, useState } from 'react'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import type { CustomerTicket } from '../types'
import { formatMoney } from '../lib/money'
import {
  canCancelTicket,
  isTicketActive,
  isTicketSessionUpcoming,
} from '../lib/tickets'
import { Icon } from './Icon'

interface TicketQrCardProps {
  ticket: CustomerTicket
  compact?: boolean
  onCancel?: (ticketId: string) => Promise<void>
}

export function TicketQrCard({
  ticket,
  compact = false,
  onCancel,
}: TicketQrCardProps) {
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareHint, setShareHint] = useState<string | null>(null)
  const qrWrapRef = useRef<HTMLDivElement | null>(null)

  const active = isTicketActive(ticket)
  const upcoming = isTicketSessionUpcoming(ticket)
  const cancellable = Boolean(onCancel) && canCancelTicket(ticket)
  const showQr = active && upcoming

  async function handleConfirmCancel() {
    if (!onCancel) return
    try {
      setCancelling(true)
      setError(null)
      await onCancel(ticket.id)
      setConfirming(false)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível cancelar o ingresso.',
      )
    } finally {
      setCancelling(false)
    }
  }

  function getQrDataUrl() {
    const canvas = qrWrapRef.current?.querySelector('canvas')
    if (!canvas) return null
    return canvas.toDataURL('image/png')
  }

  function handleDownload() {
    const dataUrl = getQrDataUrl()
    if (!dataUrl) {
      setError('QR Code indisponível para download.')
      return
    }
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `cineray-${ticket.seatLabel}-${ticket.id.slice(-6)}.png`
    link.click()
    setShareHint('QR baixado.')
    window.setTimeout(() => setShareHint(null), 2000)
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(ticket.qrPayload)
      setError(null)
      setShareHint('Código copiado — cole na portaria para validar.')
      window.setTimeout(() => setShareHint(null), 3000)
    } catch {
      setError('Não foi possível copiar. Selecione o código abaixo manualmente.')
    }
  }

  async function handleCopyLink() {
    const path = ticket.sharePath || (ticket.shareToken ? `/i/${ticket.shareToken}` : '')
    if (!path) {
      setError('Link de compartilhamento indisponível para este ingresso.')
      return
    }
    const url = `${window.location.origin}${path}`
    try {
      await navigator.clipboard.writeText(url)
      setError(null)
      setShareHint('Link do ingresso copiado.')
      window.setTimeout(() => setShareHint(null), 3000)
    } catch {
      setError('Não foi possível copiar o link.')
    }
  }

  async function handleShare() {
    const path = ticket.sharePath || (ticket.shareToken ? `/i/${ticket.shareToken}` : '')
    const url = path ? `${window.location.origin}${path}` : ''

    if (url && navigator.share) {
      try {
        await navigator.share({
          title: `Ingresso ${ticket.movieTitle}`,
          text: `${ticket.movieTitle} • ${ticket.sessionDate} ${ticket.sessionTime} • Assento ${ticket.seatLabel}`,
          url,
        })
        return
      } catch {
        /* fall through */
      }
    }

    if (url) {
      await handleCopyLink()
      return
    }

    const dataUrl = getQrDataUrl()
    if (!dataUrl) {
      setError('QR Code indisponível para compartilhar.')
      return
    }

    try {
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const file = new File(
        [blob],
        `cineray-${ticket.seatLabel}.png`,
        { type: 'image/png' },
      )

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Ingresso ${ticket.movieTitle}`,
          text: ticket.qrPayload,
          files: [file],
        })
        return
      }

      await handleCopyCode()
    } catch {
      await handleCopyCode()
    }
  }

  return (
    <article
      className={`glass-card flex flex-col gap-4 rounded-xl border border-white/10 p-5 ${
        compact ? '' : 'sm:flex-row sm:items-center'
      } ${!active ? 'opacity-75' : ''}`}
    >
      <div className="mx-auto shrink-0">
        {showQr ? (
          <div className="rounded-xl bg-white p-3">
            <QRCodeSVG
              value={ticket.qrPayload}
              size={compact ? 140 : 160}
              level="M"
              marginSize={1}
              bgColor="#ffffff"
              fgColor="#1a0a12"
              title={`QR Code ingresso ${ticket.seatLabel}`}
            />
            <div className="sr-only" aria-hidden ref={qrWrapRef}>
              <QRCodeCanvas
                value={ticket.qrPayload}
                size={512}
                level="M"
                marginSize={2}
                bgColor="#ffffff"
                fgColor="#1a0a12"
              />
            </div>
          </div>
        ) : (
          <div className="flex h-[164px] w-[164px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 p-4 text-center">
            <Icon
              name={!active ? 'block' : 'schedule'}
              className="text-[32px] text-on-surface-variant"
            />
            <p className="text-caption text-on-surface-variant">
              {!active ? 'QR inválido' : 'Sessão encerrada'}
            </p>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2 text-left">
        <div className="flex items-start gap-3">
          {!compact && (
            <img
              src={ticket.moviePoster}
              alt=""
              className="hidden h-20 w-14 rounded-md object-cover sm:block"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-headline-md text-primary-fixed">
                {ticket.movieTitle}
              </h3>
              {!active && (
                <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-0.5 text-caption text-on-surface-variant">
                  Cancelado
                </span>
              )}
              {active && !upcoming && (
                <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-0.5 text-caption text-on-surface-variant">
                  Encerrado
                </span>
              )}
              {ticket.checkedInAt && (
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-caption text-emerald-300">
                  Validado
                </span>
              )}
            </div>
            <p className="text-body-md text-on-surface-variant">
              {ticket.sessionDate} • {ticket.sessionTime}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-body-md">
          <p className="text-on-surface-variant">
            Assento{' '}
            <span className="font-semibold text-on-surface">{ticket.seatLabel}</span>
          </p>
          <p className="text-on-surface-variant">
            Sala <span className="font-semibold text-on-surface">{ticket.room}</span>
          </p>
          <p className="col-span-2 truncate text-on-surface-variant">
            {ticket.cinema}
          </p>
        </div>

        {ticket.orderId && (
          <p className="text-caption text-on-surface-variant">
            Pedido {ticket.orderId}
          </p>
        )}

        <p className="flex items-center gap-1 text-caption text-on-surface-variant">
          <Icon name="verified_user" className="text-[16px] text-primary" />
          Vinculado a {ticket.userEmail}
        </p>
        <p className="text-caption text-on-surface-variant">
          {formatMoney(ticket.totalPaid)} •{' '}
          {new Date(ticket.purchasedAt).toLocaleString('pt-BR')}
        </p>
        {!active && ticket.cancelledAt && (
          <p className="text-caption text-on-surface-variant">
            Cancelado em {new Date(ticket.cancelledAt).toLocaleString('pt-BR')}
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-caption text-primary">
            {error}
          </p>
        )}
        {shareHint && (
          <p className="text-caption text-emerald-300">{shareHint}</p>
        )}

        {showQr && (
          <div className="space-y-2 pt-1">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleCopyCode()
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-primary-container/90 px-4 py-2 text-caption text-white transition-all hover:brightness-110"
              >
                <Icon name="content_copy" className="text-[16px]" />
                Copiar código
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-4 py-2 text-caption text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Icon name="download" className="text-[16px]" />
                Baixar QR
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleShare()
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-4 py-2 text-caption text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Icon name="share" className="text-[16px]" />
                Compartilhar
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleCopyLink()
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-4 py-2 text-caption text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Icon name="link" className="text-[16px]" />
                Copiar link
              </button>
            </div>
            <p className="break-all rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-[11px] leading-relaxed text-on-surface-variant">
              Token cifrado (AES-GCM): {ticket.qrPayload}
            </p>
          </div>
        )}

        {cancellable && !confirming && (
          <button
            type="button"
            onClick={() => {
              setError(null)
              setConfirming(true)
            }}
            className="mt-1 rounded-lg border border-white/15 px-4 py-2 text-caption text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
          >
            Cancelar ingresso
          </button>
        )}

        {cancellable && confirming && (
          <div className="mt-1 space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-caption text-on-surface-variant">
              Cancelar o assento <strong>{ticket.seatLabel}</strong>? O QR deixa
              de valer e o lugar volta a ficar disponível. O pagamento é demo —
              não há estorno real.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => {
                  void handleConfirmCancel()
                }}
                className="rounded-lg bg-primary-container px-4 py-2 text-caption text-white transition-all hover:brightness-110 disabled:opacity-50"
              >
                {cancelling ? 'Cancelando…' : 'Confirmar cancelamento'}
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-white/15 px-4 py-2 text-caption text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
              >
                Voltar
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
