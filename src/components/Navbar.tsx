import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Icon } from './Icon'

const links = [
  { to: '/', label: 'Filmes', end: true },
  { to: '/conta', label: 'Meus ingressos', end: false, roles: ['cliente'] },
  { to: '/organizador', label: 'Organizador', end: false, roles: ['organizador'] },
  { to: '/portaria', label: 'Portaria', end: false, roles: ['portaria'] },
]

interface NavbarProps {
  compact?: boolean
}

export function Navbar({ compact = false }: NavbarProps) {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [searchParams] = useSearchParams()
  const queryFromUrl = searchParams.get('search') || ''

  const [searchTerm, setSearchTerm] = useState(queryFromUrl)

  useEffect(() => {
    setSearchTerm(queryFromUrl)
  }, [queryFromUrl])

  const handleInputChange = (value: string) => {
    setSearchTerm(value)

    if (value.trim()) {
      navigate(`/?search=${encodeURIComponent(value.trim())}`, { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 md:px-container-margin">
        <div className="flex items-center gap-8 lg:gap-12">
          <Link to="/" className="brand-mark text-headline-md">
            Cine<span>Ray</span>
          </Link>

          {!compact && (
            <div className="hidden w-64 items-center gap-2 rounded-lg border border-white/10 bg-surface-container px-4 py-2 transition-colors focus-within:border-primary lg:flex">
              <Icon name="search" className="text-body-lg text-on-surface-variant" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Buscar filmes, cinemas..."
                className="w-full border-none bg-transparent p-0 text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/50 focus:ring-0"
              />
            </div>
          )}

          <nav className="hidden items-center gap-6 md:flex lg:gap-8">
            {links
              .filter((link) => {
                if (!link.roles) return true
                if (!isAuthenticated || !user) return false
                return link.roles.includes(user.role || 'cliente')
              })
              .map((link) => (
                <NavLink
                  key={link.label}
                  to={link.to}
                  className={({ isActive }) =>
                    `text-body-md transition-colors duration-200 ${
                      isActive
                        ? 'border-b-2 border-primary pb-1 text-on-surface'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`
                  }
                  end={link.end}
                >
                  {link.label}
                </NavLink>
              ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {compact && (
            <button
              type="button"
              className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              aria-label="Buscar"
            >
              <Icon name="search" />
            </button>
          )}
          {compact && <div className="mx-1 hidden h-6 w-px bg-white/10 md:block" />}
          <a
            href="https://github.com/szrayane/ticket_challenge"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            aria-label="Repositório no GitHub"
            title="Ver no GitHub"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="h-[28px] w-[28px] fill-current"
            >
              <path d="M12 2C6.477 2 2 6.584 2 12.253c0 4.537 2.865 8.383 6.839 9.743.5.094.682-.222.682-.493 0-.243-.009-.888-.014-1.743-2.782.62-3.369-1.376-3.369-1.376-.454-1.187-1.11-1.504-1.11-1.504-.908-.638.069-.625.069-.625 1.004.072 1.532 1.06 1.532 1.06.892 1.57 2.341 1.116 2.91.854.091-.662.35-1.116.636-1.372-2.22-.26-4.555-1.14-4.555-5.077 0-1.122.39-2.04 1.029-2.76-.103-.26-.447-1.302.098-2.714 0 0 .84-.276 2.75 1.055A9.32 9.32 0 0 1 12 6.912a9.32 9.32 0 0 1 2.504.346c1.909-1.331 2.748-1.055 2.748-1.055.546 1.412.202 2.454.1 2.714.64.72 1.028 1.638 1.028 2.76 0 3.948-2.338 4.814-4.566 5.067.359.318.679.945.679 1.904 0 1.374-.012 2.481-.012 2.818 0 .273.18.593.688.492C19.138 20.633 22 16.788 22 12.253 22 6.584 17.523 2 12 2Z" />
            </svg>
          </a>
          <Link
            to={
              !isAuthenticated
                ? '/login'
                : user?.role === 'organizador'
                  ? '/organizador'
                  : user?.role === 'portaria'
                    ? '/portaria'
                    : '/conta'
            }
            className="flex items-center gap-2 text-on-surface-variant transition-colors hover:text-on-surface"
            aria-label={isAuthenticated ? 'Minha área' : 'Entrar'}
            title={isAuthenticated ? user?.name : 'Entrar'}
          >
            <Icon name="account_circle" className="text-headline-md" />
            {isAuthenticated && (
              <span className="hidden max-w-[120px] truncate text-label-md md:inline">
                {user?.name}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
