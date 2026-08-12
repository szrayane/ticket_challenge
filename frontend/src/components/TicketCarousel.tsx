import { useEffect, useState } from 'react'
import type { CustomerTicket } from '../types'
import { Icon } from './Icon'
import { TicketQrCard } from './TicketQrCard'

interface TicketCarouselProps {
  tickets: CustomerTicket[]
  variant?: 'default' | 'success'
  showDetails?: boolean
  onCancel?: (ticketId: string) => Promise<void>
}

export function TicketCarousel({
  tickets,
  variant = 'default',
  showDetails = true,
  onCancel,
}: TicketCarouselProps) {
  const [index, setIndex] = useState(0)
  const count = tickets.length
  const isSuccess = variant === 'success'

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(count - 1, 0)))
  }, [count])

  function goTo(next: number) {
    setIndex(Math.min(Math.max(next, 0), count - 1))
  }

  if (count === 0) return null

  if (count === 1) {
    return (
      <TicketQrCard
        ticket={tickets[0]}
        compact
        variant={variant}
        showDetails={showDetails}
        onCancel={onCancel}
      />
    )
  }

  const ticket = tickets[index]

  if (isSuccess) {
    return (
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index <= 0}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-surface-container text-on-surface transition-colors hover:bg-white/10 disabled:opacity-30"
            aria-label="Ingresso anterior"
          >
            <Icon name="chevron_left" />
          </button>
          <p className="text-caption text-on-surface-variant">
            Ingresso {index + 1} de {count}
          </p>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index >= count - 1}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-surface-container text-on-surface transition-colors hover:bg-white/10 disabled:opacity-30"
            aria-label="Próximo ingresso"
          >
            <Icon name="chevron_right" />
          </button>
        </div>

        <TicketQrCard
          key={ticket.id}
          ticket={ticket}
          compact
          variant="success"
          showDetails={showDetails}
          onCancel={onCancel}
        />

        <div className="flex justify-center gap-2">
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
    )
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-3 overflow-hidden sm:space-y-4">
      <div className="flex items-center justify-between gap-2 px-0.5 sm:hidden">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index <= 0}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-surface-container text-on-surface transition-colors hover:bg-white/10 disabled:opacity-30"
          aria-label="Ingresso anterior"
        >
          <Icon name="chevron_left" />
        </button>
        <p className="text-caption text-on-surface-variant">
          Ingresso {index + 1} de {count}
        </p>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index >= count - 1}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-surface-container text-on-surface transition-colors hover:bg-white/10 disabled:opacity-30"
          aria-label="Próximo ingresso"
        >
          <Icon name="chevron_right" />
        </button>
      </div>

      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index <= 0}
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-surface-container text-on-surface transition-colors hover:bg-white/10 disabled:opacity-30 sm:flex"
          aria-label="Ingresso anterior"
        >
          <Icon name="chevron_left" />
        </button>

        <div className="min-w-0 flex-1 overflow-hidden">
          <TicketQrCard
            key={ticket.id}
            ticket={ticket}
            compact
            showDetails={showDetails}
            onCancel={onCancel}
          />
        </div>

        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index >= count - 1}
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-surface-container text-on-surface transition-colors hover:bg-white/10 disabled:opacity-30 sm:flex"
          aria-label="Próximo ingresso"
        >
          <Icon name="chevron_right" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-3">
        <p className="hidden text-caption text-on-surface-variant sm:block">
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
