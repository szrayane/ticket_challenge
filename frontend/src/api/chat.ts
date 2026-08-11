import { appRequest } from './appClient'

export type ChatUiBlock =
  | {
      type: 'movie_picks'
      movies: Array<{
        id: string
        title: string
        genre?: string
        rating?: number
        poster?: string
        synopsis?: string
        nextSession?: {
          date: string
          time: string
          cinema: string
          price: number
        } | null
      }>
    }
  | {
      type: 'showtimes'
      movie: { id: string; title: string; poster?: string }
      showtimes: Array<{
        id: string
        date: string
        dateLabel?: string
        time: string
        cinema: string
        room: string
        price: number
      }>
    }
  | {
      type: 'seats'
      movieTitle: string
      session: { id: string; date: string; time: string }
      seats: Array<{
        id: string
        label: string
        ticketType: string
        price: number
      }>
    }
  | {
      type: 'pix_payment'
      pendingId: string
      amount: number
      movieTitle: string
      sessionDate: string
      sessionTime: string
      seatsLabel: string
      pixPayload: string
      expiresInMinutes?: number
    }
  | {
      type: 'tickets'
      tickets: Array<{
        id: string
        movieTitle: string
        moviePoster?: string
        sessionDate: string
        sessionTime: string
        seatLabel: string
        cinema: string
        room?: string
        totalPaid: number
        cancellable?: boolean
      }>
    }
  | {
      type: 'cancel_result'
      ticket: {
        id: string
        movieTitle: string
        seatLabel: string
        sessionDate: string
        sessionTime: string
      }
    }
  | {
      type: 'purchase_success'
      orderId: string
      total: number
      tickets: Array<{
        id: string
        movieTitle: string
        seatLabel: string
        sessionDate: string
        sessionTime: string
        sharePath?: string
      }>
    }

export type ChatMessagePayload = {
  role: 'assistant' | 'user'
  content: string
  ui?: ChatUiBlock[]
}

export type ChatMessageResponse = {
  sessionId: string
  holderKey: string
  provider?: string
  message: ChatMessagePayload
  tickets?: unknown[]
  orderId?: string
}

export async function sendChatMessage(input: {
  message: string
  sessionId?: string | null
  holderKey?: string | null
}) {
  return appRequest<ChatMessageResponse>('/chat/message', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({
      message: input.message,
      sessionId: input.sessionId || undefined,
      holderKey: input.holderKey || undefined,
    }),
  })
}

export async function sendChatAction(input: {
  action: string
  sessionId?: string | null
  holderKey?: string | null
  pendingId?: string
  ticketId?: string
  movieId?: string
  movieTitle?: string
  showtimeId?: string
  quantity?: number
}) {
  return appRequest<ChatMessageResponse>('/chat/action', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  })
}
