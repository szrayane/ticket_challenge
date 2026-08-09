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

  // Sincroniza o input com a URL (caso o usuário navegue/limpe)
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
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/60 shadow-[0px_0px_15px_rgba(255,45,125,0.2)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 md:px-container-margin">
        <div className="flex items-center gap-8 lg:gap-12">
          <Link
            to="/"
            className="text-headline-md font-extrabold tracking-tighter text-primary"
          >
            CineRay
          </Link>

          {!compact && (
            <div className="glass-card hidden w-64 items-center gap-2 rounded-full px-4 py-2 transition-all focus-within:border-primary focus-within:shadow-[inset_0_0_8px_rgba(255,45,125,0.2)] lg:flex">
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
                  `text-body-md transition-colors duration-300 active:scale-95 ${
                    isActive
                      ? 'border-b-2 border-primary pb-1 text-primary'
                      : 'text-on-surface-variant hover:text-primary'
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
              className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
              aria-label="Buscar"
            >
              <Icon name="search" />
            </button>
          )}
          {compact && <div className="mx-1 hidden h-6 w-px bg-white/10 md:block" />}
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
            className="flex items-center gap-2 text-on-surface-variant transition-colors hover:text-primary active:scale-95"
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