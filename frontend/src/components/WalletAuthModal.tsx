import { useEffect } from 'react'
import { Icon } from './Icon'
import { formatMoney } from '../lib/money'

export type WalletProvider = {
  id: string
  label: string
  icon: string
}

interface WalletAuthModalProps {
  provider: WalletProvider
  amount: number
  status: 'auth' | 'success' | 'error'
  onCancel: () => void
  onRetry?: () => void
}

export function WalletAuthModal({
  provider,
  amount,
  status,
  onCancel,
  onRetry,
}: WalletAuthModalProps) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Pagamento com ${provider.label}`}
    >
      <div className="w-full max-w-md animate-fade-up overflow-hidden rounded-2xl border border-white/10 bg-background shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Icon name={provider.icon} className="text-headline-md" />
            </span>
            <div>
              <p className="text-label-md text-on-surface-variant">Carteira digital</p>
              <h2 className="text-body-lg font-semibold text-on-surface">{provider.label}</h2>
            </div>
          </div>
          {status === 'auth' && (
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
          {status === 'auth' && (
            <>
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              <div className="space-y-2">
                <p className="text-headline-md text-on-surface">Abrindo {provider.label}…</p>
                <p className="text-body-md text-on-surface-variant">
                  Confirme o pagamento de{' '}
                  <span className="font-semibold text-primary">{formatMoney(amount)}</span> no app
                  da carteira.
                </p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              <div className="space-y-2">
                <p className="text-headline-md text-on-surface">Gerando ingresso…</p>
                <p className="text-body-md text-on-surface-variant">
                  Preparando o QR Code da sua conta.
                </p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Icon name="error" className="text-[40px]" filled />
              </span>
              <div className="space-y-2">
                <p className="text-headline-md text-on-surface">Pagamento não concluído</p>
                <p className="text-body-md text-on-surface-variant">
                  A carteira não confirmou o pagamento. Tente novamente.
                </p>
              </div>
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-lg border border-white/15 px-5 py-2 text-label-md text-on-surface-variant transition-colors hover:bg-white/5"
                >
                  Cancelar
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
