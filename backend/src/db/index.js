import {
  createPoolFromEnv,
  setPool,
} from './client.js'
import { runMigrations } from './migrate.js'
import { seedDemoData } from './seed.js'

async function waitForMysql(pool, attempts = 30) {
  let lastError
  for (let i = 0; i < attempts; i += 1) {
    try {
      await pool.query('SELECT 1')
      return
    } catch (error) {
      lastError = error
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  throw lastError || new Error('MySQL indisponível')
}

/**
 * Conecta no MySQL, aplica migrations pendentes e (opcionalmente) seed demo.
 * Schema versionado em backend/migrations — não recria tabelas a cada boot.
 */
export async function initDb() {
  const pool = createPoolFromEnv()
  setPool(pool)
  await waitForMysql(pool)
  await runMigrations()
  await seedDemoData()
  return pool
}

export {
  execute,
  getPool,
  isDuplicateKeyError,
  query,
  queryOne,
  withTransaction,
} from './client.js'
