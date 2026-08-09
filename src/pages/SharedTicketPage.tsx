import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { fetchSharedTicket } from '../api/localCatalog'
import { AppApiError } from '../api/appClient'

export function SharedTicketPage() {
  const { shareToken = '' } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ticket, setTicket] = useState<Awaited<
    ReturnType<typeof fetchSharedTicket>
  >['ticket'] | null>(null)

  useEffect(() => {
    let active = true
    void fetchSharedTicket(shareToken)
      .then((data) => {
        if (!active) return
        setTicket(data.ticket)
      })
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof AppApiError
            ? err.message
            : 'Não foi possível abrir este ingresso.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [shareToken])

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-5">
        <p className="text-body-md text-on-surface-variant">Carregando ingresso…</p>
      </main>
    )
  }

  if (error || !ticket) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-4 px-5 py-section-gap text-center">
        <h1 className="text-headline-md text-on-surface">Link inválido</h1>
        <p className="text-body-md text-on-surface-variant">
          {error || 'Ingresso não encontrado.'}
        </p>
        <Link to="/" className="text-primary underline">
          Voltar ao catálogo
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-md px-5 py-section-gap">
      <p className="mb-2 text-caption uppercase tracking-wider text-on-surface-variant">
        Ingresso compartilhado
      </p>
      <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
        {ticket.movieTitle}
      </h1>
      <p className="mt-2 text-body-md text-on-surface-variant">
        {ticket.sessionDate} • {ticket.sessionTime}
      </p>
      <p className="text-body-md text-on-surface-variant">
        {ticket.cinema} • {ticket.room} • Assento {ticket.seatLabel}
      </p>

      <div className="glass-card mt-6 flex flex-col items-center gap-4 rounded-xl p-card-padding">
        <img
          src={ticket.moviePoster}
          alt=""
          className="h-40 w-28 rounded object-cover"
        />
        <QRCodeSVG value={ticket.qrPayload} size={200} bgColor="#FFFFFF" fgColor="#1A0F14" />
        <p className="text-center text-caption text-on-surface-variant">
          No iPhone, mostre este QR na portaria. No Android, salve na Google
          Wallet pela conta que comprou o ingresso.
        </p>
        <p className="break-all text-center font-mono text-caption text-on-surface-variant">
          {ticket.qrPayload}
        </p>
        {ticket.checkedInAt && (
          <p className="text-caption text-amber-200">
            Já utilizado em{' '}
            {new Date(ticket.checkedInAt).toLocaleString('pt-BR')}
          </p>
        )}
      </div>
    </main>
  )
}
