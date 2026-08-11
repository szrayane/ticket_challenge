import {
  cinemaMapEmbedUrl,
  cinemaMapsLink,
  type CinemaVenue,
} from '../lib/cinemaVenues'
import { Icon } from './Icon'

type CinemaVenueMapProps = {
  venue: CinemaVenue
}

export function CinemaVenueMap({ venue }: CinemaVenueMapProps) {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-lg border border-white/10 bg-surface-container/50">
      <div className="flex items-start justify-between gap-2 px-3 py-2">
        <div className="min-w-0 space-y-0.5">
          <p className="inline-flex items-center gap-1.5 truncate text-caption font-medium text-on-surface">
            <Icon name="location_on" className="shrink-0 text-[16px] text-primary" />
            {venue.name}
          </p>
          <p className="truncate text-[11px] leading-snug text-on-surface-variant">
            {venue.address}
          </p>
        </div>
        <a
          href={cinemaMapsLink(venue)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-0.5 pt-0.5 text-[11px] text-primary underline-offset-2 hover:underline"
        >
          Maps
          <Icon name="open_in_new" className="text-[12px]" />
        </a>
      </div>
      <iframe
        title={`Mapa — ${venue.name}`}
        src={cinemaMapEmbedUrl(venue)}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-36 w-full border-0 bg-surface-container"
      />
    </div>
  )
}
