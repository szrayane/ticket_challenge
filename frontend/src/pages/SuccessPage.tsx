import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { TicketCarousel } from '../components/TicketCarousel'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../lib/money'
import { groupTicketsByOrder } from '../lib/tickets'
import type { CustomerTicket } from '../types'

interface SuccessLocationState {
  tickets?: CustomerTicket[]
  orderId?: string
}

export function SuccessPage() {
  const location = useLocation()
  const { userTickets, isAuthenticated } = useAuth()
  const state = (location.state as SuccessLocationState | null) ?? null
  const tickets =
    state?.tickets && state.tickets.length > 0
      ? state.tickets
      : userTickets.slice(0, 6)

  const orders = useMemo(() => groupTicketsByOrder(tickets), [tickets])
  const order = orders[0]
  const displayTickets = order?.tickets ?? tickets

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-[440px] flex-col items-center gap-7 overflow-x-hidden px-4 py-10 sm:px-5 md:max-w-[480px] md:py-section-gap">
      <header className="w-full min-w-0 space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10">
          <span className="text-emerald-300" aria-hidden>
            ✓
          </span>
        </div>
        <div className="space-y-1.5">
          <p className="text-caption tracking-[0.18em] text-primary uppercase">
            Pronto
          </p>
          <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
            {displayTickets.length > 1 ? 'Seus ingressos' : 'Seu ingresso'}
          </h1>
        </div>
        {order && (
          <div className="mx-auto max-w-sm space-y-1 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <p className="break-words text-sm font-medium text-on-surface [overflow-wrap:anywhere]">
              {order.movieTitle}
            </p>
            <p className="break-words text-caption text-on-surface-variant [overflow-wrap:anywhere]">
              {order.sessionDate} · {order.sessionTime}
            </p>
            <p className="text-caption text-on-surface-variant">
              {order.tickets.length > 1
                ? `${order.tickets.length} assentos · ${formatMoney(order.totalPaid)}`
                : `Assento ${order.tickets[0]?.seatLabel} · ${formatMoney(order.totalPaid)}`}
            </p>
          </div>
        )}
        {!order && tickets.length === 0 && (
          <p className="text-body-md text-on-surface-variant">
            Entre na sua conta para ver os QR Codes.
          </p>
        )}
      </header>

      {displayTickets.length > 0 && (
        <div className="w-full min-w-0">
          <TicketCarousel tickets={displayTickets} variant="success" />
        </div>
      )}

      <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
        <Link
          to={isAuthenticated ? '/conta' : '/'}
          className="rounded-xl bg-neon px-6 py-3.5 text-center text-label-md text-white uppercase transition-all duration-300 sm:px-8 sm:py-4"
        >
          {isAuthenticated ? 'Minha conta' : 'Voltar aos filmes'}
        </Link>
        {isAuthenticated && (
          <Link
            to="/"
            className="rounded-xl border border-white/15 px-6 py-3.5 text-center text-label-md text-on-surface-variant uppercase transition-colors hover:border-primary/40 hover:text-primary sm:px-8 sm:py-4"
          >
            Mais filmes
          </Link>
        )}
      </div>
    </main>
  )
}
