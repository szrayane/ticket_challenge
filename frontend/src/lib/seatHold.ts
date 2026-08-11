const HOLD_KEY = 'cineray.seat.holder'

export function getHoldClientId() {
  try {
    const existing = sessionStorage.getItem(HOLD_KEY)
    if (existing && existing.length >= 8) return existing
    const next =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? `hold_${crypto.randomUUID()}`
        : `hold_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem(HOLD_KEY, next)
    return next
  } catch {
    return `hold_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  }
}
