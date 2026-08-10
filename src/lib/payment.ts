import type { PaymentMethod } from '../types'
import { onlyDigits } from './validation'

export const DEMO_PAYMENT = {
  cpf: '529.982.247-25',
  cardName: 'MARIA SILVA',
  cardNumber: '4111 1111 1111 1111',
  declinedCardNumber: '4000 0000 0000 0002',
  expiry: '12/30',
  cvv: '123',
} as const

export type PaymentSimStatus = 'idle' | 'processing' | 'approved' | 'declined'

export type SimulatePaymentInput = {
  method: PaymentMethod
  amount: number
  cardNumber?: string
  walletId?: string
}

export type SimulatePaymentResult =
  | { ok: true; authorizationId: string }
  | { ok: false; reason: string }

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export async function simulateFictionalPayment(
  input: SimulatePaymentInput,
): Promise<SimulatePaymentResult> {
  const delayByMethod: Record<PaymentMethod, number> = {
    credit_card: 1600,
    wallet: 1800,
    pix: 1400,
  }

  await wait(delayByMethod[input.method])

  if (input.method === 'credit_card') {
    const digits = onlyDigits(input.cardNumber ?? '')
    if (digits === onlyDigits(DEMO_PAYMENT.declinedCardNumber)) {
      return {
        ok: false,
        reason: 'Cartão recusado pela operadora (demo). Use 4111 1111 1111 1111.',
      }
    }
  }

  if (input.method === 'wallet' && !input.walletId) {
    return { ok: false, reason: 'Nenhuma carteira selecionada.' }
  }

  const authorizationId = `AUTH_${input.method.toUpperCase()}_${Date.now().toString(36).toUpperCase()}`
  return { ok: true, authorizationId }
}

export function paymentMethodLabel(method: PaymentMethod) {
  switch (method) {
    case 'credit_card':
      return 'Cartão de crédito'
    case 'wallet':
      return 'Carteira digital'
    case 'pix':
      return 'Pix'
  }
}
