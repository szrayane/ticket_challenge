type RealtimeHandler = (payload: Record<string, unknown>) => void

function wsUrl() {
  const api = (import.meta.env.VITE_APP_API_URL || '/api').replace(/\/$/, '')
  if (api.startsWith('http://') || api.startsWith('https://')) {
    const u = new URL(api)
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
    u.pathname = '/ws'
    u.search = ''
    u.hash = ''
    return u.toString()
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws`
}

export function connectRealtime() {
  let socket: WebSocket | null = null
  let closed = false
  let retryMs = 800
  const rooms = new Set<string>()
  const handlers = new Set<RealtimeHandler>()

  function emit(payload: Record<string, unknown>) {
    for (const handler of handlers) handler(payload)
  }

  function send(msg: Record<string, unknown>) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg))
    }
  }

  function resubscribe() {
    for (const room of rooms) send({ type: 'subscribe', room })
  }

  function connect() {
    if (closed) return
    try {
      socket = new WebSocket(wsUrl())
    } catch {
      scheduleReconnect()
      return
    }

    socket.addEventListener('open', () => {
      retryMs = 800
      resubscribe()
      emit({ type: 'connected' })
    })

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as Record<string, unknown>
        emit(payload)
      } catch {
      }
    })

    socket.addEventListener('close', () => {
      emit({ type: 'disconnected' })
      scheduleReconnect()
    })

    socket.addEventListener('error', () => {
      socket?.close()
    })
  }

  function scheduleReconnect() {
    if (closed) return
    window.setTimeout(connect, retryMs)
    retryMs = Math.min(retryMs * 1.6, 8000)
  }

  connect()

  return {
    subscribe(room: string) {
      const key = String(room || '').trim()
      if (!key) return
      rooms.add(key)
      send({ type: 'subscribe', room: key })
    },
    unsubscribe(room: string) {
      const key = String(room || '').trim()
      if (!key) return
      rooms.delete(key)
      send({ type: 'unsubscribe', room: key })
    },
    on(handler: RealtimeHandler) {
      handlers.add(handler)
      return () => handlers.delete(handler)
    },
    close() {
      closed = true
      socket?.close()
      socket = null
      rooms.clear()
      handlers.clear()
    },
  }
}

export type RealtimeClient = ReturnType<typeof connectRealtime>
