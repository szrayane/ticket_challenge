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
    <main className="mx-auto flex min-h-[70vh] w-full max-w-[520px] flex-col items-center gap-6 px-5 py-section-gap md:px-container-margin">
      <header className="w-full space-y-2 text-center">
        <p className="text-caption tracking-wider text-primary uppercase">
          Pronto
        </p>
        <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
          {displayTickets.length > 1 ? 'Seus ingressos' : 'Seu ingresso'}
        </h1>
        {order && (
          <p className="text-body-md text-on-surface-variant">
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
        <TicketCarousel tickets={displayTickets} />
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          to={isAuthenticated ? '/conta' : '/'}
          className="rounded-lg bg-neon px-8 py-4 text-label-md text-white uppercase transition-all duration-300"
        >
          {isAuthenticated ? 'Minha conta' : 'Voltar aos filmes'}
        </Link>
        {isAuthenticated && (
          <Link
            to="/"
            className="rounded-lg border border-white/15 px-8 py-4 text-label-md text-on-surface-variant uppercase transition-colors hover:border-primary/40 hover:text-primary"
          >
            Mais filmes
          </Link>
        )}
      </div>
    </main>
  )
}
