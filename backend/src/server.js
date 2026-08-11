import 'dotenv/config'
import { assertRequiredSecrets } from './config/secrets.js'
import { initDb } from './db/index.js'
import { markDbFailed, markDbReady } from './db/ready.js'
import { seedDemoData } from './db/seed.js'
import app from './app.js'
import { attachRealtime } from './realtime/hub.js'

assertRequiredSecrets()

const PORT = process.env.PORT || 3333

// Escuta a porta ANTES do MySQL — senão o Render/CD fica em timeout eterno se o DB travar.
const server = app.listen(PORT, () => {
  console.log(`CineRay API listening on http://localhost:${PORT}`)
})
attachRealtime(server)

let pool = null

try {
  pool = await initDb()
  markDbReady()
  console.log('[db] pronto')
  seedDemoData().catch((error) => {
    console.warn('[seed] background:', error?.message || error)
  })
} catch (error) {
  markDbFailed(error)
  console.error('[db] falha no boot:', error?.message || error)
  // Sai para o Render reiniciar o serviço (melhor que ficar 503 pra sempre).
  setTimeout(() => process.exit(1), 2000)
}

async function shutdown() {
  server.close()
  if (pool) await pool.end().catch(() => {})
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
