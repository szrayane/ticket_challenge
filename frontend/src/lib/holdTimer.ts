export const HOLD_TTL_MS = 10 * 60 * 1000

export function formatHoldCountdown(msLeft: number) {
  const safe = Math.max(0, msLeft)
  const totalSeconds = Math.ceil(safe / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
