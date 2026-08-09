import { Link } from 'react-router-dom'
import type { Movie } from '../types'
import { formatMoney } from '../lib/money'
import { Icon } from './Icon'

interface MovieCardProps {
  movie: Movie
}

export function MovieCard({ movie }: MovieCardProps) {
  const next = movie.nextSession

  return (
    <Link
      to={`/filme/${movie.id}`}
      className="glass-card group relative cursor-pointer overflow-hidden rounded-xl transition-transform duration-500 hover:-translate-y-2"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <div
          className="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: `url('${movie.poster}')` }}
          role="img"
          aria-label={movie.title}
        />
        {movie.format && (
          <div className="glass-card absolute top-4 left-4 flex items-center gap-1 rounded px-2 py-1 text-[12px] font-semibold tracking-wider text-primary">
            <Icon name="local_activity" className="text-[14px]" />
            {movie.format}
          </div>
        )}
        {next?.price != null && (
          <div className="absolute right-4 bottom-4 rounded bg-black/70 px-2 py-1 text-[12px] font-semibold text-white">
            a partir de {formatMoney(next.price)}
          </div>
        )}
      </div>
      <div className="p-card-padding">
        <h3 className="mb-1 truncate text-headline-md text-on-surface">{movie.title}</h3>
        <div className="flex items-center gap-3 text-caption text-on-surface-variant">
          <span>{movie.genre}</span>
          <span className="h-1 w-1 rounded-full bg-surface-variant" />
          <span className="flex items-center text-primary">
            <Icon name="star" className="mr-1 text-[14px]" filled />
            {movie.rating.toFixed(1)}
          </span>
        </div>
        {next && (
          <p className="mt-2 text-caption text-on-surface-variant">
            {next.date} • {next.time} • {next.cinema} • {next.room}
          </p>
        )}
      </div>
    </Link>
  )
}
