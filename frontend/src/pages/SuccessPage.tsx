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
    <main className="mx-auto flex min-h-[70vh] w-full max-w-[520px] flex-col items-center gap-6 overflow-x-hidden px-4 py-section-gap sm:px-5 md:px-container-margin">
      <header className="w-full min-w-0 space-y-2 text-center">
        <p className="text-caption tracking-wider text-primary uppercase">
          Pronto
        </p>
        <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
          {displayTickets.length > 1 ? 'Seus ingressos' : 'Seu ingresso'}
        </h1>
        {order && (
          <p className="break-words text-body-md text-on-surface-variant [overflow-wrap:anywhere]">
            {order.movieTitle} · {order.sessionDate} · {order.sessionTime}
            {order.tickets.length > 1
              ? ` · ${order.tickets.length} assentos · ${formatMoney(order.totalPaid)}`
              : ` · Assento ${order.tickets[0]?.seatLabel} · ${formatMoney(order.totalPaid)}`}
          </p>
        )}
        {!order && tickets.length === 0 && (
          <p className="text-body-md text-on-surface-variant">
            Entre na sua conta para ver os QR Codes.
          </p>
        )}
      </header>

      {displayTickets.length > 0 && (
        <div className="w-full min-w-0">
          <TicketCarousel tickets={displayTickets} />
        </div>
      )}

      <div className="flex w-full flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          to={isAuthenticated ? '/conta' : '/'}
          className="rounded-lg bg-neon px-6 py-3.5 text-label-md text-white uppercase transition-all duration-300 sm:px-8 sm:py-4"
        >
          {isAuthenticated ? 'Minha conta' : 'Voltar aos filmes'}
        </Link>
        {isAuthenticated && (
          <Link
            to="/"
            className="rounded-lg border border-white/15 px-6 py-3.5 text-label-md text-on-surface-variant uppercase transition-colors hover:border-primary/40 hover:text-primary sm:px-8 sm:py-4"
          >
            Mais filmes
          </Link>
        )}
      </div>
    </main>
  )
}
