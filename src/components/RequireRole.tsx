import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../types'
import type { ReactNode } from 'react'

export function roleHomePath(role?: UserRole | string) {
  switch (role) {
    case 'organizador':
      return '/organizador'
    case 'portaria':
      return '/portaria'
    default:
      return '/conta'
  }
}

export function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[]
  children: ReactNode
}) {
  const { bootstrapping, isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (bootstrapping) {
    return (
      <main className="flex min-h-[40vh] items-center justify-center">
        <p className="text-body-md text-on-surface-variant">Carregando…</p>
      </main>
    )
  }

  if (!isAuthenticated || !user) {
    const staffRoute = roles.some(
      (role) => role === 'organizador' || role === 'portaria',
    )
    const loginPath = staffRoute ? '/staff/login' : '/login'
    return (
      <Navigate
        to={`${loginPath}?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    )
  }

  if (!roles.includes((user.role || 'cliente') as UserRole)) {
    return <Navigate to={roleHomePath(user.role)} replace />
  }

  return children
}
