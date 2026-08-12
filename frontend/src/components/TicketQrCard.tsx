import { useRef, useState } from 'react'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import type { CustomerTicket } from '../types'
import { formatMoney } from '../lib/money'
import {
  canCancelTicket,
  isTicketActive,
  isTicketSessionUpcoming,
} from '../lib/tickets'
import { downloadTicketPdf } from '../lib/ticketPdf'
import { Icon } from './Icon'
import { GoogleWalletBadgeButton } from './GoogleWalletBadgeButton'

interface TicketQrCardProps {
  ticket: CustomerTicket
  compact?: boolean
  variant?: 'default' | 'success'
  showDetails?: boolean
  onCancel?: (ticketId: string) => Promise<void>
}

export function TicketQrCard({
  ticket,
  compact = false,
  variant = 'default',
  showDetails = true,
  onCancel,
}: TicketQrCardProps) {
  const [error, setError] = useState<string | null>(null)
  const [shareHint, setShareHint] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const qrWrapRef = useRef<HTMLDivElement | null>(null)

  const active = isTicketActive(ticket)
  const upcoming = isTicketSessionUpcoming(ticket)
  const showQr = active && upcoming
  const isSuccess = variant === 'success'
  const details = showDetails || isSuccess
  const cancellable = Boolean(onCancel) && canCancelTicket(ticket)

  const qrSize = isSuccess ? (compact ? 148 : 176) : compact ? 84 : 112

  function getQrCanvas() {
    return qrWrapRef.current?.querySelector('canvas') || null
  }

  function flashHint(message: string) {
    setError(null)
    setShareHint(message)
    window.setTimeout(() => setShareHint(null), 3000)
  }

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

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(ticket.qrPayload)
      flashHint('Código copiado.')
    } catch {
      setError('Não foi possível copiar. Selecione o código manualmente.')
    }
  }

  async function handleCopyLink() {
    const path =
      ticket.sharePath || (ticket.shareToken ? `/i/${ticket.shareToken}` : '')
    if (!path) {
      setError('Link de compartilhamento indisponível.')
      return
    }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`)
      flashHint('Link do ingresso copiado.')
    } catch {
      setError('Não foi possível copiar o link.')
    }
  }

  async function handleDownloadPdf() {
    const canvas = getQrCanvas()
    if (!canvas) {
      setError('QR indisponível para gerar o PDF.')
      return
    }
    setDownloading(true)
    try {
      await downloadTicketPdf({
        qrCanvas: canvas,
        fileName: `cineray-${ticket.seatLabel}-${ticket.id.slice(-6)}.pdf`,
        ticket: {
          movieTitle: ticket.movieTitle,
          sessionDate: ticket.sessionDate,
          sessionTime: ticket.sessionTime,
          cinema: ticket.cinema,
          room: ticket.room,
          seatLabel: ticket.seatLabel,
          totalPaid: formatMoney(ticket.totalPaid),
          ticketId: ticket.id,
        },
      })
      flashHint('PDF baixado.')
    } catch {
      setError('Não foi possível baixar o PDF.')
    } finally {
      setDownloading(false)
    }
  }

  async function handleShare() {
    const path =
      ticket.sharePath || (ticket.shareToken ? `/i/${ticket.shareToken}` : '')
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
      }
    }

    if (url) {
      try {
        await navigator.clipboard.writeText(url)
        flashHint('Link do ingresso copiado.')
        return
      } catch {
        setError('Não foi possível compartilhar.')
        return
      }
    }

    await handleCopyCode()
  }

  const qrBlock = showQr ? (
    <div
      className={
        isSuccess
          ? 'rounded-2xl bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.35)] ring-1 ring-black/5'
          : compact
            ? 'rounded-md bg-white p-1 shadow-sm'
            : 'rounded-lg bg-white p-1.5 shadow-sm sm:p-2'
      }
    >
      <QRCodeSVG
        value={ticket.qrPayload}
        size={qrSize}
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
    <div
      className={`flex flex-col items-center justify-center gap-1.5 border border-dashed border-white/20 bg-white/5 text-center ${
        isSuccess ? 'rounded-2xl gap-2' : 'rounded-lg'
      }`}
      style={{
        width: qrSize + (isSuccess ? 24 : 12),
        height: qrSize + (isSuccess ? 24 : 12),
      }}
    >
      <Icon
        name={!active ? 'block' : 'schedule'}
        className={`text-on-surface-variant ${isSuccess ? 'text-[28px]' : 'text-[24px]'}`}
      />
      <p
        className={`leading-tight text-on-surface-variant ${
          isSuccess ? 'px-3 text-caption' : 'px-1 text-[10px]'
        }`}
      >
        {!active ? 'QR inválido' : 'Sessão encerrada'}
      </p>
    </div>
  )

  const statusBadges = (
    <>
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
    </>
  )

  const feedback = (
    <>
      {error && (
        <p className="break-words rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-caption text-primary">
          {error}
        </p>
      )}
      {shareHint && (
        <p className="break-words text-caption text-emerald-300 [overflow-wrap:anywhere]">
          {shareHint}
        </p>
      )}
    </>
  )

  const walletHandlers = {
    onHint: (message: string) => flashHint(message),
    onError: (message: string) => {
      if (!message) {
        setError(null)
        return
      }
      setShareHint(null)
      setError(message)
    },
  }

  const actionsRow = showQr ? (
    <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => {
          void handleCopyCode()
        }}
        className="inline-flex items-center gap-1 rounded-lg bg-primary-container/90 px-2.5 py-1.5 text-caption text-white transition-all hover:brightness-110"
      >
        <Icon name="content_copy" className="text-[15px]" />
        Copiar código
      </button>
      <button
        type="button"
        disabled={downloading}
        onClick={() => {
          void handleDownloadPdf()
        }}
        className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-caption text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
      >
        <Icon name="picture_as_pdf" className="text-[15px]" />
        {downloading ? 'Gerando…' : 'Baixar PDF'}
      </button>
      <button
        type="button"
        onClick={() => {
          void handleShare()
        }}
        className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-caption text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
      >
        <Icon name="share" className="text-[15px]" />
        Compartilhar
      </button>
      <button
        type="button"
        onClick={() => {
          void handleCopyLink()
        }}
        className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-caption text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
      >
        <Icon name="link" className="text-[15px]" />
        Copiar link
      </button>
      <div className="min-w-0 shrink">
        <GoogleWalletBadgeButton
          ticketId={ticket.id}
          className="!rounded-lg"
          {...walletHandlers}
        />
      </div>
    </div>
  ) : null

  const cancelUi = cancellable ? (
    <div className="space-y-2">
      {!confirming ? (
        <button
          type="button"
          onClick={() => {
            setError(null)
            setConfirming(true)
          }}
          className="w-full rounded-lg border border-white/15 px-4 py-2 text-caption text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
        >
          Cancelar ingresso
        </button>
      ) : (
        <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="text-caption text-on-surface-variant">
            Cancelar o assento <strong>{ticket.seatLabel}</strong>? O QR deixa de
            valer e o lugar volta a ficar disponível.
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
  ) : null

  if (isSuccess) {
    return (
      <article
        className={`glass-card flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 ${
          !active ? 'opacity-75' : ''
        }`}
      >
        <div className="relative border-b border-white/10 bg-gradient-to-br from-primary-container/35 via-surface-container to-surface-container-low px-4 pb-4 pt-4 sm:px-5 sm:pt-5">
          <div className="flex gap-3">
            {!compact && (
              <img
                src={ticket.moviePoster}
                alt=""
                className="h-[4.5rem] w-12 shrink-0 rounded-md object-cover shadow-md ring-1 ring-white/10"
              />
            )}
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-semibold tracking-[0.2em] text-primary uppercase">
                  CineRay
                </p>
                {statusBadges}
              </div>
              <h3 className="break-words text-xl font-semibold leading-snug text-primary-fixed [overflow-wrap:anywhere] sm:text-headline-md">
                {ticket.movieTitle}
              </h3>
              <p className="break-words text-sm text-on-surface-variant">
                {ticket.sessionDate} · {ticket.sessionTime}
              </p>
              <p className="break-words text-caption text-on-surface-variant">
                {ticket.cinema} · {ticket.room}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end justify-center rounded-xl bg-primary-container px-2.5 py-2 text-center shadow-inner sm:px-3">
              <span className="text-[10px] font-medium tracking-wide text-on-primary-container/80 uppercase">
                Assento
              </span>
              <span className="text-base font-bold leading-none text-white sm:text-lg">
                {ticket.seatLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="relative h-4 bg-surface-container-low" aria-hidden>
          <div className="absolute inset-x-4 top-1/2 border-t border-dashed border-white/15" />
          <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-background" />
          <div className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-background" />
        </div>

        <div className="flex flex-col items-center gap-3 bg-surface-container-low px-4 py-5 sm:px-5">
          {qrBlock}
          <p className="text-center text-caption text-on-surface-variant">
            Mostre este QR na entrada
          </p>
        </div>

        <div className="space-y-3 border-t border-white/10 px-4 py-4 sm:px-5">
          <p className="text-caption text-on-surface-variant">
            {formatMoney(ticket.totalPaid)} ·{' '}
            {new Date(ticket.purchasedAt).toLocaleString('pt-BR')}
          </p>
          {feedback}
          {actionsRow}
          {cancelUi}
        </div>
      </article>
    )
  }

  return (
    <article
      className={`glass-card flex w-full min-w-0 max-w-full flex-col overflow-hidden border border-white/10 ${
        compact ? 'rounded-lg' : 'rounded-xl'
      } ${!active ? 'opacity-75' : ''}`}
    >
      <div className="flex min-w-0 max-w-full flex-col overflow-hidden sm:flex-row">
        <div
          className={`relative flex w-full shrink-0 flex-col items-center justify-center border-b border-white/10 bg-primary-container/20 sm:border-r sm:border-b-0 ${
            compact
              ? 'gap-1.5 px-3 py-3 sm:w-[112px] sm:px-2.5'
              : 'gap-2 px-3 py-4 sm:w-[148px] sm:gap-3 sm:px-3 sm:py-5'
          }`}
        >
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-px"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.22) 1.5px, transparent 1.6px)',
              backgroundSize: '1px 10px',
              backgroundRepeat: 'repeat-y',
              backgroundPosition: 'center',
            }}
            aria-hidden
          />
          <p className="hidden rotate-180 text-[10px] font-semibold tracking-[0.22em] text-primary-fixed/80 uppercase sm:block sm:[writing-mode:vertical-rl]">
            CineRay
          </p>
          {qrBlock}
          <p
            className={`text-center font-semibold tracking-wide text-primary-fixed ${
              compact ? 'text-[10px]' : 'text-[11px]'
            }`}
          >
            {ticket.seatLabel}
          </p>
        </div>

        <div
          className={`flex min-w-0 max-w-full flex-1 flex-col justify-center overflow-hidden ${
            compact ? 'gap-2 p-3 sm:p-3.5' : 'gap-2.5 p-3.5 sm:p-5'
          }`}
        >
          {details ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={`max-w-full break-words text-primary-fixed [overflow-wrap:anywhere] ${
                    compact
                      ? 'text-base font-semibold leading-snug sm:text-lg'
                      : 'text-headline-md'
                  }`}
                >
                  {ticket.movieTitle}
                </h3>
                {statusBadges}
              </div>
              <p className="break-words text-sm text-on-surface-variant">
                {ticket.sessionDate} • {ticket.sessionTime}
              </p>
              <p className="truncate text-caption text-on-surface-variant">
                {ticket.cinema} • {ticket.room} • Assento {ticket.seatLabel}
              </p>
              <p className="text-caption text-on-surface-variant">
                {formatMoney(ticket.totalPaid)} •{' '}
                {new Date(ticket.purchasedAt).toLocaleString('pt-BR')}
              </p>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-label-md text-on-surface">
                Assento {ticket.seatLabel}
              </p>
              {statusBadges}
            </div>
          )}

          {feedback}
          {actionsRow}
          {cancelUi}
        </div>
      </div>
    </article>
  )
}
