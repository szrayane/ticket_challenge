import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  sendChatAction,
  sendChatMessage,
  type ChatMessagePayload,
  type ChatUiBlock,
} from '../api/chat'
import { AppApiError } from '../api/appClient'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../lib/money'
import { GoogleWalletBadgeButton } from './GoogleWalletBadgeButton'
import { Icon } from './Icon'

type LocalMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  ui?: ChatUiBlock[]
}

const HOLDER_KEY = 'cineray.chat.holderKey'
const SESSION_KEY = 'cineray.chat.sessionId'

const QUICK_PROMPTS = [
  'Ajuda',
  'Cancelamento',
  'Recomendação de filmes',
]

function readStorage(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
  }
}

function createLocalId() {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function shouldShowChat(pathname: string) {
  if (pathname.startsWith('/organizador')) return false
  if (pathname.startsWith('/portaria')) return false
  if (pathname.startsWith('/staff')) return false
  if (pathname.startsWith('/checkout')) return false
  if (pathname.startsWith('/success')) return false
  return true
}

export function ChatWidget() {
  const location = useLocation()
  const { isAuthenticated, user, refreshTickets } = useAuth()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(() =>
    readStorage(SESSION_KEY),
  )
  const [holderKey, setHolderKey] = useState<string | null>(() =>
    readStorage(HOLDER_KEY),
  )
  const [messages, setMessages] = useState<LocalMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Olá! Sou o assistente CineRay. Escolha uma opção abaixo ou me diga o que precisa: ajuda, cancelamento ou recomendação de filmes.',
    },
  ])
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const visible = shouldShowChat(location.pathname)

  useEffect(() => {
    if (!open) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, busy])

  if (!visible) return null

  function rememberSession(nextSessionId: string, nextHolderKey: string) {
    setSessionId(nextSessionId)
    setHolderKey(nextHolderKey)
    writeStorage(SESSION_KEY, nextSessionId)
    writeStorage(HOLDER_KEY, nextHolderKey)
  }

  function pushAssistant(payload: ChatMessagePayload) {
    setMessages((prev) => {
      const hasFreshTickets = payload.ui?.some((block) => block.type === 'tickets')
      const cleaned = hasFreshTickets
        ? prev.map((msg) => ({
            ...msg,
            ui: msg.ui?.filter((block) => block.type !== 'tickets'),
          }))
        : prev
      return [
        ...cleaned,
        {
          id: createLocalId(),
          role: 'assistant',
          content: payload.content,
          ui: payload.ui,
        },
      ]
    })
  }

  async function submitMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return

    setInput('')
    setMessages((prev) => {
      const isCancel =
        /cancel|desistir|reembolso/i.test(trimmed) && trimmed.length <= 64
      const base = isCancel
        ? prev.map((msg) => ({
            ...msg,
            ui: msg.ui?.filter((block) => block.type !== 'tickets'),
          }))
        : prev
      return [
        ...base,
        { id: createLocalId(), role: 'user', content: trimmed },
      ]
    })
    setBusy(true)

    try {
      const data = await sendChatMessage({
        message: trimmed,
        sessionId,
        holderKey,
      })
      rememberSession(data.sessionId, data.holderKey)
      pushAssistant(data.message)
    } catch (error) {
      const message =
        error instanceof AppApiError
          ? error.message
          : 'Não consegui falar com o assistente agora.'
      setMessages((prev) => [
        ...prev,
        { id: createLocalId(), role: 'system', content: message },
      ])
    } finally {
      setBusy(false)
    }
  }

  async function runAction(
    key: string,
    action: Parameters<typeof sendChatAction>[0],
  ) {
    if (actionBusy) return
    setActionBusy(key)
    try {
      const data = await sendChatAction({
        ...action,
        sessionId,
        holderKey,
      })
      rememberSession(data.sessionId, data.holderKey)
      if (action.action === 'cancel_ticket' && action.ticketId) {
        const cancelledId = action.ticketId
        setMessages((prev) =>
          prev.map((msg) => ({
            ...msg,
            ui: msg.ui
              ?.map((block) => {
                if (block.type !== 'tickets') return block
                const tickets = block.tickets.filter((t) => t.id !== cancelledId)
                return {
                  ...block,
                  tickets,
                  totalActive: Math.max(
                    0,
                    (block.totalActive ?? block.tickets.length) - 1,
                  ),
                }
              })
              .filter(
                (block) =>
                  block.type !== 'tickets' || block.tickets.length > 0,
              ),
          })),
        )
      }
      pushAssistant(data.message)
      if (action.action === 'confirm_pix' || action.action === 'cancel_ticket') {
        await refreshTickets().catch(() => undefined)
      }
    } catch (error) {
      const message =
        error instanceof AppApiError
          ? error.message
          : 'Não foi possível concluir essa ação.'
      setMessages((prev) => [
        ...prev,
        { id: createLocalId(), role: 'system', content: message },
      ])
    } finally {
      setActionBusy(null)
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col items-end gap-3 sm:inset-x-auto sm:bottom-6 sm:right-6">
      {open && (
        <section
          className="pointer-events-auto flex h-[min(640px,72dvh)] w-full max-w-[400px] flex-col overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-low shadow-[0_20px_50px_rgba(0,0,0,0.45)] sm:w-[min(400px,calc(100vw-3rem))]"
          aria-label="Assistente CineRay"
        >
          <header className="flex items-center justify-between gap-3 border-b border-outline-variant/30 bg-surface-container px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-label-md text-on-surface">
                Assistente CineRay
              </p>
              <p className="truncate text-[11px] text-on-surface-variant">
                {isAuthenticated
                  ? `Logado como ${user?.name?.split(' ')[0] || 'cliente'}`
                  : 'Login necessário para comprar/cancelar'}
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              aria-label="Fechar chat"
              onClick={() => setOpen(false)}
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'rounded-br-md bg-primary-container text-on-primary-container'
                      : msg.role === 'system'
                        ? 'rounded-bl-md border border-error/40 bg-error-container/30 text-on-error-container'
                        : 'rounded-bl-md bg-surface-container-high text-on-surface'
                  }`}
                >
                  <ChatText content={msg.content} hasUi={Boolean(msg.ui?.length)} />
                  {msg.ui?.map((block, index) => (
                    <ChatUi
                      key={`${msg.id}_${index}`}
                      block={block}
                      busyKey={actionBusy}
                      onPickMovie={(movie) =>
                        void runAction(`movie_${movie.id}`, {
                          action: 'pick_movie',
                          movieId: movie.id,
                          movieTitle: movie.title,
                        })
                      }
                      onPickShowtime={(showtimeId) =>
                        void runAction(`st_${showtimeId}`, {
                          action: 'pick_showtime',
                          showtimeId,
                          quantity: 1,
                        })
                      }
                      onConfirmPix={(pendingId) =>
                        void runAction(`pix_${pendingId}`, {
                          action: 'confirm_pix',
                          pendingId,
                        })
                      }
                      onCancelTicket={(ticketId) =>
                        void runAction(`cancel_${ticketId}`, {
                          action: 'cancel_ticket',
                          ticketId,
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
            {busy && (
              <p className="px-1 text-xs text-on-surface-variant">Digitando…</p>
            )}
            <div ref={bottomRef} />
          </div>

          {!isAuthenticated && (
            <div className="border-t border-outline-variant/20 bg-surface-container/80 px-3 py-2 text-center text-[11px] text-on-surface-variant">
              Para comprar ou cancelar,{' '}
              <Link to="/login" className="text-primary underline-offset-2 hover:underline">
                entre na sua conta
              </Link>
              .
            </div>
          )}

          <div className="flex gap-1.5 overflow-x-auto border-t border-outline-variant/20 px-3 py-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={busy}
                onClick={() => void submitMessage(prompt)}
                className="shrink-0 rounded-full border border-outline-variant/40 bg-surface-container px-2.5 py-1 text-[11px] text-on-surface-variant hover:border-primary/50 hover:text-primary disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form
            className="flex items-end gap-2 border-t border-outline-variant/30 bg-surface-container px-3 py-3"
            onSubmit={(event) => {
              event.preventDefault()
              void submitMessage(input)
            }}
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={1}
              placeholder="Ex.: terror no CineRay Norte…"
              className="max-h-24 min-h-[40px] flex-1 resize-none rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void submitMessage(input)
                }
              }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-xl bg-primary px-3 py-2 text-on-primary disabled:opacity-40"
              aria-label="Enviar"
            >
              <Icon name="send" className="text-[18px]" />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_12px_30px_rgba(143,61,82,0.45)] transition hover:scale-[1.03] active:scale-95"
        aria-label={open ? 'Fechar assistente' : 'Abrir assistente'}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name={open ? 'close' : 'chat'} className="text-[26px]" filled />
      </button>
    </div>
  )
}

function cleanChatText(content: string, hasUi: boolean) {
  const lines = String(content || '')
    .replace(/<function\s*=\s*[a-z_]+>\s*\{[\s\S]*?\}\s*<\/function>/gi, '')
    .replace(/<function\s*=\s*[a-z_]+>\s*\{[^<]*\}?/gi, '')
    .replace(/<\/?function[^>]*>/gi, '')
    .replace(/\b(tkt_|mov_|st_)[a-z0-9]+\b/gi, '')
    .split('\n')
  const kept = lines.filter((line) => {
    const t = line.trim()
    if (!t) return true
    if ((t.match(/\|/g) || []).length >= 2) return false
    if (/^\|?\s*-{3,}/.test(t)) return false
    if (/^mov_[a-z0-9]+$/i.test(t)) return false
    if (/^(cancel_ticket|list_my_tickets|search_movies)\b/i.test(t)) return false
    return true
  })
  let text = kept
    .join('\n')
    .replace(/\bmov_[a-z0-9]+\b/gi, '')
    .replace(/\*\*/g, '')
    .replace(/`+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()

  if (!text && hasUi) {
    text = 'Veja as opções abaixo.'
  }
  return text
}

function ChatText({ content, hasUi }: { content: string; hasUi: boolean }) {
  const text = cleanChatText(content, hasUi)
  if (!text) return null

  const paragraphs = text.split(/\n+/).filter(Boolean)
  return (
    <div className="space-y-1.5">
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}_${paragraph.slice(0, 12)}`} className="leading-relaxed">
          {paragraph}
        </p>
      ))}
    </div>
  )
}

function ChatUi({
  block,
  busyKey,
  onPickMovie,
  onPickShowtime,
  onConfirmPix,
  onCancelTicket,
}: {
  block: ChatUiBlock
  busyKey: string | null
  onPickMovie: (movie: { id: string; title: string }) => void
  onPickShowtime: (showtimeId: string) => void
  onConfirmPix: (pendingId: string) => void
  onCancelTicket: (ticketId: string) => void
}) {
  if (block.type === 'movie_picks') {
    return (
      <div className="mt-2 space-y-2">
        {block.movies.map((movie) => (
          <button
            key={movie.id}
            type="button"
            disabled={Boolean(busyKey)}
            onClick={() => onPickMovie(movie)}
            className="flex w-full items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest/70 p-2 text-left hover:border-primary/45 disabled:opacity-60"
          >
            {movie.poster ? (
              <img
                src={movie.poster}
                alt=""
                className="h-14 w-10 shrink-0 rounded object-cover"
              />
            ) : null}
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-on-surface">
                {movie.title}
              </span>
              <span className="block truncate text-[11px] text-on-surface-variant">
                {movie.genre || 'Catálogo'}
                {movie.nextSession?.cinema
                  ? ` · ${movie.nextSession.cinema}`
                  : ''}
                {movie.nextSession
                  ? ` · ${movie.nextSession.date}${movie.nextSession.time ? ` ${movie.nextSession.time}` : ''}`
                  : ''}
              </span>
            </span>
          </button>
        ))}
      </div>
    )
  }

  if (block.type === 'showtimes') {
    return (
      <div className="mt-2 space-y-1.5">
        <p className="text-[11px] text-on-surface-variant">
          Sessões de {block.movie.title}
        </p>
        {block.showtimes.map((session) => (
          <button
            key={session.id}
            type="button"
            disabled={Boolean(busyKey)}
            onClick={() => onPickShowtime(session.id)}
            className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-lowest/70 px-2.5 py-2 text-left text-xs hover:border-primary/45 disabled:opacity-60"
          >
            <span className="min-w-0">
              <span className="block truncate">
                {session.date} · {session.time}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-on-surface-variant">
                {session.cinema} · {session.room}
              </span>
            </span>
            <span className="shrink-0 text-primary">
              {formatMoney(session.price)}
            </span>
          </button>
        ))}
      </div>
    )
  }

  if (block.type === 'seats') {
    return (
      <div className="mt-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest/70 p-2.5 text-xs">
        <p className="font-medium text-on-surface">Assentos sugeridos</p>
        <p className="mt-1 text-on-surface-variant">
          {block.seats.map((s) => s.label).join(', ')} ·{' '}
          {formatMoney(block.seats.reduce((sum, s) => sum + s.price, 0))}
        </p>
      </div>
    )
  }

  if (block.type === 'pix_payment') {
    const busy = busyKey === `pix_${block.pendingId}`
    return (
      <div className="mt-2 space-y-2 rounded-xl border border-primary/35 bg-surface-container-lowest p-3">
        <p className="text-xs font-medium text-on-surface">
          Pix fictício · {formatMoney(block.amount)}
        </p>
        <p className="text-[11px] text-on-surface-variant">
          {block.movieTitle} · {block.sessionDate} {block.sessionTime} ·{' '}
          {block.seatsLabel}
        </p>
        <div className="flex justify-center rounded-lg bg-white p-3">
          <QRCodeSVG value={block.pixPayload} size={148} level="M" />
        </div>
        <button
          type="button"
          disabled={Boolean(busyKey)}
          onClick={() => {
            void navigator.clipboard?.writeText(block.pixPayload)
          }}
          className="w-full rounded-lg border border-outline-variant/40 py-1.5 text-[11px] text-on-surface-variant hover:border-primary/40"
        >
          Copiar código Pix
        </button>
        <button
          type="button"
          disabled={Boolean(busyKey)}
          onClick={() => onConfirmPix(block.pendingId)}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-on-primary disabled:opacity-50"
        >
          {busy ? 'Confirmando…' : 'Já paguei — confirmar'}
        </button>
        <p className="text-center text-[10px] text-on-surface-variant">
          Simulação: nenhum valor é cobrado de verdade.
        </p>
      </div>
    )
  }

  if (block.type === 'tickets') {
    if (!block.tickets.length) {
      return (
        <p className="mt-2 text-[11px] text-on-surface-variant">
          Nenhum ingresso ativo.
        </p>
      )
    }
    const totalActive = Number(block.totalActive) || block.tickets.length
    return (
      <div className="mt-2 space-y-2">
        <p className="text-[11px] text-on-surface-variant">
          {totalActive > block.tickets.length
            ? `${totalActive} ativos · mostrando ${block.tickets.length} próximos — cancele um por vez.`
            : block.tickets.length > 1
              ? 'Cancele um por vez — toque no ingresso desejado.'
              : 'Toque em Cancelar se quiser desistir deste ingresso.'}
        </p>
        {block.tickets.map((ticket) => {
          const busy = busyKey === `cancel_${ticket.id}`
          return (
            <div
              key={ticket.id}
              className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest/70 p-2.5"
            >
              <p className="text-sm font-medium text-on-surface">
                {ticket.movieTitle}
              </p>
              <p className="mt-0.5 text-[11px] text-on-surface-variant">
                {ticket.sessionDate} {ticket.sessionTime} · Assento{' '}
                {ticket.seatLabel}
              </p>
              <p className="text-[10px] text-on-surface-variant">
                {ticket.cinema}
                {ticket.room ? ` · ${ticket.room}` : ''}
              </p>
              {ticket.cancellable !== false && (
                <button
                  type="button"
                  disabled={Boolean(busyKey)}
                  onClick={() => onCancelTicket(ticket.id)}
                  className="mt-2 w-full rounded-lg border border-error/40 py-1.5 text-xs text-error hover:bg-error-container/20 disabled:opacity-50"
                >
                  {busy ? 'Cancelando…' : 'Cancelar este ingresso'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (block.type === 'purchase_success') {
    return (
      <div className="mt-2 space-y-2 rounded-xl border border-primary/30 bg-primary/10 p-2.5 text-xs">
        <p className="font-medium text-primary-fixed">Compra confirmada</p>
        <p className="text-on-surface-variant">
          {block.tickets.map((t) => t.seatLabel).join(', ')} ·{' '}
          {formatMoney(block.total)}
        </p>
        <div className="space-y-2">
          {block.tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="rounded-lg border border-outline-variant/25 bg-surface-container-lowest/50 p-2"
            >
              <p className="mb-1.5 text-[11px] text-on-surface-variant">
                {ticket.movieTitle} · {ticket.seatLabel}
              </p>
              <GoogleWalletBadgeButton ticketId={ticket.id} />
            </div>
          ))}
        </div>
        <Link
          to="/conta"
          className="inline-block text-primary underline-offset-2 hover:underline"
        >
          Ver na minha conta
        </Link>
      </div>
    )
  }

  if (block.type === 'cancel_result') {
    return (
      <div className="mt-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest/70 p-2.5 text-xs text-on-surface-variant">
        Cancelado: {block.ticket.movieTitle} · {block.ticket.seatLabel}
      </div>
    )
  }

  return null
}
