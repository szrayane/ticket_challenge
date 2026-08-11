import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isStaffRole, roleHomePath } from './RequireRole'

interface FooterProps {
  compact?: boolean
}

export function Footer({ compact = false }: FooterProps) {
  const { isAuthenticated, user } = useAuth()
  const staff = isAuthenticated && isStaffRole(user?.role)
  const homePath = staff ? roleHomePath(user?.role) : '/'

  const exploreLinks = staff
    ? [
        { to: '/sobre', label: 'Sobre' },
        { to: '/suporte', label: 'Suporte' },
        {
          to: roleHomePath(user?.role),
          label: user?.role === 'organizador' ? 'Painel' : 'Portaria',
        },
      ]
    : [
        { to: '/sobre', label: 'Sobre' },
        { to: '/suporte', label: 'Suporte' },
        { to: '/conta', label: 'Minha conta' },
      ]

  return (
    <footer className="mt-auto w-full border-t border-white/8 bg-surface-container-lowest">
      <div
        className={`mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-8 px-5 py-10 md:px-container-margin ${
          compact
            ? 'md:grid-cols-[1fr_auto] md:items-center'
            : 'md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:gap-12 md:py-14'
        }`}
      >
        <div className="flex flex-col gap-3">
          <Link to={homePath} className="brand-mark w-fit text-headline-md">
            Cine<span>Ray</span>
          </Link>
          {!compact && (
            <p className="max-w-sm text-caption text-on-surface-variant">
              {staff
                ? user?.role === 'organizador'
                  ? 'Publique sessões, acompanhe ocupação e gerencie o catálogo.'
                  : 'Valide ingressos na porta com QR ou código.'
                : 'Compra de ingresso, mapa de assentos e validação na porta, sem enrolação.'}
            </p>
          )}
          <p className="text-caption text-on-surface-variant/70">
            © 2026 CineRay. Ingressos e portaria.
          </p>
        </div>

        {compact ? (
          <nav className="flex flex-wrap gap-x-6 gap-y-3 md:justify-end">
            {exploreLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-caption text-on-surface-variant transition-colors hover:text-on-surface"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : (
          <div className="flex flex-col gap-3 md:items-end">
            <h4 className="text-body-md font-semibold text-on-surface">Explorar</h4>
            <nav className="flex flex-col gap-3 md:items-end">
              {exploreLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="text-caption text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </footer>
  )
}
