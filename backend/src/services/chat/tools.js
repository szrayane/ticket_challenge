import { listMovies, getMovie } from '../movies.service.js'
import {
  listShowtimesForMovie,
  getShowtimeWithMovie,
} from '../showtimes.service.js'
import { holdSeat } from '../seats.service.js'
import {
  listCancellableTicketsForUser,
  cancelTicketForUser,
  createTickets,
} from '../tickets.service.js'
import { buildPixPayload } from './pix.js'
import { createPendingPayment, consumePendingPayment } from './sessions.js'
import { publishSessionSeats, publishOrganizerStats } from '../../realtime/hub.js'

const SERVICE_FEE = 6.5
const MAX_CANCEL_TICKETS_UI = 5

function seatLabel(seat) {
  return `${seat.row}${seat.number}`
}

function foldText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function genreAliases(raw) {
  const g = foldText(raw).trim()
  if (!g) return []
  const map = {
    acao: ['acao'],
    comedia: ['comedia'],
    drama: ['drama'],
    terror: ['terror', 'horror'],
    horror: ['terror', 'horror'],
    aventura: ['aventura'],
    ficcao: ['ficcao'],
    'ficcao cientifica': ['ficcao'],
    romance: ['romance'],
    animacao: ['animacao'],
    suspense: ['suspense', 'thriller'],
    thriller: ['thriller', 'suspense', 'terror'],
    fantasia: ['fantasia'],
    familia: ['familia'],
    misterio: ['misterio', 'suspense'],
  }
  return map[g] || [g]
}

function matchesGenre(movieGenre, wanted) {
  if (!wanted) return true
  const hay = foldText(movieGenre)
  return genreAliases(wanted).some((alias) => hay.includes(alias))
}

function ticketSortKey(ticket) {
  const at = String(ticket.sessionDate || '').match(/(\d{2})\/(\d{2})\/(\d{4})/)
  const [h = '0', m = '0'] = String(ticket.sessionTime || '00:00').split(':')
  if (!at) return Number.POSITIVE_INFINITY
  const [, dd, mm, yyyy] = at
  return new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    Number(h) || 0,
    Number(m) || 0,
  ).getTime()
}

export const TOOL_DECLARATIONS = [
  {
    name: 'search_movies',
    description:
      'Busca filmes ativos no catálogo CineRay por gênero, título, cinema/local, data ou preço. Locais: CineRay Centro, CineRay Norte, CineRay Shopping.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Nome parcial do filme ou texto livre (opcional).',
        },
        genre: {
          type: 'STRING',
          description: 'Gênero desejado, ex: Ação, Drama, Comédia (opcional).',
        },
        cinema: {
          type: 'STRING',
          description:
            'Local/cinema: Centro, Norte, Shopping, ou nome completo CineRay … (opcional).',
        },
        date: {
          type: 'STRING',
          description: 'Data da sessão no formato DD/MM/AAAA (opcional).',
        },
        maxPrice: {
          type: 'NUMBER',
          description: 'Preço máximo do ingresso em reais (opcional).',
        },
        limit: {
          type: 'INTEGER',
          description: 'Máximo de filmes a retornar (padrão 5).',
        },
      },
    },
  },
  {
    name: 'list_showtimes',
    description:
      'Lista sessões futuras disponíveis de um filme (horários, cinema, preço). Pode filtrar por cinema e data.',
    parameters: {
      type: 'OBJECT',
      properties: {
        movieId: {
          type: 'STRING',
          description: 'ID do filme retornado por search_movies.',
        },
        cinema: {
          type: 'STRING',
          description: 'Filtrar por local/cinema (opcional).',
        },
        date: {
          type: 'STRING',
          description: 'Filtrar por data DD/MM/AAAA (opcional).',
        },
        maxPrice: {
          type: 'NUMBER',
          description: 'Preço máximo (opcional).',
        },
      },
      required: ['movieId'],
    },
  },
  {
    name: 'suggest_seats',
    description:
      'Sugere assentos disponíveis em uma sessão. Use quantity para escolher automaticamente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        showtimeId: { type: 'STRING', description: 'ID da sessão.' },
        quantity: {
          type: 'INTEGER',
          description: 'Quantidade de assentos desejada (1–6).',
        },
        preferredType: {
          type: 'STRING',
          description: 'basic, premium ou vip (opcional).',
        },
      },
      required: ['showtimeId'],
    },
  },
  {
    name: 'prepare_pix_purchase',
    description:
      'Reserva assentos e gera cobrança Pix fictícia (QR Code). Só funciona se o usuário estiver autenticado como cliente. Depois o usuário deve confirmar o pagamento no chat.',
    parameters: {
      type: 'OBJECT',
      properties: {
        showtimeId: {
          type: 'STRING',
          description: 'ID da sessão.',
        },
        seatIds: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'IDs dos assentos (ex: st_xxx_s12).',
        },
      },
      required: ['showtimeId', 'seatIds'],
    },
  },
  {
    name: 'list_my_tickets',
    description:
      'Lista ingressos ativos e ainda canceláveis do usuário (status active, sessão futura, sem check-in).',
    parameters: {
      type: 'OBJECT',
      properties: {
        onlyActive: {
          type: 'STRING',
          description: 'Use "true" para só ativos/canceláveis (padrão).',
        },
      },
    },
  },
  {
    name: 'cancel_ticket',
    description:
      'Cancela um ingresso ativo do usuário (somente antes do início da sessão).',
    parameters: {
      type: 'OBJECT',
      properties: {
        ticketId: { type: 'STRING', description: 'ID do ingresso.' },
      },
      required: ['ticketId'],
    },
  },
]

function requireCliente(user) {
  if (!user) {
    return {
      ok: false,
      needsAuth: true,
      message: 'Faça login como cliente para continuar com a compra ou cancelamento.',
    }
  }
  if (String(user.role || '').toLowerCase() !== 'cliente') {
    return {
      ok: false,
      message: 'Apenas contas de cliente podem comprar ou cancelar ingressos.',
    }
  }
  return null
}

export async function executeTool(name, args, ctx) {
  const normalized = normalizeToolArgs(name, args)
  switch (name) {
    case 'search_movies':
      return searchMovies(normalized)
    case 'list_showtimes':
      return listShowtimes(normalized)
    case 'suggest_seats':
      return suggestSeats(normalized)
    case 'prepare_pix_purchase':
      return preparePixPurchase(normalized, ctx)
    case 'list_my_tickets':
      return listMyTicketsTool(ctx)
    case 'cancel_ticket':
      return cancelTicketTool(normalized, ctx)
    default:
      return { ok: false, message: `Ferramenta desconhecida: ${name}` }
  }
}

function asString(value) {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(String).join(' ').trim()
  return String(value).trim()
}

function asInt(value, fallback) {
  const n = Number.parseInt(String(value ?? '').replace(/[^\d-]/g, ''), 10)
  return Number.isFinite(n) ? n : fallback
}

function asNumber(value, fallback = NaN) {
  if (value == null || value === '') return fallback
  const n = Number(String(value).replace(',', '.').replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : fallback
}

function movieSessions(movie) {
  if (Array.isArray(movie.availableSessions) && movie.availableSessions.length) {
    return movie.availableSessions
  }
  if (movie.nextSession) {
    return [
      {
        date: movie.nextSession.date,
        cinema: movie.nextSession.cinema,
        price: movie.nextSession.price,
        time: movie.nextSession.time,
      },
    ]
  }
  return []
}

function resolveCinemaFilter(raw) {
  const original = String(raw || '').trim()
  const p = original
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (!p) return ''
  if (p.includes('shopping') || p.includes('brooklin') || p.includes('nacoes')) {
    return 'CineRay Shopping'
  }
  if (p.includes('norte') || p.includes('guilherme') || p.includes('santana')) {
    return 'CineRay Norte'
  }
  if (p.includes('centro') || p.includes('republica') || p.includes('sao joao')) {
    return 'CineRay Centro'
  }
  const known = ['CineRay Centro', 'CineRay Norte', 'CineRay Shopping']
  const exact = known.find((name) => name.toLowerCase() === p)
  if (exact) return exact
  return ''
}

function sessionMatchesFilters(session, { cinema = '', date = '', maxPrice = NaN } = {}) {
  if (cinema) {
    const want = cinema.toLowerCase()
    const got = String(session.cinema || '').toLowerCase()
    if (got !== want && !got.includes(want) && !want.includes(got)) return false
  }
  if (date && String(session.date || '') !== date) return false
  if (Number.isFinite(maxPrice) && Number(session.price) > maxPrice) return false
  return true
}

function normalizeToolArgs(name, raw = {}) {
  const args = raw && typeof raw === 'object' ? { ...raw } : {}
  delete args._

  if (name === 'search_movies') {
    const query = asString(args.query)
    const genre = asString(args.genre)
    return {
      query,
      genre,
      cinema: resolveCinemaFilter(
        asString(args.cinema || args.place || args.local || args.location),
      ),
      date: asString(args.date || args.sessionDate),
      maxPrice: asNumber(args.maxPrice ?? args.max_price ?? args.price, NaN),
      limit: asInt(args.limit, 5),
      sortByRating: Boolean(genre) || !query,
    }
  }
  if (name === 'list_showtimes') {
    return {
      movieId: asString(args.movieId || args.movie_id),
      cinema: resolveCinemaFilter(
        asString(args.cinema || args.place || args.local || args.location),
      ),
      date: asString(args.date || args.sessionDate),
      maxPrice: asNumber(args.maxPrice ?? args.max_price ?? args.price, NaN),
    }
  }
  if (name === 'suggest_seats') {
    return {
      showtimeId: asString(args.showtimeId || args.showtime_id || args.sessionId),
      quantity: asInt(args.quantity, 1),
      preferredType: asString(args.preferredType || args.preferred_type),
    }
  }
  if (name === 'prepare_pix_purchase') {
    const seatIds = Array.isArray(args.seatIds)
      ? args.seatIds.map(asString).filter(Boolean)
      : asString(args.seatIds)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
    return {
      showtimeId: asString(args.showtimeId || args.showtime_id || args.sessionId),
      seatIds,
    }
  }
  if (name === 'cancel_ticket') {
    return { ticketId: asString(args.ticketId || args.ticket_id || args.id) }
  }
  return args
}

async function searchMovies({
  query = '',
  genre = '',
  cinema = '',
  date = '',
  maxPrice = NaN,
  limit = 5,
  sortByRating = false,
} = {}) {
  const movies = await listMovies({ includeInactive: false })
  const q = foldText(query).trim()
  const g = String(genre || '').trim()
  const max = Math.min(Math.max(Number(limit) || 5, 1), 10)
  const hasSessionFilter =
    Boolean(cinema) || Boolean(date) || Number.isFinite(maxPrice)

  let filtered = movies.filter((movie) => {
    const genreText = String(movie.genre || '')
    const title = foldText(movie.title)
    const matchGenre = matchesGenre(genreText, g)
    const matchQuery =
      !q ||
      title.includes(q) ||
      foldText(genreText).includes(q) ||
      foldText(movie.synopsis).includes(q) ||
      movieSessions(movie).some((session) =>
        foldText(session.cinema).includes(q),
      )
    if (!matchGenre || !matchQuery) return false

    if (hasSessionFilter) {
      const sessions = movieSessions(movie)
      if (!sessions.length) return false
      return sessions.some((session) =>
        sessionMatchesFilters(session, { cinema, date, maxPrice }),
      )
    }
    return true
  })

  if (sortByRating || (!q && !g && !hasSessionFilter)) {
    filtered = [...filtered].sort(
      (a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0),
    )
  }

  const picks = filtered.slice(0, max).map((movie) => {
    const sessions = movieSessions(movie)
    const matched =
      sessions.find((session) =>
        sessionMatchesFilters(session, { cinema, date, maxPrice }),
      ) || movie.nextSession || null
    return {
      id: movie.id,
      title: movie.title,
      genre: movie.genre,
      rating: movie.rating,
      runtime: movie.runtime,
      poster: movie.poster,
      synopsis: String(movie.synopsis || '').slice(0, 180),
      nextSession: matched
        ? {
            date: matched.date,
            time: matched.time || movie.nextSession?.time || '',
            cinema: matched.cinema,
            price: matched.price,
          }
        : null,
    }
  })

  return {
    ok: true,
    count: picks.length,
    totalMatches: filtered.length,
    filters: {
      genre: g || null,
      cinema: cinema || null,
      date: date || null,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : null,
    },
    movies: picks,
    ui: picks.length
      ? {
          type: 'movie_picks',
          movies: picks,
        }
      : null,
  }
}

async function listShowtimes({
  movieId,
  cinema = '',
  date = '',
  maxPrice = NaN,
} = {}) {
  const movie = await getMovie(movieId, { includeInactive: false })
  if (!movie || !movie.isActive) {
    return { ok: false, message: 'Filme não encontrado ou inativo.' }
  }

  const sessions = await listShowtimesForMovie(movieId, {
    onlyUpcoming: true,
    onlyWithAvailability: true,
  })

  const mapped = sessions
    .filter((s) =>
      sessionMatchesFilters(
        { date: s.date, cinema: s.cinema, price: s.price },
        { cinema, date, maxPrice },
      ),
    )
    .slice(0, 12)
    .map((s) => ({
      id: s.id,
      date: s.date,
      dateLabel: s.dateLabel,
      time: s.time,
      cinema: s.cinema,
      room: s.room,
      price: s.price,
      capacity: s.capacity,
    }))

  return {
    ok: true,
    movie: { id: movie.id, title: movie.title, poster: movie.poster },
    showtimes: mapped,
    filters: {
      cinema: cinema || null,
      date: date || null,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : null,
    },
    ui: {
      type: 'showtimes',
      movie: { id: movie.id, title: movie.title, poster: movie.poster },
      showtimes: mapped,
    },
  }
}

async function suggestSeats({ showtimeId, quantity = 1, preferredType } = {}) {
  const qty = Math.min(Math.max(Number(quantity) || 1, 1), 6)
  const data = await getShowtimeWithMovie(showtimeId, { includeInactive: false })
  if (!data) {
    return { ok: false, message: 'Sessão não encontrada.' }
  }

  const preferred = String(preferredType || '').toLowerCase()
  const available = data.seats.filter((s) => s.isAvailable)
  const ranked = [...available].sort((a, b) => {
    const score = (seat) => {
      if (preferred && seat.ticketType === preferred) return 0
      if (seat.ticketType === 'basic') return 1
      if (seat.ticketType === 'premium') return 2
      return 3
    }
    return score(a) - score(b) || a.row.localeCompare(b.row) || a.number - b.number
  })

  const picked = ranked.slice(0, qty)
  if (picked.length < qty) {
    return {
      ok: false,
      message: `Só há ${picked.length} assento(s) disponível(is) nesta sessão.`,
      availableCount: available.length,
    }
  }

  const seats = picked.map((s) => ({
    id: s.id,
    label: seatLabel(s),
    row: s.row,
    number: s.number,
    ticketType: s.ticketType,
    price: s.price,
  }))

  return {
    ok: true,
    movie: { id: data.movie.id, title: data.movie.title },
    session: {
      id: data.session.id,
      date: data.session.date,
      time: data.session.time,
      cinema: data.session.cinema,
      room: data.session.room,
    },
    seats,
    totalSeats: seats.reduce((sum, s) => sum + s.price, 0),
    ui: {
      type: 'seats',
      movieTitle: data.movie.title,
      session: {
        id: data.session.id,
        date: data.session.date,
        time: data.session.time,
      },
      seats,
    },
  }
}

async function preparePixPurchase({ showtimeId, seatIds }, ctx) {
  const authError = requireCliente(ctx.user)
  if (authError) return authError

  const ids = [...new Set((seatIds || []).map((id) => String(id)).filter(Boolean))]
  if (ids.length === 0) {
    return { ok: false, message: 'Informe ao menos um assento.' }
  }

  const data = await getShowtimeWithMovie(showtimeId, { includeInactive: false })
  if (!data) {
    return { ok: false, message: 'Sessão não encontrada.' }
  }

  const byId = new Map(data.seats.map((s) => [s.id, s]))
  const seats = []
  for (const id of ids) {
    const seat = byId.get(id)
    if (!seat) {
      return { ok: false, message: `Assento inválido: ${id}` }
    }
    if (!seat.isAvailable) {
      return {
        ok: false,
        message: `Assento ${seatLabel(seat)} indisponível. Escolha outros.`,
      }
    }
    seats.push(seat)
  }

  const holderKey = ctx.holderKey
  for (const seat of seats) {
    await holdSeat({
      sessionId: showtimeId,
      seatId: seat.id,
      holderKey,
    })
    publishSessionSeats(showtimeId, { action: 'hold', seatId: seat.id })
  }

  const seatsMapped = seats.map((s) => ({
    id: s.id,
    label: seatLabel(s),
    row: s.row,
    number: s.number,
    ticketType: s.ticketType,
    price: s.price,
  }))
  const seatsSubtotal = seatsMapped.reduce((sum, s) => sum + s.price, 0)
  const total = Math.round((seatsSubtotal + SERVICE_FEE) * 100) / 100
  const seatsLabel = seatsMapped.map((s) => s.label).join(', ')

  const pixPayload = buildPixPayload({
    amount: total,
    movieTitle: data.movie.title,
    seatsLabel,
    payerName: ctx.user.name,
    userId: ctx.user.id,
  })

  const pending = createPendingPayment({
    userId: ctx.user.id,
    holderKey,
    movieId: data.movie.id,
    movieTitle: data.movie.title,
    moviePoster: data.movie.poster,
    sessionId: data.session.id,
    sessionDate: data.session.date,
    sessionTime: data.session.time,
    cinema: data.session.cinema,
    room: data.session.room,
    seats: seatsMapped,
    total,
    cpf: ctx.user.cpf || '',
    pixPayload,
  })

  return {
    ok: true,
    pendingId: pending.id,
    total,
    seatsLabel,
    message:
      'QR Pix gerado (pagamento fictício). Peça ao usuário para escanear/copiar e clicar em "Já paguei — confirmar".',
    ui: {
      type: 'pix_payment',
      pendingId: pending.id,
      amount: total,
      movieTitle: data.movie.title,
      sessionDate: data.session.date,
      sessionTime: data.session.time,
      seatsLabel,
      pixPayload,
      expiresInMinutes: 15,
    },
  }
}

async function listMyTicketsTool(ctx) {
  const authError = requireCliente(ctx.user)
  if (authError) return authError

  const active = (await listCancellableTicketsForUser(ctx.user.id)).sort(
    (a, b) => ticketSortKey(a) - ticketSortKey(b),
  )

  const shown = active.slice(0, MAX_CANCEL_TICKETS_UI)

  return {
    ok: true,
    count: active.length,
    shown: shown.length,
    tickets: shown.map((t) => ({
      id: t.id,
      movieTitle: t.movieTitle,
      sessionDate: t.sessionDate,
      sessionTime: t.sessionTime,
      seatLabel: t.seatLabel,
      cinema: t.cinema,
      totalPaid: t.totalPaid,
    })),
    ui: {
      type: 'tickets',
      totalActive: active.length,
      tickets: shown.map((t) => ({
        id: t.id,
        movieTitle: t.movieTitle,
        moviePoster: t.moviePoster,
        sessionDate: t.sessionDate,
        sessionTime: t.sessionTime,
        seatLabel: t.seatLabel,
        cinema: t.cinema,
        room: t.room,
        totalPaid: t.totalPaid,
        cancellable: true,
      })),
    },
  }
}

async function cancelTicketTool({ ticketId }, ctx) {
  const authError = requireCliente(ctx.user)
  if (authError) return authError

  const ticket = await cancelTicketForUser(ctx.user.id, ticketId)
  publishSessionSeats(ticket.sessionId, {
    action: 'cancel',
    seatId: ticket.seatId,
  })
  publishOrganizerStats({ action: 'cancel' })

  return {
    ok: true,
    message: `Ingresso cancelado: ${ticket.movieTitle} — assento ${ticket.seatLabel}.`,
    ticket: {
      id: ticket.id,
      movieTitle: ticket.movieTitle,
      seatLabel: ticket.seatLabel,
      status: ticket.status,
    },
    ui: {
      type: 'cancel_result',
      ticket: {
        id: ticket.id,
        movieTitle: ticket.movieTitle,
        seatLabel: ticket.seatLabel,
        sessionDate: ticket.sessionDate,
        sessionTime: ticket.sessionTime,
      },
    },
  }
}

export async function confirmPendingPixPayment(pendingId, user) {
  const authError = requireCliente(user)
  if (authError) {
    const err = new Error(authError.message)
    err.status = authError.needsAuth ? 401 : 403
    throw err
  }

  const pending = consumePendingPayment(pendingId)
  if (!pending) {
    const err = new Error(
      'Pagamento Pix expirado ou já confirmado. Monte a compra de novo no chat.',
    )
    err.status = 400
    throw err
  }

  if (pending.userId !== user.id) {
    const err = new Error('Este Pix não pertence à sua conta.')
    err.status = 403
    throw err
  }

  const orderId = `ord_chat_${Date.now().toString(36)}`
  const purchasedAt = new Date().toISOString()
  const perSeatFee = SERVICE_FEE / pending.seats.length

  const ticketPayloads = pending.seats.map((seat) => ({
    movieId: pending.movieId,
    movieTitle: pending.movieTitle,
    moviePoster: pending.moviePoster,
    sessionId: pending.sessionId,
    sessionDate: pending.sessionDate,
    sessionTime: pending.sessionTime,
    cinema: pending.cinema,
    room: pending.room,
    seatId: seat.id,
    seatLabel: seat.label,
    cpf: pending.cpf || user.cpf || '',
    paymentMethod: 'pix',
    purchasedAt,
    totalPaid: Math.round((seat.price + perSeatFee) * 100) / 100,
    orderId,
  }))

  const tickets = await createTickets(user, ticketPayloads, {
    holderKey: pending.holderKey,
  })

  publishSessionSeats(pending.sessionId, { action: 'sold' })
  publishOrganizerStats({ action: 'sold' })

  return {
    ok: true,
    orderId,
    total: pending.total,
    tickets: tickets.map((t) => ({
      id: t.id,
      movieTitle: t.movieTitle,
      seatLabel: t.seatLabel,
      sessionDate: t.sessionDate,
      sessionTime: t.sessionTime,
      qrPayload: t.qrPayload,
      sharePath: t.sharePath,
    })),
    ui: {
      type: 'purchase_success',
      orderId,
      total: pending.total,
      tickets: tickets.map((t) => ({
        id: t.id,
        movieTitle: t.movieTitle,
        seatLabel: t.seatLabel,
        sessionDate: t.sessionDate,
        sessionTime: t.sessionTime,
        sharePath: t.sharePath,
      })),
    },
  }
}

export function helpReplyText() {
  return [
    'Posso te ajudar no CineRay:',
    '- Buscar filme por gênero, local (Centro, Norte, Shopping), data ou preço',
    '- Ver horários e sugerir assentos',
    '- Comprar com Pix fictício (login como cliente)',
    '- Listar ou cancelar seus ingressos',
    '',
    'Exemplos: "terror no CineRay Norte", "filmes até 32 no shopping", "meus ingressos".',
  ].join('\n')
}

export function isHelpIntent(message) {
  const t = String(message || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (!t) return false
  if (/^(ajuda|help|socorro|comandos)\??$/.test(t)) return true
  if (/^(me )?(ajuda|ajude|help)\b/.test(t) && t.length <= 48) return true
  if (/o que (voce|vc) (faz|pode)/.test(t)) return true
  if (/como (funciona|usar|comprar)/.test(t) && t.length <= 48) return true
  return false
}

export function isCancelIntent(message) {
  const t = String(message || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (!t) return false
  if (
    /^(cancelamento|cancelar|cancelar ingresso|cancelar ingressos|desistir|reembolso)\??$/.test(
      t,
    )
  ) {
    return true
  }
  if (/^(quero |preciso )?(cancelar|desistir)\b/.test(t) && t.length <= 64) {
    return true
  }
  if (/\bcancel/.test(t) && t.length <= 48) return true
  return false
}

export async function ruleBasedReply(message, ctx) {
  const text = String(message || '').toLowerCase()
  const uiBlocks = []

  if (isHelpIntent(message)) {
    return { text: helpReplyText(), uiBlocks }
  }

  if (isCancelIntent(message) || /cancel|desistir|reembolso/.test(text)) {
    const idMatch = text.match(/\b(tkt_[a-f0-9]+)\b/i)
    if (idMatch) {
      const result = await cancelTicketTool({ ticketId: idMatch[1] }, ctx)
      if (result.ui) uiBlocks.push(result.ui)
      return {
        text: result.message || 'Não foi possível cancelar.',
        uiBlocks,
      }
    }
    const result = await listMyTicketsTool(ctx)
    if (result.ui) uiBlocks.push(result.ui)
    if (result.needsAuth) {
      return {
        text: 'Para cancelar, faça login como cliente e me diga qual ingresso quer cancelar.',
        uiBlocks,
      }
    }
    if (!result.tickets?.length) {
      return {
        text: 'Você não tem ingressos ativos para cancelar.',
        uiBlocks,
      }
    }
    const total = Number(result.count) || result.tickets.length
    const shown = result.tickets.length
    return {
      text:
        total > shown
          ? `Você tem ${total} ingressos ativos. Mostrando os ${shown} próximos — cancele um por vez.`
          : 'Estes são seus ingressos ativos. O cancelamento é um por vez — toque em Cancelar no card que quiser.',
      uiBlocks,
    }
  }

  if (/ingresso|meu ingresso|meus ingresso|minha compra/.test(text)) {
    const result = await listMyTicketsTool(ctx)
    if (result.ui) uiBlocks.push(result.ui)
    if (result.needsAuth) {
      return {
        text: 'Faça login para eu listar seus ingressos.',
        uiBlocks,
      }
    }
    return {
      text: result.tickets?.length
        ? `Você tem ${result.tickets.length} ingresso(s) ativo(s).`
        : 'Nenhum ingresso ativo na sua conta.',
      uiBlocks,
    }
  }

  const recommendIntent =
    /recomenda|sugest[aã]o|indic[ae]|o que (assist|ver)|filme pra (ver|assist)/.test(
      text,
    )

  const genreMatch = text.match(
    /(?:g[eê]nero|tipo)\s+(?:de\s+)?([a-záàâãéêíóôõúç\s]+)/i,
  )
  let genre = genreMatch?.[1]?.trim()
  if (!genre) {
    for (const g of [
      'ação',
      'acao',
      'comédia',
      'comedia',
      'drama',
      'terror',
      'aventura',
      'ficção',
      'ficcao',
      'romance',
      'animação',
      'animacao',
      'suspense',
    ]) {
      if (text.includes(g)) {
        genre = g
        break
      }
    }
  }

  const cinema = resolveCinemaFilter(text)
  const dateMatch = text.match(/\b(\d{2}\/\d{2}\/\d{4})\b/)
  const date = dateMatch?.[1] || ''
  const priceMatch = text.match(
    /(?:at[eé]|m[aá]ximo|max|menos de|abaixo de)\s*r?\$?\s*(\d+(?:[.,]\d+)?)/i,
  )
  const maxPrice = priceMatch ? asNumber(priceMatch[1], NaN) : NaN

  const buyIntent = /comprar|ingresso|quero ver|assento|sess[aã]o|hor[aá]rio|cinema|local/.test(
    text,
  )
  const search = await searchMovies({
    query:
      recommendIntent || genre || cinema
        ? ''
        : text
            .replace(/^(oi|olá|ola|hey|bom dia|boa tarde|boa noite)\b/gi, '')
            .trim(),
    genre: genre || '',
    cinema,
    date,
    maxPrice,
    limit: 5,
    sortByRating: recommendIntent || Boolean(genre),
  })
  if (search.ui) uiBlocks.push(search.ui)

  if (!search.movies?.length) {
    if (genre) {
      return {
        text: `Não achei filmes de ${genre} no catálogo agora. Tente outro gênero (terror, comédia, ação, drama…).`,
        uiBlocks,
      }
    }
    return {
      text: cinema
        ? `Não achei filmes em ${cinema} com esses critérios. Tente outro local (Centro, Norte ou Shopping) ou outro gênero.`
        : 'Não achei filmes no catálogo agora. Tente de novo em instantes.',
      uiBlocks,
    }
  }

  const titles = search.movies.map((m) => m.title).join(', ')
  const placeHint = cinema ? ` em ${cinema}` : ''
  const genreHint = genre ? ` de ${genre}` : ''
  return {
    text: buyIntent
      ? `Encontrei estas opções${genreHint}${placeHint}: ${titles}. Diga o filme e quantos assentos (ex.: "2 lugares em ${search.movies[0].title}").`
      : recommendIntent || genre
        ? `Minhas recomendações${genreHint}${placeHint}: ${titles}. Quer filtrar por gênero, local (Centro/Norte/Shopping) ou escolher um filme?`
        : `Posso recomendar${placeHint}: ${titles}. Me diga gênero, local (Centro/Norte/Shopping) ou o filme.`,
    uiBlocks,
  }
}