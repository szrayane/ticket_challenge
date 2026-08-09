import type { TicketType } from '../types'

export const TICKET_PRICES: Record<TicketType, number> = {
  basic: 28,
  premium: 42,
  vip: 68,
}

export const TICKET_LABELS: Record<TicketType, string> = {
  basic: 'Básico',
  premium: 'Premium',
  vip: 'VIP',
}

export const SERVICE_FEE = 6.5

export function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}
