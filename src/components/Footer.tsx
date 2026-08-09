import { Link } from 'react-router-dom'

interface FooterProps {
  compact?: boolean
}

const exploreLinks = [
  { to: '/sobre', label: 'Sobre' },
  { to: '/suporte', label: 'Suporte' },
  { to: '/corporativo', label: 'Reservas corporativas' },
]

const legalLinks = [
  { to: '/termos', label: 'Termos de uso' },
  { to: '/privacidade', label: 'Privacidade' },
]

export function Footer({ compact = false }: FooterProps) {
  if (compact) {
    return (
      <footer className="mt-auto w-full border-t border-white/8 bg-surface-container-lowest py-section-gap">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-gutter px-5 md:grid-cols-4 md:px-container-margin">
          <div className="col-span-1 flex flex-col gap-3">
            <Link to="/" className="brand-mark text-headline-md">
              Cine<span>Ray</span>
            </Link>
            <span className="text-caption text-on-surface-variant">
              © 2026 CineRay — ingressos e portaria.
            </span>
          </div>
          <div className="col-span-1 flex flex-col gap-3 text-caption md:col-span-3 md:flex-row md:justify-end md:gap-8">
            {[...exploreLinks, ...legalLinks].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-on-surface-variant transition-colors hover:text-on-surface"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-gutter border-t border-white/8 bg-surface-container-lowest px-5 py-section-gap md:grid-cols-4 md:px-container-margin">
      <div className="col-span-1 flex flex-col gap-3">
        <Link to="/" className="brand-mark text-headline-md">
          Cine<span>Ray</span>
        </Link>
        <p className="max-w-xs text-caption text-on-surface-variant">
          Compra de ingresso, mapa de assentos e validação na porta — sem enrolação.
        </p>
        <p className="mt-auto pt-4 text-caption text-on-surface-variant/70">
          © 2026 CineRay
        </p>
      </div>
      <div className="col-span-1 flex flex-wrap gap-x-12 gap-y-8 md:col-span-3 md:justify-end">
        <div className="flex flex-col gap-3">
          <h4 className="mb-2 text-body-md font-semibold text-on-surface">Explorar</h4>
          {exploreLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-caption text-on-surface-variant transition-colors hover:text-on-surface"
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/conta"
            className="text-caption text-on-surface-variant transition-colors hover:text-on-surface"
          >
            Minha conta
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          <h4 className="mb-2 text-body-md font-semibold text-on-surface">Jurídico</h4>
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
    </footer>
  )
}
