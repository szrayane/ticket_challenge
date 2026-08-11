import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { LoginForm, type AuthMode, type StaffRole } from '../components/LoginForm'
import { staffSafeRedirect } from '../components/RequireRole'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectParam = searchParams.get('redirect')
  const { isAuthenticated, user, login, register, registerStaff, bootstrapping } =
    useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function resolveRedirect(role?: string) {
    return staffSafeRedirect(role, redirectParam)
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
      navigate(resolveRedirect(nextUser.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRegister({
    name,
    email,
    password,
  }: {
    name: string
    email: string
    password: string
  }) {
    try {
      setSubmitting(true)
      setError(null)
      await register({ name, email, password })
      navigate(resolveRedirect('cliente'), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a conta.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRegisterStaff({
    name,
    email,
    password,
    role,
    inviteCode,
  }: {
    name: string
    email: string
    password: string
    role: StaffRole
    inviteCode: string
  }) {
    try {
      setSubmitting(true)
      setError(null)
      const nextUser = await registerStaff({
        name,
        email,
        password,
        role,
        inviteCode,
      })
      navigate(resolveRedirect(nextUser.role), { replace: true })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível criar a conta staff.',
      )
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

  if (isAuthenticated) {
    return <Navigate to={resolveRedirect(user?.role)} replace />
  }

  return (
    <main className="relative flex flex-grow items-center justify-center px-4 py-section-gap">
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_rgba(143,61,82,0.22),_transparent_55%),linear-gradient(180deg,#121214_0%,#0c0c0d_100%)]"
        aria-hidden
      />

      <div className="relative z-10 flex w-full max-w-md animate-fade-up flex-col gap-6 rounded-xl border border-white/10 bg-surface-container p-card-padding">
        <div className="space-y-2 text-center">
          <p className="brand-mark text-headline-md">
            Cine<span>Ray</span>
          </p>
          <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
            {mode === 'register' ? 'Criar conta' : 'Acesso'}
          </h1>
          <p className="text-body-md text-on-surface-variant">
            {mode === 'register'
              ? 'Cliente ou equipe: o perfil define para onde você vai.'
              : 'Um login para cliente, organizador e portaria.'}
          </p>
        </div>

        <LoginForm
          mode={mode}
          onModeChange={(next) => {
            setMode(next)
            setError(null)
          }}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onRegisterStaff={handleRegisterStaff}
          error={error}
          submitting={submitting}
        />
      </div>
    </main>
  )
}
