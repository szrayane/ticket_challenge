import {
  CINEMA_ROOMS,
  normalizeCinemaRoom,
  roomToneClasses,
} from '../lib/cinemaRooms'

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
          {CINEMA_ROOMS.length} salas · {selected}
        </span>
      </div>
      <ul
        className="grid grid-cols-5 gap-2"
        role="listbox"
        aria-label="Selecionar sala"
      >
        {CINEMA_ROOMS.map((room) => {
          const isSelected = selected === room.id
          const tone = roomToneClasses(room.tone)
          return (
            <li key={room.id}>
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                title={room.id}
                onClick={() => onChange(room.id)}
                className={`flex w-full flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-all ${
                  isSelected ? tone.selected : tone.idle
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${tone.dot}`} aria-hidden />
                <span className="text-label-md tabular-nums">{room.number}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
