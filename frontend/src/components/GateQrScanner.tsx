import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

const SCANNER_ID = 'cineray-gate-qr-reader'

type GateQrScannerProps = {
  onScan: (payload: string) => void
  enabled: boolean
}

export function GateQrScanner({ onScan, enabled }: GateQrScannerProps) {
  const onScanRef = useRef(onScan)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    if (!enabled) {
      setReady(false)
      setError(null)
      return
    }

    let cancelled = false
    const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false })

    async function start() {
      try {
        setError(null)
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            const value = String(decoded || '').trim()
            if (value) onScanRef.current(value)
          },
          () => {
          },
        )
        if (!cancelled) setReady(true)
      } catch {
        if (!cancelled) {
          setReady(false)
          setError(
            'Não foi possível abrir a câmera. Use HTTPS/localhost e permita o acesso, ou cole o código manualmente.',
          )
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      void scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {
        })
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div className="space-y-2">
      <div
        id={SCANNER_ID}
        className="overflow-hidden rounded-xl border border-white/15 bg-black/40"
      />
      {!ready && !error && (
        <p className="text-caption text-on-surface-variant">Abrindo câmera…</p>
      )}
      {error && (
        <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-caption text-primary">
          {error}
        </p>
      )}
    </div>
  )
}
