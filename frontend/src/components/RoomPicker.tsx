import { CINEMA_ROOMS, normalizeCinemaRoom } from '../lib/cinemaRooms'

type RoomPickerProps = {
  value: string
  onChange: (room: string) => void
  label?: string
}

export function RoomPicker({
  value,
  onChange,
  label = 'Sala',
}: RoomPickerProps) {
  const selected = normalizeCinemaRoom(value)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-label-md text-on-surface-variant">{label}</span>
        <span className="text-caption text-on-surface-variant/80">
          {selected}
        </span>
      </div>
      <ul
        className="grid grid-cols-5 gap-2"
        role="listbox"
        aria-label="Selecionar sala"
      >
        {CINEMA_ROOMS.map((room) => {
          const isSelected = selected === room.id
          return (
            <li key={room.id}>
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                title={room.id}
                onClick={() => onChange(room.id)}
                className={`flex w-full items-center justify-center rounded-lg border px-2 py-2.5 text-center transition-colors ${
                  isSelected
                    ? 'border-white/35 bg-white/12 text-on-surface'
                    : 'border-white/10 bg-white/[0.04] text-on-surface-variant hover:border-white/20 hover:bg-white/[0.07] hover:text-on-surface'
                }`}
              >
                <span className="text-label-md tabular-nums">{room.number}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
