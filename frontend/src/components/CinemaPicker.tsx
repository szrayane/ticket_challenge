import {
  CINEMA_NAMES,
  normalizeCinemaName,
  resolveCinemaVenue,
} from '../lib/cinemaVenues'

type CinemaPickerProps = {
  value: string
  onChange: (cinema: string) => void
  label?: string
}

export function CinemaPicker({
  value,
  onChange,
  label = 'Cinema',
}: CinemaPickerProps) {
  const selected = normalizeCinemaName(value)
  const venue = resolveCinemaVenue(selected)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-label-md text-on-surface-variant">{label}</span>
        <span className="truncate text-caption text-on-surface-variant/80">
          {selected}
        </span>
      </div>
      <ul
        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        role="listbox"
        aria-label="Selecionar cinema"
      >
        {CINEMA_NAMES.map((name) => {
          const isSelected = selected === name
          return (
            <li key={name}>
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                title={name}
                onClick={() => onChange(name)}
                className={`flex w-full flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? 'border-white/35 bg-white/12 text-on-surface'
                    : 'border-white/10 bg-white/[0.04] text-on-surface-variant hover:border-white/20 hover:bg-white/[0.07] hover:text-on-surface'
                }`}
              >
                <span className="text-label-md">{name.replace('CineRay ', '')}</span>
                <span className="text-[11px] text-on-surface-variant/80">
                  {resolveCinemaVenue(name).neighborhood}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="truncate text-caption text-on-surface-variant/70">
        {venue.address}
      </p>
    </div>
  )
}
