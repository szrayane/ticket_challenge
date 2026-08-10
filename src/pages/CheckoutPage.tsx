import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Link, useNavigate } from 'react-router-dom'
import { AppApiError } from '../api/appClient'
import { checkSeatsAvailable } from '../api/auth'
import { Icon } from '../components/Icon'
import { PaymentSimModal } from '../components/PaymentSimModal'
import { useAuth } from '../context/AuthContext'
import { useBooking } from '../context/BookingContext'
import { formatMoney } from '../lib/money'
import {
  DEMO_PAYMENT,
  simulateFictionalPayment,
  type PaymentSimStatus,
} from '../lib/payment'
import { buildPixPayload } from '../lib/pix'
import { getHoldClientId } from '../lib/seatHold'
import { buildTicketQrPayload } from '../lib/ticketQr'
import { createOrderId } from '../lib/tickets'
import {
  formatCardExpiry,
  formatCardNumber,
  formatCpf,
  formatCvv,
  isValidCardExpiry,
  isValidCardHolderName,
  isValidCardNumber,
  isValidCpf,
  isValidCvv,
  onlyDigits,
} from '../lib/validation'
import type { CustomerTicket, PaymentMethod } from '../types'

const paymentOptions: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: 'credit_card', label: 'Cartão de crédito', icon: 'credit_card' },
  { id: 'wallet', label: 'Carteira digital', icon: 'account_balance_wallet' },
  { id: 'pix', label: 'Pix / QR Code', icon: 'qr_code_scanner' },
]

const walletProviders = [
  { id: 'apple_pay', label: 'Apple Pay', icon: 'payments' },
  { id: 'google_pay', label: 'Google Pay', icon: 'account_balance_wallet' },
  { id: 'picpay', label: 'PicPay', icon: 'smartphone' },
  { id: 'mercado_pago', label: 'Mercado Pago', icon: 'account_balance' },
]

type FieldErrors = {
  cpf?: string
  cardName?: string
  cardNumber?: string
  expiry?: string
  cvv?: string
  wallet?: string
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, updateProfile, addTickets } = useAuth()
  const {
    movie,
    session,
    selectedSeats,
    paymentMethod,
    setPaymentMethod,
    serviceFee,
    total,
    resetBooking,
  } = useBooking()

  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [cpf, setCpf] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [pixCopied, setPixCopied] = useState(false)
  const [pixUnlocked, setPixUnlocked] = useState(false)
  const [walletId, setWalletId] = useState('')
  const [payStatus, setPayStatus] = useState<PaymentSimStatus>('idle')
  const [payDetail, setPayDetail] = useState<string | undefined>()
  const cancelledRef = useRef(false)
  const completingRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout', { replace: true })
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (completingRef.current) return
    if (!movie || !session || selectedSeats.length === 0) {
      if (isAuthenticated) navigate('/', { replace: true })
    }
  }, [movie, session, selectedSeats.length, navigate, isAuthenticated])

  useEffect(() => {
    if (!user) return
    setCardName((prev) => prev || user.name)
    if (user.cpf) setCpf(formatCpf(user.cpf))
  }, [user])

  useEffect(() => {
    setFieldErrors({})
    setError(null)
    setPayStatus('idle')
    setPayDetail(undefined)
    setPixUnlocked(false)
    cancelledRef.current = false
  }, [paymentMethod])

  const selectedWallet = walletProviders.find((item) => item.id === walletId)
  const seatsLabel = selectedSeats.map((s) => `${s.row}${s.number}`).join(', ')
  const identityReady = isValidCpf(cpf) && isValidCardHolderName(cardName)

  const pixPayload = useMemo(() => {
    if (!movie || !user || selectedSeats.length === 0 || !pixUnlocked) return ''
    return buildPixPayload({
      amount: total,
      movieTitle: movie.title,
      seatsLabel,
      payerName: cardName.trim() || user.name,
      userId: user.id,
    })
  }, [movie, seatsLabel, selectedSeats.length, total, user, pixUnlocked, cardName])

  if (!isAuthenticated || !user || !movie || !session || selectedSeats.length === 0) {
    return null
  }

  function fillDemoData() {
    setCpf(DEMO_PAYMENT.cpf)
    setCardName(DEMO_PAYMENT.cardName)
    setCardNumber(DEMO_PAYMENT.cardNumber)
    setExpiry(DEMO_PAYMENT.expiry)
    setCvv(DEMO_PAYMENT.cvv)
    setFieldErrors({})
    setError(null)
    setPixUnlocked(false)
  }

  function validateForm(): FieldErrors {
    const next: FieldErrors = {}

    if (!isValidCpf(cpf)) next.cpf = 'Informe um CPF válido.'
    if (!isValidCardHolderName(cardName)) next.cardName = 'Informe o nome completo.'

    if (paymentMethod === 'credit_card') {
      if (!isValidCardNumber(cardNumber)) next.cardNumber = 'Número do cartão inválido.'
      if (!isValidCardExpiry(expiry)) next.expiry = 'Validade inválida ou vencida.'
      if (!isValidCvv(cvv)) next.cvv = 'CVV inválido.'
    }

    if (paymentMethod === 'wallet' && !walletId) {
      next.wallet = 'Escolha uma carteira digital.'
    }

    if (paymentMethod === 'pix' && !pixUnlocked) {
      next.cpf = next.cpf || 'Valide seus dados para liberar o Pix.'
    }

    return next
  }

  function unlockPixPayment() {
    const nextErrors: FieldErrors = {}
    if (!isValidCpf(cpf)) nextErrors.cpf = 'Informe um CPF válido.'
    if (!isValidCardHolderName(cardName)) nextErrors.cardName = 'Informe o nome completo.'
    setFieldErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setError('Confira CPF e nome para liberar o QR Code Pix.')
      setPixUnlocked(false)
      return
    }

    setError(null)
    setPixUnlocked(true)
  }

  async function copyPixCode() {
    try {
      await navigator.clipboard.writeText(pixPayload)
      setPixCopied(true)
      window.setTimeout(() => setPixCopied(false), 2000)
    } catch {
      setError('Não foi possível copiar o código Pix.')
    }
  }

  function createTicketsForPurchase(_authorizationId: string): CustomerTicket[] {
    if (!movie || !session || !user) return []

    const purchasedAt = new Date().toISOString()
    const cpfDigits = onlyDigits(cpf)
    const perSeatShare = total / selectedSeats.length
    const orderId = createOrderId()

    return selectedSeats.map((seat, index) => {
      const ticketId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? `tkt_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`
          : `tkt_${Date.now().toString(36)}${index}${Math.random().toString(36).slice(2, 10)}`
      const seatLabel = `${seat.row}${seat.number}`
      return {
        id: ticketId,
        userId: user.id,
        userEmail: user.email,
        movieId: movie.id,
        movieTitle: movie.title,
        moviePoster: movie.poster,
        sessionId: session.id,
        sessionDate: session.dateLabel,
        sessionTime: session.time,
        cinema: session.cinema,
        room: session.room,
        seatId: seat.id,
        seatLabel,
        cpf: cpfDigits,
        paymentMethod,
        purchasedAt,
        totalPaid: perSeatShare,
        status: 'active' as const,
        orderId,
        qrPayload: buildTicketQrPayload(ticketId),
      }
    })
  }

  async function completeBooking(authorizationId: string) {
    if (!user) throw new Error('Login obrigatório')
    if (!session) throw new Error('Sessão inválida')

    completingRef.current = true

    const tickets = createTicketsForPurchase(authorizationId)
    if (tickets.length === 0) {
      completingRef.current = false
      throw new Error('Nenhum ingresso para emitir')
    }

    let savedTickets = tickets
    try {
      savedTickets = await addTickets(tickets, { holderKey: getHoldClientId() })
    } catch (error) {
      completingRef.current = false
      console.warn('[CineRay] Falha ao reservar assentos no banco.', error)
      throw error
    }

    updateProfile({
      name: cardName.trim(),
      cpf: onlyDigits(cpf),
    }).catch((error) => {
      console.warn('[CineRay] Falha ao atualizar perfil no banco.', error)
    })

    navigate('/success', {
      state: { tickets: savedTickets, orderId: savedTickets[0]?.orderId },
    })
    resetBooking()
  }

  async function runFictionalPayment() {
    if (!session) return

    cancelledRef.current = false
    setSubmitted(true)
    setError(null)
    setPayStatus('processing')
    setPayDetail(
      paymentMethod === 'wallet'
        ? selectedWallet?.label
        : paymentMethod === 'credit_card'
          ? 'operadora fictícia'
          : 'confirmação Pix fictícia',
    )

    try {
      await checkSeatsAvailable(
        session.id,
        selectedSeats.map((seat) => seat.id),
        getHoldClientId(),
      )
    } catch (error) {
      if (error instanceof AppApiError && error.status === 409) {
        setPayStatus('declined')
        setPayDetail(error.message)
        setSubmitted(false)
        setError(error.message)
        return
      }
      console.warn('[CineRay] Pré-checagem de assentos falhou; seguindo para reserva.', error)
    }

    if (cancelledRef.current) {
      setSubmitted(false)
      setPayStatus('idle')
      return
    }

    const result = await simulateFictionalPayment({
      method: paymentMethod,
      amount: total,
      cardNumber,
      walletId,
    })

    if (cancelledRef.current) {
      setSubmitted(false)
      setPayStatus('idle')
      return
    }

    if (!result.ok) {
      setPayStatus('declined')
      setPayDetail(result.reason)
      setSubmitted(false)
      setError(result.reason)
      return
    }

    setPayStatus('approved')
    await new Promise((resolve) => window.setTimeout(resolve, 700))

    if (cancelledRef.current) {
      setSubmitted(false)
      setPayStatus('idle')
      return
    }

    try {
      await completeBooking(result.authorizationId)
    } catch (error) {
      const message =
        error instanceof AppApiError
          ? error.message
          : 'Não foi possível reservar os assentos. Tente novamente.'
      setPayStatus('declined')
      setPayDetail(message)
      setSubmitted(false)
      setError(message)
      completingRef.current = false
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!movie || selectedSeats.length === 0 || !user) return

    const nextErrors = validateForm()
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setError('Confira os dados destacados antes de continuar.')
      return
    }

    void runFictionalPayment()
  }

  function cancelPaymentSim() {
    cancelledRef.current = true
    setPayStatus('idle')
    setSubmitted(false)
    setPayDetail(undefined)
  }

  const inputErrorClass = 'border border-primary/50 focus:border-primary'

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-grow flex-col gap-gutter px-5 pt-10 pb-section-gap md:flex-row md:px-container-margin">
      <div className="mb-2 w-full md:hidden">
        <Link
          to={`/seats/${movie.id}`}
          className="flex items-center text-on-surface-variant transition-colors duration-300 hover:text-primary"
        >
          <Icon name="arrow_back" className="mr-2" />
          <span className="text-label-md">Voltar aos assentos</span>
        </Link>
      </div>

      <div className="flex w-full flex-col gap-2 md:w-5/12 lg:w-4/12">
        <Link
          to={`/seats/${movie.id}`}
          className="mb-4 hidden items-center text-on-surface-variant transition-colors duration-300 hover:text-primary md:flex"
        >
          <Icon name="arrow_back" className="mr-2 cursor-pointer" />
          <span className="cursor-pointer text-label-md">Voltar</span>
        </Link>

        <h1 className="mb-2 text-headline-lg-mobile text-on-surface md:text-headline-lg">
          Pagamento
        </h1>

        <div className="mb-2 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-caption text-on-surface">
          <Icon name="verified_user" className="text-primary" />
          Conta: {user.email} — QR do ingresso só após aprovação fictícia
        </div>

        <div className="glass-card flex flex-col gap-6 rounded-xl p-card-padding">
          <div className="flex gap-4">
            <div className="h-36 w-24 shrink-0 overflow-hidden rounded-lg shadow-[0px_0px_10px_rgba(45,0,20,0.5)]">
              <img
                className="h-full w-full object-cover"
                src={movie.poster}
                alt={movie.title}
              />
            </div>
            <div className="flex min-w-0 flex-col justify-center">
              <h2 className="mb-1 break-words text-headline-md text-primary-fixed [overflow-wrap:anywhere]">
                {movie.title}
              </h2>
              <p className="mb-2 break-words text-body-md text-on-surface-variant">
                {movie.genre} • {movie.runtime}
              </p>
              <div className="flex flex-wrap gap-2">
                {movie.format && (
                  <span className="rounded-full bg-secondary-container px-3 py-1 text-label-md text-primary">
                    {movie.format}
                  </span>
                )}
                <span className="rounded-full bg-surface-variant px-3 py-1 text-label-md text-on-surface">
                  Legenda PT
                </span>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-white/10" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-1 text-caption tracking-wider text-on-surface-variant uppercase">
                Data
              </p>
              <p className="break-words text-body-lg text-on-surface">{session.dateLabel}</p>
            </div>
            <div>
              <p className="mb-1 text-caption tracking-wider text-on-surface-variant uppercase">
                Horário
              </p>
              <p className="text-body-lg text-on-surface">{session.time}</p>
            </div>
            <div>
              <p className="mb-1 text-caption tracking-wider text-on-surface-variant uppercase">
                Cinema
              </p>
              <p className="truncate text-body-lg text-on-surface">{session.cinema}</p>
            </div>
            <div>
              <p className="mb-1 text-caption tracking-wider text-on-surface-variant uppercase">
                Assentos
              </p>
              <p className="text-body-lg text-on-surface">{seatsLabel}</p>
            </div>
          </div>

          <div className="h-px w-full bg-white/10" />

          <div className="flex flex-col gap-3">
            {selectedSeats.map((seat) => (
              <div key={seat.id} className="flex items-center justify-between">
                <span className="text-body-md text-on-surface-variant">
                  {seat.label} ({seat.row}
                  {seat.number})
                </span>
                <span className="text-body-md text-on-surface">{formatMoney(seat.price)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <span className="text-body-md text-on-surface-variant">Taxa de conveniência</span>
              <span className="text-body-md text-on-surface">{formatMoney(serviceFee)}</span>
            </div>
          </div>

          <div className="mt-2 flex items-end justify-between border-t border-white/20 pt-4">
            <span className="text-headline-md text-on-surface">Total</span>
            <span className="text-headline-lg font-extrabold text-primary">
              {formatMoney(total)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2 md:w-7/12 md:pt-14 lg:w-8/12">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="glass-card flex flex-grow flex-col gap-6 rounded-xl p-card-padding"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h3 className="text-headline-md text-on-surface">Forma de pagamento</h3>
            <button
              type="button"
              onClick={fillDemoData}
              className="shrink-0 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-caption text-primary transition-colors hover:bg-primary/20"
            >
              Preencher dados de teste
            </button>
          </div>

          <p className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-caption text-on-surface-variant">
            Demo: validamos o formulário e simulamos a aprovação. Cartão teste{' '}
            <span className="text-on-surface">4111 1111 1111 1111</span> — recusado:{' '}
            <span className="text-on-surface">4000 0000 0000 0002</span>. CPF exemplo:{' '}
            <span className="text-on-surface">{DEMO_PAYMENT.cpf}</span>.
          </p>

          {error && payStatus !== 'declined' && (
            <p className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-body-md text-primary">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {paymentOptions.map((option) => {
              const checked = paymentMethod === option.id
              return (
                <label key={option.id} className="cursor-pointer">
                  <input
                    type="radio"
                    name="payment_method"
                    value={option.id}
                    checked={checked}
                    onChange={() => setPaymentMethod(option.id)}
                    className="peer sr-only"
                  />
                  <div
                    className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                      checked
                        ? 'border-primary bg-primary/10'
                        : 'border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <Icon
                      name={option.icon}
                      className={`text-3xl ${checked ? 'text-primary' : 'text-on-surface-variant'}`}
                    />
                    <span className="text-center text-label-md">{option.label}</span>
                  </div>
                </label>
              )
            })}
          </div>

          <div>
            <label className="mb-1 block text-label-md text-on-surface-variant" htmlFor="cpf">
              CPF
            </label>
            <input
              id="cpf"
              inputMode="numeric"
              autoComplete="off"
              className={`input-dark w-full rounded-lg p-3 text-body-md ${fieldErrors.cpf ? inputErrorClass : ''}`}
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => {
                setCpf(formatCpf(e.target.value))
                setPixUnlocked(false)
                setFieldErrors((prev) => ({ ...prev, cpf: undefined }))
              }}
              maxLength={14}
              aria-invalid={Boolean(fieldErrors.cpf)}
            />
            {fieldErrors.cpf && (
              <p className="mt-1 text-caption text-primary">{fieldErrors.cpf}</p>
            )}
          </div>

          <div>
            <label
              className="mb-1 block text-label-md text-on-surface-variant"
              htmlFor={paymentMethod === 'credit_card' ? 'card-name' : 'full-name'}
            >
              {paymentMethod === 'credit_card' ? 'Nome no cartão' : 'Nome completo'}
            </label>
            <input
              id={paymentMethod === 'credit_card' ? 'card-name' : 'full-name'}
              className={`input-dark w-full rounded-lg p-3 text-body-md ${
                paymentMethod === 'credit_card' ? 'tracking-wider uppercase' : ''
              } ${fieldErrors.cardName ? inputErrorClass : ''}`}
              placeholder={paymentMethod === 'credit_card' ? 'MARIA SILVA' : 'Maria Silva'}
              value={cardName}
              onChange={(e) => {
                setCardName(e.target.value)
                setPixUnlocked(false)
                setFieldErrors((prev) => ({ ...prev, cardName: undefined }))
              }}
              autoComplete={paymentMethod === 'credit_card' ? 'cc-name' : 'name'}
              aria-invalid={Boolean(fieldErrors.cardName)}
            />
            {fieldErrors.cardName && (
              <p className="mt-1 text-caption text-primary">{fieldErrors.cardName}</p>
            )}
          </div>

          {paymentMethod === 'credit_card' && (
            <div className="mt-2 flex animate-fade-in flex-col gap-4">
              <div>
                <label
                  className="mb-1 block text-label-md text-on-surface-variant"
                  htmlFor="card-number"
                >
                  Número do cartão
                </label>
                <div className="relative">
                  <input
                    id="card-number"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    className={`input-dark w-full rounded-lg p-3 pl-10 text-body-md ${fieldErrors.cardNumber ? inputErrorClass : ''}`}
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => {
                      setCardNumber(formatCardNumber(e.target.value))
                      setFieldErrors((prev) => ({ ...prev, cardNumber: undefined }))
                    }}
                    maxLength={23}
                    aria-invalid={Boolean(fieldErrors.cardNumber)}
                  />
                  <Icon
                    name="credit_card"
                    className="absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant"
                  />
                </div>
                {fieldErrors.cardNumber && (
                  <p className="mt-1 text-caption text-primary">{fieldErrors.cardNumber}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="mb-1 block text-label-md text-on-surface-variant"
                    htmlFor="card-expiry"
                  >
                    Validade
                  </label>
                  <input
                    id="card-expiry"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    className={`input-dark w-full rounded-lg p-3 text-body-md ${fieldErrors.expiry ? inputErrorClass : ''}`}
                    placeholder="MM/AA"
                    value={expiry}
                    onChange={(e) => {
                      setExpiry(formatCardExpiry(e.target.value))
                      setFieldErrors((prev) => ({ ...prev, expiry: undefined }))
                    }}
                    maxLength={5}
                    aria-invalid={Boolean(fieldErrors.expiry)}
                  />
                  {fieldErrors.expiry && (
                    <p className="mt-1 text-caption text-primary">{fieldErrors.expiry}</p>
                  )}
                </div>
                <div>
                  <label
                    className="mb-1 block text-label-md text-on-surface-variant"
                    htmlFor="card-cvv"
                  >
                    CVV
                  </label>
                  <input
                    id="card-cvv"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    className={`input-dark w-full rounded-lg p-3 text-body-md ${fieldErrors.cvv ? inputErrorClass : ''}`}
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => {
                      setCvv(formatCvv(e.target.value))
                      setFieldErrors((prev) => ({ ...prev, cvv: undefined }))
                    }}
                    maxLength={4}
                    aria-invalid={Boolean(fieldErrors.cvv)}
                  />
                  {fieldErrors.cvv && (
                    <p className="mt-1 text-caption text-primary">{fieldErrors.cvv}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'wallet' && (
            <div className="mt-2 animate-fade-in space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-body-md text-on-surface-variant">
                Escolha a carteira. Vamos simular a aprovação de{' '}
                <span className="font-semibold text-primary">{formatMoney(total)}</span> e só então
                gerar o QR do ingresso.
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {walletProviders.map((provider) => {
                  const checked = walletId === provider.id
                  return (
                    <label key={provider.id} className="cursor-pointer">
                      <input
                        type="radio"
                        name="wallet_provider"
                        value={provider.id}
                        checked={checked}
                        onChange={() => {
                          setWalletId(provider.id)
                          setFieldErrors((prev) => ({ ...prev, wallet: undefined }))
                        }}
                        className="peer sr-only"
                      />
                      <div
                        className={`flex items-center gap-3 rounded-lg border p-4 transition-colors ${
                          checked
                            ? 'border-primary bg-primary/10'
                            : 'border-white/10 hover:bg-white/5'
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            checked ? 'bg-primary/20 text-primary' : 'bg-white/5 text-on-surface-variant'
                          }`}
                        >
                          <Icon name={provider.icon} />
                        </span>
                        <span className="text-label-md text-on-surface">{provider.label}</span>
                      </div>
                    </label>
                  )
                })}
              </div>
              {fieldErrors.wallet && (
                <p className="text-caption text-primary">{fieldErrors.wallet}</p>
              )}
            </div>
          )}

          {paymentMethod === 'pix' && (
            <div className="mt-2 flex animate-fade-in flex-col items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-8">
              {!pixUnlocked ? (
                <>
                  <Icon name="lock" className="text-[40px] text-on-surface-variant" />
                  <p className="text-center text-body-md text-on-surface-variant">
                    Confirme CPF e nome para liberar o QR Pix. Depois confirme o pagamento
                    fictício para gerar o ingresso em{' '}
                    <span className="text-primary">{user.email}</span>.
                  </p>
                  <button
                    type="button"
                    onClick={unlockPixPayment}
                    disabled={!identityReady}
                    className="rounded-lg bg-neon px-6 py-3 text-label-md text-white transition-all disabled:opacity-40"
                  >
                    Liberar QR Code Pix
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-xl bg-white p-4">
                    <QRCodeSVG
                      value={pixPayload}
                      size={192}
                      level="M"
                      marginSize={1}
                      bgColor="#ffffff"
                      fgColor="#1a0a12"
                      title="QR Code Pix"
                    />
                  </div>
                  <p className="text-center text-body-md text-on-surface-variant">
                    Escaneie (demo) ou confirme abaixo o pagamento de{' '}
                    <span className="font-semibold text-primary">{formatMoney(total)}</span>.
                  </p>
                  <div className="flex w-full flex-col gap-2">
                    <label className="text-label-md text-on-surface-variant">Pix copia e cola</label>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        className="input-dark min-w-0 flex-1 truncate rounded-lg p-3 text-caption text-on-surface-variant"
                        value={pixPayload}
                        aria-label="Código Pix copia e cola"
                      />
                      <button
                        type="button"
                        onClick={copyPixCode}
                        className="shrink-0 rounded-lg border border-primary/40 bg-primary/10 px-4 text-label-md text-primary transition-colors hover:bg-primary/20"
                      >
                        {pixCopied ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-auto flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 break-words text-caption text-on-surface-variant sm:max-w-[240px]">
              O QR do ingresso só é gerado depois da aprovação fictícia do pagamento.
            </p>
            <button
              type="submit"
              disabled={
                submitted ||
                payStatus === 'processing' ||
                payStatus === 'approved' ||
                (paymentMethod === 'pix' && !pixUnlocked)
              }
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-neon px-6 py-3.5 text-label-md text-white transition-all duration-300 disabled:opacity-50 sm:px-8 sm:py-4"
            >
              {submitted
                ? 'Validando…'
                : paymentMethod === 'pix'
                  ? 'Já paguei — gerar ingresso'
                  : paymentMethod === 'wallet'
                    ? 'Pagar com carteira'
                    : 'Pagar e gerar QR'}
              <Icon
                name={
                  paymentMethod === 'wallet'
                    ? 'account_balance_wallet'
                    : paymentMethod === 'pix'
                      ? 'qr_code_2'
                      : 'check_circle'
                }
              />
            </button>
          </div>
        </form>
      </div>

      {(payStatus === 'processing' ||
        payStatus === 'approved' ||
        payStatus === 'declined') && (
        <PaymentSimModal
          method={paymentMethod}
          amount={total}
          status={payStatus}
          detail={payDetail}
          onCancel={cancelPaymentSim}
          onRetry={() => {
            void runFictionalPayment()
          }}
        />
      )}
    </main>
  )
}
