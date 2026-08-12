import type { TicketOrderGroup } from '../types'
import { formatMoney } from '../lib/money'
import { paymentMethodLabel } from '../lib/tickets'
import { Icon } from './Icon'
import { TicketCarousel } from './TicketCarousel'

interface TicketOrderCardProps {
  order: TicketOrderGroup
  onCancel?: (ticketId: string) => Promise<void>
}

export function TicketOrderCard({ order, onCancel }: TicketOrderCardProps) {
  const seats = order.tickets.map((t) => t.seatLabel).join(', ')

  return (
    <section className="glass-card min-w-0 space-y-4 overflow-hidden rounded-xl border border-white/10 p-4 sm:p-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <img
            src={order.moviePoster}
            alt=""
            className="h-24 w-16 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0 space-y-1">
            <h3 className="break-words text-headline-md text-on-surface [overflow-wrap:anywhere]">
              {order.movieTitle}
            </h3>
            <p className="break-words text-body-md text-on-surface-variant">
              {order.sessionDate} • {order.sessionTime}
            </p>
            <p className="truncate text-caption text-on-surface-variant">
              {order.cinema} • {order.room}
            </p>
            <p className="break-words text-caption text-on-surface-variant">
              Assentos: {seats}
            </p>
          </div>
        </div>
        <div className="shrink-0 space-y-1 text-left sm:text-right">
          <p className="text-headline-md text-primary">
            {formatMoney(order.totalPaid)}
          </p>
          <p className="text-caption text-on-surface-variant">
            {paymentMethodLabel(order.paymentMethod)}
          </p>
          <p className="inline-flex items-center gap-1 text-caption text-on-surface-variant">
            <Icon name="receipt_long" className="text-[14px]" />
            {new Date(order.purchasedAt).toLocaleString('pt-BR')}
          </p>
        </div>
      </header>

      <TicketCarousel
        tickets={order.tickets}
        showDetails={false}
        onCancel={onCancel}
      />
    </section>
  )
}
