export const CINEMA_NAME = 'CineRay Centro'

/** Salas do cinema (ex.: 10 salas). */
export const CINEMA_ROOMS = [
  { id: 'Sala 1', number: 1, tone: 'rose' },
  { id: 'Sala 2', number: 2, tone: 'orange' },
  { id: 'Sala 3', number: 3, tone: 'amber' },
  { id: 'Sala 4', number: 4, tone: 'lime' },
  { id: 'Sala 5', number: 5, tone: 'emerald' },
  { id: 'Sala 6', number: 6, tone: 'teal' },
  { id: 'Sala 7', number: 7, tone: 'sky' },
  { id: 'Sala 8', number: 8, tone: 'indigo' },
  { id: 'Sala 9', number: 9, tone: 'violet' },
  { id: 'Sala 10', number: 10, tone: 'fuchsia' },
] as const

export type CinemaRoomId = (typeof CINEMA_ROOMS)[number]['id']

const ROOM_TONE_CLASS: Record<string, { idle: string; selected: string; dot: string }> = {
  rose: {
    idle: 'border-rose-400/25 bg-rose-500/10 text-rose-100 hover:border-rose-400/50',
    selected: 'border-rose-400/70 bg-rose-500/25 text-rose-50',
    dot: 'bg-rose-400',
  },
  orange: {
    idle: 'border-orange-400/25 bg-orange-500/10 text-orange-100 hover:border-orange-400/50',
    selected: 'border-orange-400/70 bg-orange-500/25 text-orange-50',
    dot: 'bg-orange-400',
  },
  amber: {
    idle: 'border-amber-400/25 bg-amber-500/10 text-amber-100 hover:border-amber-400/50',
    selected: 'border-amber-400/70 bg-amber-500/25 text-amber-50',
    dot: 'bg-amber-400',
  },
  lime: {
    idle: 'border-lime-400/25 bg-lime-500/10 text-lime-100 hover:border-lime-400/50',
    selected: 'border-lime-400/70 bg-lime-500/25 text-lime-50',
    dot: 'bg-lime-400',
  },
  emerald: {
    idle: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400/50',
    selected: 'border-emerald-400/70 bg-emerald-500/25 text-emerald-50',
    dot: 'bg-emerald-400',
  },
  teal: {
    idle: 'border-teal-400/25 bg-teal-500/10 text-teal-100 hover:border-teal-400/50',
    selected: 'border-teal-400/70 bg-teal-500/25 text-teal-50',
    dot: 'bg-teal-400',
  },
  sky: {
    idle: 'border-sky-400/25 bg-sky-500/10 text-sky-100 hover:border-sky-400/50',
    selected: 'border-sky-400/70 bg-sky-500/25 text-sky-50',
    dot: 'bg-sky-400',
  },
  indigo: {
    idle: 'border-indigo-400/25 bg-indigo-500/10 text-indigo-100 hover:border-indigo-400/50',
    selected: 'border-indigo-400/70 bg-indigo-500/25 text-indigo-50',
    dot: 'bg-indigo-400',
  },
  violet: {
    idle: 'border-violet-400/25 bg-violet-500/10 text-violet-100 hover:border-violet-400/50',
    selected: 'border-violet-400/70 bg-violet-500/25 text-violet-50',
    dot: 'bg-violet-400',
  },
  fuchsia: {
    idle: 'border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100 hover:border-fuchsia-400/50',
    selected: 'border-fuchsia-400/70 bg-fuchsia-500/25 text-fuchsia-50',
    dot: 'bg-fuchsia-400',
  },
}

export function roomToneClasses(tone: string) {
  return ROOM_TONE_CLASS[tone] || ROOM_TONE_CLASS.rose
}

export function normalizeCinemaRoom(value?: string | null) {
  const raw = String(value || '').trim()
  const found = CINEMA_ROOMS.find(
    (room) => room.id.toLowerCase() === raw.toLowerCase(),
  )
  if (found) return found.id

  const match = raw.match(/(\d{1,2})/)
  if (match) {
    const n = Number(match[1])
    if (n >= 1 && n <= CINEMA_ROOMS.length) {
      return CINEMA_ROOMS[n - 1].id
    }
  }

  return CINEMA_ROOMS[0].id
}
