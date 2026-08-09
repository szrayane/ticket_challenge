export type TicketType = 'basic' | 'premium' | 'vip'

/** `unavailable` = occupied; other values are selectable ticket tiers. */
export type SeatStatus = 'unavailable' | TicketType

export interface Seat {
  id: string
  row: string
  number: number
  status: SeatStatus
  ticketType: TicketType
  price: number
  label: string
}

export interface Movie {
  isActive?: boolean
  id: string
  title: string
  highlight?: string
  synopsis: string
  genre: string
  rating: number
  runtime: string
  badge?: string
  format?: string
  poster: string
  hero?: string
  backdrop?: string
  trailerUrl?: string
  source?: 'cineflex' | 'local'
  isActive?: boolean
}

export interface Session {
  id: string
  movieId: string
  date: string
  dateLabel: string
  time: string
  cinema: string
  room: string
}

export type PaymentMethod = 'credit_card' | 'wallet' | 'pix'

export interface BookingState {
  movie: Movie | null
  session: Session | null
  selectedSeats: Seat[]
  paymentMethod: PaymentMethod
}

export type UserRole = 'cliente' | 'organizador' | 'portaria'

export interface CustomerUser {
  id: string
  email: string
  name: string
  cpf?: string
  role?: UserRole
}

export interface CustomerTicket {
  id: string
  userId: string
  userEmail: string
  movieId: string
  movieTitle: string
  moviePoster: string
  sessionId: string
  sessionDate: string
  sessionTime: string
  cinema: string
  room: string
  seatId: string
  seatLabel: string
  cpf: string
  paymentMethod: PaymentMethod
  qrPayload: string
  purchasedAt: string
  totalPaid: number
  status?: 'active' | 'cancelled'
  cancelledAt?: string
  orderId?: string
  checkedInAt?: string
  checkedInBy?: string
}

export interface TicketOrderGroup {
  orderId: string
  movieTitle: string
  moviePoster: string
  sessionDate: string
  sessionTime: string
  cinema: string
  room: string
  purchasedAt: string
  paymentMethod: PaymentMethod
  tickets: CustomerTicket[]
  totalPaid: number
}
