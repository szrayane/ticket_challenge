import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { TicketOrderCard } from '../components/TicketOrderCard'
import { useAuth } from '../context/AuthContext'
import {
  groupTicketsByOrder,
  splitTicketsByRelevance,
} from '../lib/tickets'

type AccountTab = 'ingressos' | 'historico'

const ACCOUNT_TABS: { id: AccountTab; label: string; icon: string }[] = [
  { id: 'ingressos', label: 'Ingressos', icon: 'qr_code_2' },
  { id: 'historico', label: 'Histórico', icon: 'history' },
]

function parseAccountTab(value: string | null): AccountTab {
  if (value === 'historico') return value
  return 'ingressos'
}

export function AccountPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseAccountTab(searchParams.get('tab'))

  const {
    isAuthenticated,
    user,
    userTickets,
    logout,
    cancelTicket,
    bootstrapping,
  } = useAuth()

  const { upcoming, history } = useMemo(
    () => splitTicketsByRelevance(userTickets),
    [userTickets],
  )
  const upcomingOrders = useMemo(() => groupTicketsByOrder(upcoming), [upcoming])
  const historyOrders = useMemo(() => groupTicketsByOrder(history), [history])

  const [loggingOut, setLoggingOut] = useState(false)

  function setTab(next: AccountTab) {
    setSearchParams(next === 'ingressos' ? {} : { tab: next })
  }

  if (bootstrapping) {
    return (
      <main className="flex flex-grow items-center justify-center px-4 py-section-gap">
        <p className="text-body-md text-on-surface-variant">Carregando conta…</p>
      </main>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login?redirect=/conta" replace />
  }

  if (user.role === 'organizador' || user.role === 'portaria') {
    return (
      <Navigate
        to={user.role === 'organizador' ? '/organizador' : '/portaria'}
        replace
      />
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-[960px] min-w-0 flex-grow flex-col gap-6 overflow-x-clip px-4 py-section-gap sm:gap-8 sm:px-5 md:px-container-margin">
      <div className="glass-card flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-card-padding">
        <div>
          <p className="text-caption tracking-wider text-on-surface-variant uppercase">
            Minha conta
          </p>
          <h1 className="break-words text-headline-lg-mobile text-on-surface [overflow-wrap:anywhere] md:text-headline-lg">
            {user.name}
          </h1>
          <p className="break-all text-body-md text-on-surface-variant">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/"
            className="rounded-lg bg-neon px-6 py-3 text-label-md text-white transition-all hover:brightness-110"
          >
            Comprar ingressos
          </Link>
          <button
            type="button"
            disabled={loggingOut}
            onClick={() => {
              setLoggingOut(true)
              void logout().then(() => navigate('/login', { replace: true }))
            }}
            className="rounded-lg border border-white/15 px-6 py-3 text-label-md text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
          >
            Sair
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ACCOUNT_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-label-md transition-colors ${
              tab === item.id
                ? 'bg-primary text-white'
                : 'border border-white/10 text-on-surface-variant hover:border-primary/40 hover:text-primary'
            }`}
          >
            <Icon name={item.icon} className="text-[18px]" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'ingressos' && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="qr_code_2" className="text-primary" />
            <h2 className="text-headline-md text-on-surface">Próximos ingressos</h2>
          </div>
          <p className="text-body-md text-on-surface-variant">
            Pedidos agrupados por compra. Baixe ou compartilhe o QR e cancele
            antes do início da sessão.
          </p>

          {upcomingOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-6 py-10 text-center">
              <p className="mb-4 text-body-lg text-on-surface-variant">
                Nenhum ingresso próximo.
              </p>
              <Link
                to="/"
                className="inline-flex rounded-lg bg-primary-container px-6 py-3 text-label-md text-white"
              >
                Ver filmes
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {upcomingOrders.map((order) => (
                <TicketOrderCard
                  key={order.orderId}
                  order={order}
                  onCancel={cancelTicket}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'historico' && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="history" className="text-primary" />
            <h2 className="text-headline-md text-on-surface">Histórico</h2>
          </div>
          <p className="text-body-md text-on-surface-variant">
            Sessões encerradas e ingressos cancelados.
          </p>

          {historyOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-6 py-10 text-center">
              <p className="text-body-lg text-on-surface-variant">
                Sem histórico ainda.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {historyOrders.map((order) => (
                <TicketOrderCard key={order.orderId} order={order} />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  )
}
