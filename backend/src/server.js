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

async function bootDatabase() {
  const delayMs = Number(process.env.MYSQL_RETRY_MS || 5000)
  let attempt = 0
  for (;;) {
    attempt += 1
    try {
      pool = await initDb()
      markDbReady()
      console.log(`[db] pronto (tentativa ${attempt})`)
      seedDemoData().catch((error) => {
        console.warn('[seed] background:', error?.message || error)
      })
      return
    } catch (error) {
      markDbFailed(error)
      console.error(
        `[db] falha no boot (tentativa ${attempt}):`,
        error?.message || error,
      )
      console.error(`[db] nova tentativa em ${delayMs}ms…`)
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}

bootDatabase().catch((error) => {
  console.error('[db] loop encerrou:', error?.message || error)
})

async function shutdown() {
  server.close()
  if (pool) await pool.end().catch(() => {})
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
