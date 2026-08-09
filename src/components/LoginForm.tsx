import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { isValidEmail, isValidLoginPassword } from '../lib/validation'
import { Icon } from './Icon'

export type AuthMode = 'login' | 'register'

interface LoginFormProps {
  mode?: AuthMode
  onModeChange?: (mode: AuthMode) => void
  onLogin?: (data: { email: string; password: string }) => void
  onRegister?: (data: { name: string; email: string; password: string }) => void
  error?: string | null
  submitting?: boolean
  /** Hide register tab (staff login). */
  loginOnly?: boolean
}

export function LoginForm({
  mode = 'login',
  onModeChange,
  onLogin,
  onRegister,
  error,
  submitting = false,
  loginOnly = false,
}: LoginFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)

    const activeMode = loginOnly ? 'login' : mode

    if (activeMode === 'register' && name.trim().length < 2) {
      setLocalError('Informe seu nome completo.')
      return
    }
    if (!isValidEmail(email)) {
      setLocalError('Informe um e-mail válido.')
      return
    }
    if (!isValidLoginPassword(password)) {
      setLocalError('A senha precisa ter ao menos 4 caracteres.')
      return
    }

    if (activeMode === 'register') {
      onRegister?.({
        name: name.trim(),
        email: email.trim(),
        password,
      })
      return
    }

    onLogin?.({ email: email.trim(), password })
  }

  const displayError = localError || error

  const activeMode = loginOnly ? 'login' : mode

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {!loginOnly && (
        <div className="grid grid-cols-2 gap-2 rounded-full bg-white/5 p-1">
          <button
            type="button"
            onClick={() => onModeChange?.('login')}
            className={`rounded-full px-3 py-2 text-caption transition-colors ${
              activeMode === 'login'
                ? 'bg-primary text-white'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => onModeChange?.('register')}
            className={`rounded-full px-3 py-2 text-caption transition-colors ${
              activeMode === 'register'
                ? 'bg-primary text-white'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Criar conta
          </button>
        </div>
      )}

      {displayError && (
        <p className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-body-md text-primary">
          {displayError}
        </p>
      )}

      {activeMode === 'register' && (
        <div className="space-y-1">
          <label
            className="ml-1 text-label-md text-on-surface-variant"
            htmlFor="name"
          >
            Nome
          </label>
          <div className="relative">
            <Icon
              name="badge"
              className="absolute top-1/2 left-4 -translate-y-1/2 text-[20px] text-on-surface-variant"
            />
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="glass-input w-full rounded-lg py-3 pr-4 pl-11 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:text-white"
              autoComplete="name"
            />
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label
          className="ml-1 text-label-md text-on-surface-variant"
          htmlFor="email"
        >
          Email
        </label>
        <div className="relative">
          <Icon
            name="person"
            className="absolute top-1/2 left-4 -translate-y-1/2 text-[20px] text-on-surface-variant"
          />
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Digite seu email"
            className="glass-input w-full rounded-lg py-3 pr-4 pl-11 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:text-white"
            autoComplete="email"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label
          className="ml-1 text-label-md text-on-surface-variant"
          htmlFor="password"
        >
          Senha
        </label>
        <div className="relative">
          <Icon
            name="lock"
            className="absolute top-1/2 left-4 -translate-y-1/2 text-[20px] text-on-surface-variant"
          />
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="glass-input w-full rounded-lg py-3 pr-4 pl-11 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:text-white"
            autoComplete={
              activeMode === 'register' ? 'new-password' : 'current-password'
            }
          />
        </div>
        <div className="mt-2 flex justify-end">
          <span className="text-caption text-on-surface-variant/70">
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary-container px-6 py-3 text-label-md text-white shadow-[0px_0px_15px_rgba(255,76,135,0.4)] transition-all duration-300 hover:brightness-110 hover:shadow-[0px_0px_25px_rgba(255,76,135,0.6)] active:scale-[0.98] disabled:opacity-50"
      >
        {submitting
          ? activeMode === 'register'
            ? 'Criando…'
            : 'Entrando…'
          : activeMode === 'register'
            ? 'Criar conta'
            : 'Entrar'}
        <Icon name="arrow_forward" className="text-[18px]" />
      </button>

      <div className="mt-4 text-center">
        <p className="text-caption text-on-surface-variant">
          {loginOnly
            ? 'Área restrita da equipe.'
            : activeMode === 'register'
              ? 'Já tem conta? Use a aba Entrar.'
              : 'Não tem conta? Use a aba Criar conta.'}{' '}
          <Link
            to="/"
            className="font-semibold text-primary transition-all hover:brightness-125"
          >
            Ver filmes
          </Link>
        </p>
      </div>
    </form>
  )
}
