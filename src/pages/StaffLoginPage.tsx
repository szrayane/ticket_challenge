import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { LoginForm } from '../components/LoginForm'
import { roleHomePath } from '../components/RequireRole'
import { useAuth } from '../context/AuthContext'

const STAFF_BG =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&q=80'

export function StaffLoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectParam = searchParams.get('redirect')
  const { isAuthenticated, user, login, bootstrapping } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function resolveRedirect(role?: string) {
    if (redirectParam) return redirectParam
    if (role === 'organizador' || role === 'portaria') return roleHomePath(role)
    return '/conta'
  }

  async function handleLogin({
    email,
    password,
  }: {
    email: string
    password: string
  }) {
    try {
      setSubmitting(true)
      setError(null)
      const nextUser = await login({ email, password })
      const role = nextUser.role || 'cliente'
      if (role !== 'organizador' && role !== 'portaria') {
        setError(
          'Esta área é só para equipe. Clientes devem usar o login em /login.',
        )
        return
      }
      navigate(resolveRedirect(role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally {
      setSubmitting(false)
    }
  }

  if (bootstrapping) {
    return (
      <main className="flex flex-grow items-center justify-center px-4 py-section-gap">
        <p className="text-body-md text-on-surface-variant">Carregando…</p>
      </main>
    )
  }

  if (isAuthenticated && (user?.role === 'organizador' || user?.role === 'portaria')) {
    return <Navigate to={resolveRedirect(user.role)} replace />
  }

  if (isAuthenticated && user?.role === 'cliente') {
    return <Navigate to="/conta" replace />
  }

  return (
    <main className="relative flex flex-grow items-center justify-center px-4 py-section-gap">
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-35 mix-blend-screen bg-cover bg-center"
        style={{ backgroundImage: `url('${STAFF_BG}')` }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-background/85 via-background to-background" />

      <div className="relative z-10 flex w-full max-w-md animate-fade-up flex-col gap-6 rounded-xl border-t border-l border-white/10 bg-[#1A0F14]/60 p-card-padding shadow-[0px_20px_40px_rgba(45,0,20,0.5)] backdrop-blur-[20px]">
        <div className="space-y-2 text-center">
          <p className="text-caption uppercase tracking-wider text-on-surface-variant">
            Equipe CineRay
          </p>
          <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
            Login staff
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Acesso para organizador e portaria.
          </p>
        </div>

        <LoginForm
          mode="login"
          loginOnly
          onLogin={handleLogin}
          error={error}
          submitting={submitting}
        />

        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left text-caption text-on-surface-variant">
          <p className="mb-1 font-semibold text-on-surface">Contas demo</p>
          <p>organizador@cineray.com / org1234</p>
          <p>portaria@cineray.com / porta1234</p>
        </div>

        <p className="text-center text-caption text-on-surface-variant">
          Cliente?{' '}
          <Link to="/login" className="font-semibold text-primary hover:brightness-125">
            Entrar em /login
          </Link>
        </p>
      </div>
    </main>
  )
}
