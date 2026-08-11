interface IconProps {
  name: string
  className?: string
  filled?: boolean
}

export function Icon({ name, className = '', filled = false }: IconProps) {
  return (
    <span
      className={`app-icon leading-none ${filled ? 'is-filled' : ''} ${className}`}
      aria-hidden
    >
      {name}
    </span>
  )
}
