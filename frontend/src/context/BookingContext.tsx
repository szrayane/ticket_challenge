import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { SERVICE_FEE } from '../lib/money'
import type { Movie, PaymentMethod, Seat, Session } from '../types'

interface BookingContextValue {
  movie: Movie | null
  session: Session | null
  selectedSeats: Seat[]
  paymentMethod: PaymentMethod
  startBooking: (movie: Movie, session: Session) => void
  toggleSeat: (seat: Seat) => void
  clearSeats: () => void
  setPaymentMethod: (method: PaymentMethod) => void
  resetBooking: () => void
  subtotal: number
  serviceFee: number
  total: number
}

const BookingContext = createContext<BookingContextValue | null>(null)

export function BookingProvider({ children }: { children: ReactNode }) {
  const [movie, setMovie] = useState<Movie | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card')

  const startBooking = useCallback((nextMovie: Movie, nextSession: Session) => {
    setMovie(nextMovie)
    setSession(nextSession)
    setSelectedSeats([])
    setPaymentMethod('credit_card')
  }, [])

  const toggleSeat = useCallback((seat: Seat) => {
    if (seat.status === 'unavailable') return

    setSelectedSeats((prev) => {
      const exists = prev.some((s) => s.id === seat.id)
      if (exists) return prev.filter((s) => s.id !== seat.id)
      if (prev.length >= 6) return prev
      return [...prev, seat].sort((a, b) => a.id.localeCompare(b.id))
    })
  }, [])

  const clearSeats = useCallback(() => setSelectedSeats([]), [])

  const resetBooking = useCallback(() => {
    setMovie(null)
    setSession(null)
    setSelectedSeats([])
    setPaymentMethod('credit_card')
  }, [])

  const subtotal = useMemo(
    () => selectedSeats.reduce((sum, seat) => sum + seat.price, 0),
    [selectedSeats],
  )

  const serviceFee = useMemo(
    () => (selectedSeats.length > 0 ? selectedSeats.length * SERVICE_FEE : 0),
    [selectedSeats.length],
  )

  const total = subtotal + serviceFee

  const value = useMemo(
    () => ({
      movie,
      session,
      selectedSeats,
      paymentMethod,
      startBooking,
      toggleSeat,
      clearSeats,
      setPaymentMethod,
      resetBooking,
      subtotal,
      serviceFee,
      total,
    }),
    [
      movie,
      session,
      selectedSeats,
      paymentMethod,
      startBooking,
      toggleSeat,
      clearSeats,
      resetBooking,
      subtotal,
      serviceFee,
      total,
    ],
  )

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}

export function useBooking() {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be used within BookingProvider')
  return ctx
}
