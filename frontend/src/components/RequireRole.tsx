import { Navigate, Outlet, useLocation } from 'react-router-dom'
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

export function isStaffRole(role?: UserRole | string | null) {
  return role === 'organizador' || role === 'portaria'
}

export function isPurchasePath(pathname: string) {
  const path = pathname.split('?')[0] || '/'
  return (
    path === '/' ||
    path.startsWith('/filme/') ||
    path.startsWith('/seats/') ||
    path === '/checkout' ||
    path === '/success'
  )
}

export function staffSafeRedirect(
  role: UserRole | string | undefined,
  redirect?: string | null,
) {
  const home = roleHomePath(role)
  if (!isStaffRole(role)) return redirect || home
  if (!redirect) return home
  if (role === 'organizador' && redirect.startsWith('/organizador')) return redirect
  if (role === 'portaria' && redirect.startsWith('/portaria')) return redirect
  return home
}

/** Bloqueia organizador/portaria no catálogo e fluxo de compra. */
export function CatalogGuard() {
  const { bootstrapping, isAuthenticated, user } = useAuth()

  if (bootstrapping) {
    return (
      <main className="flex min-h-[40vh] items-center justify-center">
        <p className="text-body-md text-on-surface-variant">Carregando…</p>
      </main>
    )
  }

  if (isAuthenticated && isStaffRole(user?.role)) {
    return <Navigate to={roleHomePath(user?.role)} replace />
  }

  return <Outlet />
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
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    )
  }

  if (!roles.includes((user.role || 'cliente') as UserRole)) {
    return <Navigate to={roleHomePath(user.role)} replace />
  }

  return children
}
