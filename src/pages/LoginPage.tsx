import { useState } from 'react'
import { Navigate, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LoginForm, type AuthMode } from '../components/LoginForm'
import { roleHomePath } from '../components/RequireRole'
import { useAuth } from '../context/AuthContext'

const LOGIN_BG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAPcvdQ1upDOmnBQJR0udILaLzEeU6k1wfvAYaLpxa3KnDe7hTk1OFSvBLI8FA47-LhACzIB-6bond9_ZZ0vPbPkjpbzdP1ZTTjcdePFdc1J72S3tZsnm4Mh8He2KO3wcenm8hL7eUHJzu1gN6RDJcipaCIU5vqWDcNa1jBj2jeUO78nfeV5nrF0PsKkDf9OHp_PbZ5DlitZuz4zxQbTMk2CAjqaVbRq-hjnRsUPy_emMaVU-kG0uQ1VQ'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectParam = searchParams.get('redirect')
  const { isAuthenticated, user, login, register, bootstrapping } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function resolveRedirect(role?: string) {
    if (redirectParam) return redirectParam
    return roleHomePath(role)
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
        className="pointer-events-none absolute inset-0 z-0 opacity-40 mix-blend-screen bg-cover bg-center"
        style={{ backgroundImage: `url('${LOGIN_BG}')` }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-background/80 via-background to-background" />

      <div className="relative z-10 flex w-full max-w-md animate-fade-up flex-col gap-6 rounded-xl border-t border-l border-white/10 bg-[#1A0F14]/60 p-card-padding shadow-[0px_20px_40px_rgba(45,0,20,0.5)] backdrop-blur-[20px]">
        <div className="space-y-2 text-center">
          <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
            {mode === 'register' ? 'Criar conta' : 'Acesso'}
          </h1>
          <p className="text-body-md text-on-surface-variant">
            {mode === 'register'
              ? 'Cadastro de cliente para comprar e guardar QR Codes.'
              : 'Entre com sua conta de cliente.'}
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
          error={error}
          submitting={submitting}
        />

        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left text-caption text-on-surface-variant">
          <p className="mb-1 font-semibold text-on-surface">Equipe</p>
          <p>
            Organizador e portaria:{' '}
            <Link to="/staff/login" className="text-primary hover:brightness-125">
              /staff/login
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
