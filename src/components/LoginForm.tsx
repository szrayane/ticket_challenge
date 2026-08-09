import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { isValidEmail, isValidLoginPassword } from '../lib/validation'
import type { UserRole } from '../types'
import { Icon } from './Icon'

export type AuthMode = 'login' | 'register'
export type StaffRole = Extract<UserRole, 'organizador' | 'portaria'>

interface LoginFormProps {
  mode?: AuthMode
  onModeChange?: (mode: AuthMode) => void
  onLogin?: (data: { email: string; password: string }) => void
  onRegister?: (data: { name: string; email: string; password: string }) => void
  onRegisterStaff?: (data: {
    name: string
    email: string
    password: string
    role: StaffRole
    inviteCode: string
  }) => void
  error?: string | null
  submitting?: boolean
}

export function LoginForm({
  mode = 'login',
  onModeChange,
  onLogin,
  onRegister,
  onRegisterStaff,
  error,
  submitting = false,
}: LoginFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [staffSignup, setStaffSignup] = useState(false)
  const [staffRole, setStaffRole] = useState<StaffRole>('portaria')
  const [inviteCode, setInviteCode] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)

    if (mode === 'register' && name.trim().length < 2) {
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
    if (mode === 'register' && staffSignup && !inviteCode.trim()) {
      setLocalError('Informe o código de convite da equipe.')
      return
    }

    if (mode === 'register' && staffSignup) {
      onRegisterStaff?.({
        name: name.trim(),
        email: email.trim(),
        password,
        role: staffRole,
        inviteCode: inviteCode.trim(),
      })
      return
    }

    if (mode === 'register') {
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

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-2 gap-2 rounded-full bg-white/5 p-1">
        <button
          type="button"
          onClick={() => {
            onModeChange?.('login')
            setStaffSignup(false)
          }}
          className={`rounded-full px-3 py-2 text-caption transition-colors ${
            mode === 'login'
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
            mode === 'register'
              ? 'bg-primary text-white'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Criar conta
        </button>
      </div>

      {displayError && (
        <p className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-body-md text-primary">
          {displayError}
        </p>
      )}

      {mode === 'register' && (
        <>
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

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
            <input
              type="checkbox"
              checked={staffSignup}
              onChange={(e) => setStaffSignup(e.target.checked)}
              className="size-4 accent-primary"
            />
            <span className="text-body-md text-on-surface">
              Sou da equipe (organizador / portaria)
            </span>
          </label>

          {staffSignup && (
            <>
              <div className="space-y-1">
                <label
                  className="ml-1 text-label-md text-on-surface-variant"
                  htmlFor="staff-role"
                >
                  Perfil
                </label>
                <select
                  id="staff-role"
                  className="glass-input field-select w-full rounded-lg px-4 py-3 text-body-md"
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as StaffRole)}
                >
                  <option value="portaria">Portaria</option>
                  <option value="organizador">Organizador</option>
                </select>
              </div>
              <div className="space-y-1">
                <label
                  className="ml-1 text-label-md text-on-surface-variant"
                  htmlFor="invite"
                >
                  Código de convite
                </label>
                <input
                  id="invite"
                  className="glass-input w-full rounded-lg px-4 py-3 text-body-md"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Código de convite"
                  autoComplete="off"
                  required
                />
              </div>
            </>
          )}
        </>
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
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-6 py-3 text-label-md text-white transition-all duration-300 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
      >
        {submitting
          ? mode === 'register'
            ? 'Criando…'
            : 'Entrando…'
          : mode === 'register'
            ? staffSignup
              ? 'Criar conta staff'
              : 'Criar conta'
            : 'Entrar'}
        <Icon name="arrow_forward" className="text-[18px]" />
      </button>

      <div className="mt-4 text-center">
        <p className="text-caption text-on-surface-variant">
          {mode === 'register'
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
