import { useEffect, useState, type FormEvent } from 'react'
import {
  formatCpf,
  isValidCardHolderName,
  isValidCpf,
  onlyDigits,
} from '../lib/validation'
import type { CustomerUser } from '../types'
import { Icon } from './Icon'

interface ProfileEditFormProps {
  user: CustomerUser
  onSave: (patch: { name: string; cpf: string }) => Promise<void>
}

export function ProfileEditForm({ user, onSave }: ProfileEditFormProps) {
  const [name, setName] = useState(user.name)
  const [cpf, setCpf] = useState(user.cpf ? formatCpf(user.cpf) : '')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setName(user.name)
    setCpf(user.cpf ? formatCpf(user.cpf) : '')
  }, [user.name, user.cpf])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const trimmedName = name.trim()
    if (!isValidCardHolderName(trimmedName) || trimmedName.length < 2) {
      setError('Informe um nome válido.')
      return
    }
    if (!isValidCpf(cpf)) {
      setError('Informe um CPF válido.')
      return
    }

    try {
      setSubmitting(true)
      await onSave({
        name: trimmedName,
        cpf: onlyDigits(cpf),
      })
      setSuccess('Dados atualizados com sucesso.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível salvar os dados.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className="glass-card flex flex-col gap-4 rounded-xl p-card-padding"
      onSubmit={(e) => {
        void handleSubmit(e)
      }}
      noValidate
    >
      <div className="flex items-center gap-2">
        <Icon name="manage_accounts" className="text-primary" />
        <h2 className="text-headline-md text-on-surface">Meus dados</h2>
      </div>
      <p className="text-body-md text-on-surface-variant">
        Atualize nome e CPF usados na compra dos ingressos. O e-mail não pode ser
        alterado.
      </p>

      {error && (
        <p className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-body-md text-primary">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-body-md text-emerald-300">
          {success}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <label
            className="ml-1 text-label-md text-on-surface-variant"
            htmlFor="profile-email"
          >
            E-mail
          </label>
          <input
            id="profile-email"
            type="email"
            value={user.email}
            disabled
            className="glass-input w-full rounded-lg py-3 px-4 text-body-md text-on-surface-variant opacity-70"
            autoComplete="email"
          />
        </div>

        <div className="space-y-1">
          <label
            className="ml-1 text-label-md text-on-surface-variant"
            htmlFor="profile-name"
          >
            Nome
          </label>
          <div className="relative">
            <Icon
              name="badge"
              className="absolute top-1/2 left-4 -translate-y-1/2 text-[20px] text-on-surface-variant"
            />
            <input
              id="profile-name"
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setSuccess(null)
              }}
              placeholder="Seu nome"
              className="glass-input w-full rounded-lg py-3 pr-4 pl-11 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:text-white"
              autoComplete="name"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            className="ml-1 text-label-md text-on-surface-variant"
            htmlFor="profile-cpf"
          >
            CPF
          </label>
          <div className="relative">
            <Icon
              name="id_card"
              className="absolute top-1/2 left-4 -translate-y-1/2 text-[20px] text-on-surface-variant"
            />
            <input
              id="profile-cpf"
              type="text"
              inputMode="numeric"
              required
              value={cpf}
              onChange={(e) => {
                setCpf(formatCpf(e.target.value))
                setSuccess(null)
              }}
              placeholder="000.000.000-00"
              className="glass-input w-full rounded-lg py-3 pr-4 pl-11 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:text-white"
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-6 py-3 text-label-md text-white transition-all duration-300 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 sm:w-auto sm:self-start"
      >
        {submitting ? 'Salvando…' : 'Salvar dados'}
        <Icon name="save" className="text-[18px]" />
      </button>
    </form>
  )
}
