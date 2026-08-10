import { Link } from 'react-router-dom'

interface FooterProps {
  compact?: boolean
}

const exploreLinks = [
  { to: '/sobre', label: 'Sobre' },
  { to: '/suporte', label: 'Suporte' },
  { to: '/corporativo', label: 'Reservas corporativas' },
  { to: '/conta', label: 'Minha conta' },
]

const legalLinks = [
  { to: '/termos', label: 'Termos de uso' },
  { to: '/privacidade', label: 'Privacidade' },
]

export function Footer({ compact = false }: FooterProps) {
  return (
    <footer className="mt-auto w-full border-t border-white/8 bg-surface-container-lowest">
      <div
        className={`mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-8 px-5 py-10 md:px-container-margin ${
          compact
            ? 'md:grid-cols-[1fr_auto] md:items-center'
            : 'md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] md:gap-12 md:py-14'
        }`}
      >
        <div className="flex flex-col gap-3">
          <Link to="/" className="brand-mark w-fit text-headline-md">
            Cine<span>Ray</span>
          </Link>
          {!compact && (
            <p className="max-w-sm text-caption text-on-surface-variant">
              Compra de ingresso, mapa de assentos e validação na porta — sem
              enrolação.
            </p>
          )}
          <p className="text-caption text-on-surface-variant/70">
            © 2026 CineRay — ingressos e portaria.
          </p>
        </div>

        {compact ? (
          <nav className="flex flex-wrap gap-x-6 gap-y-3 md:justify-end">
            {[...exploreLinks, ...legalLinks].map((item) => (
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
          <div className="grid grid-cols-2 gap-8 sm:justify-items-start md:justify-items-end md:gap-16">
            <div className="flex flex-col gap-3 md:items-start">
              <h4 className="text-body-md font-semibold text-on-surface">
                Explorar
              </h4>
              {exploreLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="text-caption text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-3 md:items-start">
              <h4 className="text-body-md font-semibold text-on-surface">
                Jurídico
              </h4>
              {legalLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="text-caption text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </footer>
  )
}
