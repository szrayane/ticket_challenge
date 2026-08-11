import 'dotenv/config'
import { assertRequiredSecrets } from './config/secrets.js'
import { initDb } from './db/index.js'
import { seedDemoData } from './db/seed.js'
import app from './app.js'
import { attachRealtime } from './realtime/hub.js'

assertRequiredSecrets()

const PORT = process.env.PORT || 3333

const pool = await initDb()
const server = app.listen(PORT, () => {
  console.log(`CineRay API running on http://localhost:${PORT}`)
})
attachRealtime(server)

// Seed depois de escutar a porta — cold start do Render responde health/login sem esperar catálogo.
seedDemoData().catch((error) => {
  console.warn('[seed] background:', error?.message || error)
})

async function shutdown() {
  server.close()
  await pool.end().catch(() => {})
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
