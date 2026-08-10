import { useEffect, useRef, useState } from 'react'
import type { CustomerTicket } from '../types'
import { Icon } from './Icon'
import { TicketQrCard } from './TicketQrCard'

interface TicketCarouselProps {
  tickets: CustomerTicket[]
  onCancel?: (ticketId: string) => Promise<void>
}

export function TicketCarousel({ tickets, onCancel }: TicketCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [index, setIndex] = useState(0)
  const count = tickets.length

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    function onScroll() {
      if (!el) return
      const slide = el.firstElementChild as HTMLElement | null
      const width = slide?.offsetWidth || el.clientWidth
      const next = Math.round(el.scrollLeft / Math.max(width, 1))
      setIndex(Math.min(Math.max(next, 0), count - 1))
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [count])

  function goTo(next: number) {
    const el = scrollerRef.current
    if (!el) return
    const clamped = Math.min(Math.max(next, 0), count - 1)
    const slide = el.children[clamped] as HTMLElement | undefined
    slide?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    setIndex(clamped)
  }

  if (count === 0) return null

  if (count === 1) {
    return (
      <TicketQrCard ticket={tickets[0]} compact onCancel={onCancel} />
    )
  }

  return (
    <div className="w-full space-y-4">
      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Carrossel de ingressos"
        >
          {tickets.map((ticket, i) => (
            <div
              key={ticket.id}
              className="w-[min(100%,420px)] shrink-0 snap-center"
              aria-hidden={i !== index}
            >
              <TicketQrCard ticket={ticket} compact onCancel={onCancel} />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index <= 0}
          className="absolute top-1/2 left-0 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-background/90 text-on-surface shadow-lg backdrop-blur disabled:opacity-30 sm:-left-3 sm:flex"
          aria-label="Ingresso anterior"
        >
          <Icon name="chevron_left" />
        </button>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index >= count - 1}
          className="absolute top-1/2 right-0 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-background/90 text-on-surface shadow-lg backdrop-blur disabled:opacity-30 sm:-right-3 sm:flex"
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
          {tickets.map((ticket, i) => (
            <button
              key={ticket.id}
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
