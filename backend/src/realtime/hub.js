import { WebSocketServer } from 'ws'

const rooms = new Map()

function joinRoom(ws, room) {
  const key = String(room || '').trim()
  if (!key) return
  if (!rooms.has(key)) rooms.set(key, new Set())
  rooms.get(key).add(ws)
  ws._rooms.add(key)
}

function leaveRoom(ws, room) {
  const key = String(room || '').trim()
  if (!key) return
  const set = rooms.get(key)
  if (set) {
    set.delete(ws)
    if (set.size === 0) rooms.delete(key)
  }
  ws._rooms.delete(key)
}

function leaveAll(ws) {
  for (const room of [...ws._rooms]) leaveRoom(ws, room)
}

export function broadcast(room, payload) {
  const set = rooms.get(String(room || ''))
  if (!set || set.size === 0) return
  const data = JSON.stringify(payload)
  for (const client of set) {
    if (client.readyState === 1) client.send(data)
  }
}

export function publishSessionSeats(sessionId, extra = {}) {
  const id = String(sessionId || '')
  if (!id) return
  broadcast(`session:${id}`, {
    type: 'seats.changed',
    sessionId: id,
    at: new Date().toISOString(),
    ...extra,
  })
  broadcast('organizer', {
    type: 'stats.changed',
    sessionId: id,
    at: new Date().toISOString(),
  })
}

export function publishOrganizerStats(extra = {}) {
  broadcast('organizer', {
    type: 'stats.changed',
    at: new Date().toISOString(),
    ...extra,
  })
}

export function publishGateCheckIn(extra = {}) {
  broadcast('gate', {
    type: 'checkin',
    at: new Date().toISOString(),
    ...extra,
  })
  publishOrganizerStats(extra)
}

export function attachRealtime(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws) => {
    ws._rooms = new Set()
    ws.send(JSON.stringify({ type: 'hello', at: new Date().toISOString() }))

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw))
        if (msg.type === 'subscribe' && msg.room) joinRoom(ws, msg.room)
        if (msg.type === 'unsubscribe' && msg.room) leaveRoom(ws, msg.room)
      } catch {
      }
    })

    ws.on('close', () => leaveAll(ws))
    ws.on('error', () => leaveAll(ws))
  })

  return wss
}
