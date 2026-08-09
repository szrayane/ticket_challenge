import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { TicketOrderCard } from '../components/TicketOrderCard'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../lib/money'
import {
  groupTicketsByOrder,
  paymentMethodLabel,
} from '../lib/tickets'
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
  const orderId = state?.orderId || order?.orderId
  const totalPaid = order?.totalPaid ?? tickets.reduce((s, t) => s + t.totalPaid, 0)
  const paymentMethod = order?.paymentMethod ?? tickets[0]?.paymentMethod

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-[840px] flex-col items-center justify-center gap-8 px-5 py-section-gap text-center md:px-container-margin">
      <div className="glass-card animate-fade-up flex w-full flex-col items-center gap-6 rounded-xl p-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-white/10 bg-surface-container-high">
          <Icon name="check_circle" className="text-[40px] text-primary" filled />
        </div>
        <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
          Pagamento confirmado
        </h1>
        <p className="max-w-md text-body-lg text-on-surface-variant">
          {tickets.length > 0
            ? 'Seu recibo e os QR Codes já estão vinculados à conta.'
            : 'Pagamento registrado. Entre na sua conta para ver os QR Codes.'}
        </p>

        {orderId && (
          <div className="w-full max-w-md space-y-2 rounded-xl border border-white/10 bg-white/5 p-5 text-left">
            <p className="text-caption tracking-wider text-on-surface-variant uppercase">
              Recibo
            </p>
            <p className="text-headline-md text-on-surface">Pedido {orderId}</p>
            {order && (
              <>
                <p className="text-body-md text-on-surface-variant">
                  {order.movieTitle}
                </p>
                <p className="text-caption text-on-surface-variant">
                  {order.sessionDate} • {order.sessionTime} • {order.room}
                </p>
                <p className="text-caption text-on-surface-variant">
                  Assentos:{' '}
                  {order.tickets.map((t) => t.seatLabel).join(', ')}
                </p>
              </>
            )}
            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-body-md text-on-surface-variant">
                {paymentMethod ? paymentMethodLabel(paymentMethod) : 'Pagamento'}{' '}
                (demo)
              </span>
              <span className="text-headline-md text-primary">
                {formatMoney(totalPaid)}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to={isAuthenticated ? '/conta' : '/'}
            className="rounded-lg bg-neon px-8 py-4 text-label-md text-white uppercase transition-all duration-300"
          >
            {isAuthenticated ? 'Ver na minha conta' : 'Voltar aos filmes'}
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
      </div>

      {orders.length > 0 && (
        <section className="animate-fade-up w-full space-y-4 text-left">
          <h2 className="text-center text-headline-md text-on-surface">
            QR Codes dos ingressos
          </h2>
          <div className="grid gap-4">
            {orders.map((item) => (
              <TicketOrderCard key={item.orderId} order={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
