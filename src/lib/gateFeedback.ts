export function playGateTone(kind: 'ok' | 'error' | 'warn') {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    const now = ctx.currentTime
    if (kind === 'ok') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now)
      osc.frequency.setValueAtTime(1175, now + 0.09)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)
      osc.start(now)
      osc.stop(now + 0.3)
    } else if (kind === 'warn') {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(520, now)
      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
      osc.start(now)
      osc.stop(now + 0.36)
    } else {
      osc.type = 'square'
      osc.frequency.setValueAtTime(220, now)
      osc.frequency.setValueAtTime(160, now + 0.12)
      gain.gain.setValueAtTime(0.16, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)
      osc.start(now)
      osc.stop(now + 0.42)
    }

    window.setTimeout(() => void ctx.close().catch(() => undefined), 600)
  } catch {
  }
}

export function vibrateGate(kind: 'ok' | 'error' | 'warn') {
  if (!navigator.vibrate) return
  if (kind === 'ok') navigator.vibrate([40, 30, 40])
  else if (kind === 'warn') navigator.vibrate([80, 40, 80])
  else navigator.vibrate([160, 60, 160, 60, 160])
}

export function feedbackGateResult(ok: boolean, warning?: boolean) {
  const kind = ok ? (warning ? 'warn' : 'ok') : 'error'
  playGateTone(kind)
  vibrateGate(kind)
}
