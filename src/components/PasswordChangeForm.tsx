import { useState, type FormEvent } from 'react'
import { Icon } from './Icon'

interface PasswordChangeFormProps {
  onChangePassword: (input: {
    currentPassword: string
    newPassword: string
  }) => Promise<void>
}

export function PasswordChangeForm({ onChangePassword }: PasswordChangeFormProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (currentPassword.length < 4) {
      setError('Informe a senha atual.')
      return
    }
    if (newPassword.length < 4) {
      setError('A nova senha precisa ter ao menos 4 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação não confere com a nova senha.')
      return
    }
    if (newPassword === currentPassword) {
      setError('A nova senha deve ser diferente da atual.')
      return
    }

    try {
      setSubmitting(true)
      await onChangePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess('Senha alterada com sucesso.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível alterar a senha.',
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
        <Icon name="lock" className="text-primary" />
        <h2 className="text-headline-md text-on-surface">Trocar senha</h2>
      </div>
      <p className="text-body-md text-on-surface-variant">
        Use uma senha com pelo menos 4 caracteres.
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <label
            className="ml-1 text-label-md text-on-surface-variant"
            htmlFor="pwd-current"
          >
            Senha atual
          </label>
          <input
            id="pwd-current"
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value)
              setSuccess(null)
            }}
            className="glass-input w-full rounded-lg px-4 py-3 text-body-md text-on-surface"
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-1">
          <label
            className="ml-1 text-label-md text-on-surface-variant"
            htmlFor="pwd-new"
          >
            Nova senha
          </label>
          <input
            id="pwd-new"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value)
              setSuccess(null)
            }}
            className="glass-input w-full rounded-lg px-4 py-3 text-body-md text-on-surface"
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1">
          <label
            className="ml-1 text-label-md text-on-surface-variant"
            htmlFor="pwd-confirm"
          >
            Confirmar
          </label>
          <input
            id="pwd-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              setSuccess(null)
            }}
            className="glass-input w-full rounded-lg px-4 py-3 text-body-md text-on-surface"
            autoComplete="new-password"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-6 py-3 text-label-md text-white transition-all hover:brightness-110 disabled:opacity-50 sm:w-auto sm:self-start"
      >
        {submitting ? 'Salvando…' : 'Atualizar senha'}
        <Icon name="key" className="text-[18px]" />
      </button>
    </form>
  )
}
