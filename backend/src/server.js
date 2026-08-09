import 'dotenv/config'
import { initDb } from './db/index.js'
import app from './app.js'
import { attachRealtime } from './realtime/hub.js'

const PORT = process.env.PORT || 3333

const pool = await initDb()
const server = app.listen(PORT, () => {
  console.log(`CineRay API running on http://localhost:${PORT}`)
})
attachRealtime(server)

async function shutdown() {
  server.close()
  await pool.end().catch(() => {})
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
