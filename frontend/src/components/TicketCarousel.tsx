import { useEffect, useState } from 'react'
import type { CustomerTicket } from '../types'
import { Icon } from './Icon'
import { TicketQrCard } from './TicketQrCard'

interface TicketCarouselProps {
  tickets: CustomerTicket[]
  onCancel?: (ticketId: string) => Promise<void>
}

export function TicketCarousel({ tickets, onCancel }: TicketCarouselProps) {
  const [index, setIndex] = useState(0)
  const count = tickets.length

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(count - 1, 0)))
  }, [count])

  function goTo(next: number) {
    setIndex(Math.min(Math.max(next, 0), count - 1))
  }

  if (count === 0) return null

  if (count === 1) {
    return <TicketQrCard ticket={tickets[0]} compact onCancel={onCancel} />
  }

  const ticket = tickets[index]

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index <= 0}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-surface-container text-on-surface transition-colors hover:bg-white/10 disabled:opacity-30"
          aria-label="Ingresso anterior"
        >
          <Icon name="chevron_left" />
        </button>

        <div className="min-w-0 flex-1">
          <TicketQrCard
            key={ticket.id}
            ticket={ticket}
            compact
            onCancel={onCancel}
          />
        </div>

        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index >= count - 1}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-surface-container text-on-surface transition-colors hover:bg-white/10 disabled:opacity-30"
          aria-label="Próximo ingresso"
        >
          <Icon name="chevron_right" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-3">
        <p className="text-caption text-on-surface-variant">
          Ingresso {index + 1} de {count}
        </p>
        <div className="flex gap-2">
          {tickets.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? 'w-6 bg-primary' : 'w-2 bg-white/25 hover:bg-white/40'
              }`}
              aria-label={`Ir para ingresso ${i + 1}`}
              aria-current={i === index}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
