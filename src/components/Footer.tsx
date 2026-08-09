import { Link } from 'react-router-dom'

interface FooterProps {
  compact?: boolean
}

const exploreLinks = [
  { to: '/sobre', label: 'Sobre nós' },
  { to: '/suporte', label: 'Suporte' },
  { to: '/corporativo', label: 'Reservas corporativas' },
]

const legalLinks = [
  { to: '/termos', label: 'Termos de uso' },
  { to: '/privacidade', label: 'Política de privacidade' },
]

export function Footer({ compact = false }: FooterProps) {
  if (compact) {
    return (
      <footer className="mt-auto w-full border-t border-white/5 bg-surface-container-lowest py-section-gap">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-gutter px-5 md:grid-cols-4 md:px-container-margin">
          <div className="col-span-1 flex flex-col gap-4">
            <Link to="/" className="text-headline-md font-extrabold tracking-tighter text-primary">
              CineRay
            </Link>
            <span className="text-caption text-on-surface-variant">
              © 2026 CineRay. Excelência no cinema.
            </span>
          </div>
          <div className="col-span-1 flex flex-col gap-3 text-caption md:col-span-3 md:flex-row md:justify-end md:gap-8">
            {[...exploreLinks, ...legalLinks].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-on-tertiary-fixed-variant opacity-80 transition-colors hover:text-secondary hover:opacity-100"
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
    <footer className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-gutter bg-surface-container-lowest px-5 py-section-gap md:grid-cols-4 md:px-container-margin">
      <div className="col-span-1 flex flex-col gap-4">
        <Link to="/" className="text-headline-md text-primary">
          CineRay
        </Link>
        <p className="text-caption text-on-surface-variant opacity-80">
          Experiências imersivas de cinema na palma da sua mão.
        </p>
        <p className="mt-auto pt-4 text-caption text-on-tertiary-fixed-variant">
          © 2026 CineRay. Excelência no cinema.
        </p>
      </div>
      <div className="col-span-1 flex flex-wrap gap-x-12 gap-y-8 md:col-span-3 md:justify-end">
        <div className="flex flex-col gap-3">
          <h4 className="mb-2 text-body-md font-semibold text-on-surface">Explorar</h4>
          {exploreLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-caption text-on-tertiary-fixed-variant opacity-80 transition-colors hover:text-secondary hover:opacity-100"
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/conta"
            className="text-caption text-on-tertiary-fixed-variant opacity-80 transition-colors hover:text-secondary hover:opacity-100"
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
              className="text-caption text-on-tertiary-fixed-variant opacity-80 transition-colors hover:text-secondary hover:opacity-100"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
