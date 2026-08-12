import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isStaffRole, roleHomePath } from './RequireRole'
import { Icon } from './Icon'

const links = [
  { to: '/', label: 'Filmes', end: true, catalog: true },
  { to: '/conta', label: 'Meus ingressos', end: false, roles: ['cliente'] },
  { to: '/organizador', label: 'Organizador', end: false, roles: ['organizador'] },
  { to: '/portaria', label: 'Portaria', end: false, roles: ['portaria'] },
]

interface NavbarProps {
  compact?: boolean
}

export function Navbar({ compact = false }: NavbarProps) {
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()
  const [searchParams] = useSearchParams()
  const queryFromUrl = searchParams.get('search') || ''
  const staff = isAuthenticated && isStaffRole(user?.role)
  const homePath = staff ? roleHomePath(user?.role) : '/'

  const [searchTerm, setSearchTerm] = useState(queryFromUrl)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSearchTerm(queryFromUrl)
  }, [queryFromUrl])

  useEffect(() => {
    if (!profileOpen) return
    function onPointerDown(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setProfileOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [profileOpen])

  const handleInputChange = (value: string) => {
    setSearchTerm(value)

    if (value.trim()) {
      navigate(`/?search=${encodeURIComponent(value.trim())}`, {
        replace: true,
        preventScrollReset: true,
      })
    } else {
      navigate('/', { replace: true, preventScrollReset: true })
    }
  }

  const visibleLinks = links.filter((link) => {
    if (link.catalog) return !staff
    if (!link.roles) return true
    if (!isAuthenticated || !user) return false
    return link.roles.includes(user.role || 'cliente')
  })

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-4 sm:px-5 md:px-container-margin">
        <div className="flex min-w-0 items-center gap-4 lg:gap-12">
          <Link to={homePath} className="brand-mark shrink-0 text-xl sm:text-headline-md">
            Cine<span>Ray</span>
          </Link>

          {!compact && !staff && (
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
            {visibleLinks.map((link) => (
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
          {compact && !staff && (
            <button
              type="button"
              className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              aria-label="Buscar"
            >
              <Icon name="search" />
            </button>
          )}
          {compact && !staff && <div className="mx-1 hidden h-6 w-px bg-white/10 md:block" />}
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

          {!isAuthenticated ? (
            <Link
              to="/login"
              className="flex items-center gap-2 text-on-surface-variant transition-colors hover:text-on-surface"
              aria-label="Entrar"
              title="Entrar"
            >
              <Icon name="account_circle" className="text-headline-md" />
            </Link>
          ) : (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="flex items-center gap-2 text-on-surface-variant transition-colors hover:text-on-surface"
                aria-label="Menu do perfil"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                title={user?.name}
              >
                <Icon name="account_circle" className="text-headline-md" />
                <span className="hidden max-w-[120px] truncate text-label-md md:inline">
                  {user?.name}
                </span>
                <Icon
                  name={profileOpen ? 'expand_less' : 'expand_more'}
                  className="hidden text-[18px] md:inline"
                />
              </button>
              {profileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 min-w-[180px] rounded-xl border border-white/10 bg-surface-container py-1 shadow-lg"
                >
                  <div className="border-b border-white/8 px-4 py-2.5">
                    <p className="truncate text-label-md text-on-surface">{user?.name}</p>
                    <p className="truncate text-caption text-on-surface-variant">
                      {user?.email}
                    </p>
                  </div>
                  {!staff && (
                    <Link
                      to="/conta"
                      role="menuitem"
                      onClick={() => setProfileOpen(false)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-label-md text-on-surface transition-colors hover:bg-white/5"
                    >
                      <Icon name="confirmation_number" className="text-[18px]" />
                      Meus ingressos
                    </Link>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false)
                      void logout()
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-label-md text-on-surface transition-colors hover:bg-white/5"
                  >
                    <Icon name="logout" className="text-[18px]" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
