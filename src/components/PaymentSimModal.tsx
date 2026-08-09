import { useEffect } from 'react'
import { Icon } from './Icon'
import { formatMoney } from '../lib/money'
import { paymentMethodLabel } from '../lib/payment'
import type { PaymentMethod } from '../types'

interface PaymentSimModalProps {
  method: PaymentMethod
  amount: number
  status: 'processing' | 'approved' | 'declined'
  detail?: string
  onCancel: () => void
  onRetry?: () => void
}

export function PaymentSimModal({
  method,
  amount,
  status,
  detail,
  onCancel,
  onRetry,
}: PaymentSimModalProps) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const title = paymentMethodLabel(method)
  const icon =
    method === 'credit_card'
      ? 'credit_card'
      : method === 'pix'
        ? 'qr_code_scanner'
        : 'account_balance_wallet'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Pagamento com ${title}`}
    >
      <div className="w-full max-w-md animate-fade-up overflow-hidden rounded-2xl border border-white/10 bg-background shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Icon name={icon} className="text-headline-md" />
            </span>
            <div>
              <p className="text-label-md text-on-surface-variant">Pagamento demo</p>
              <h2 className="text-body-lg font-semibold text-on-surface">{title}</h2>
            </div>
          </div>
          {status === 'processing' && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
              aria-label="Cancelar pagamento"
            >
              <Icon name="close" className="text-headline-md" />
            </button>
          )}
        </div>

        <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
          {status === 'processing' && (
            <>
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              <div className="space-y-2">
                <p className="text-headline-md text-on-surface">Validando pagamento…</p>
                <p className="text-body-md text-on-surface-variant">
                  Simulando aprovação de{' '}
                  <span className="font-semibold text-primary">{formatMoney(amount)}</span>
                  {detail ? ` (${detail})` : ''}.
                </p>
                <p className="text-caption text-on-surface-variant/80">
                  Sem gateway real — só após aprovar geramos o QR do ingresso.
                </p>
              </div>
            </>
          )}

          {status === 'approved' && (
            <>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Icon name="check_circle" className="text-[40px]" filled />
              </span>
              <div className="space-y-2">
                <p className="text-headline-md text-on-surface">Pagamento aprovado</p>
                <p className="text-body-md text-on-surface-variant">
                  Gerando QR Code vinculado à sua conta…
                </p>
              </div>
            </>
          )}

          {status === 'declined' && (
            <>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Icon name="error" className="text-[40px]" filled />
              </span>
              <div className="space-y-2">
                <p className="text-headline-md text-on-surface">Pagamento recusado</p>
                <p className="text-body-md text-on-surface-variant">
                  {detail || 'A simulação não aprovou este pagamento.'}
                </p>
              </div>
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-lg border border-white/15 px-5 py-2 text-label-md text-on-surface-variant transition-colors hover:bg-white/5"
                >
                  Fechar
                </button>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="rounded-lg bg-neon px-5 py-2 text-label-md text-white"
                  >
                    Tentar de novo
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
