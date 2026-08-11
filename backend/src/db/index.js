import {
  createPoolFromEnv,
  setPool,
} from './client.js'
import { runMigrations } from './migrate.js'
import { seedDemoData } from './seed.js'

async function waitForMysql(pool, attempts = 12) {
  let lastError
  for (let i = 0; i < attempts; i += 1) {
    try {
      await pool.query('SELECT 1')
      return
    } catch (error) {
      lastError = error
      console.warn(
        `[db] MySQL ainda indisponível (tentativa ${i + 1}/${attempts}): ${error.message}`,
      )
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  throw lastError || new Error('MySQL indisponível')
}

export async function initDb(options = {}) {
  const pool = createPoolFromEnv()
  setPool(pool)
  await waitForMysql(pool)
  await runMigrations()
  if (options.seed === true) {
    await seedDemoData()
  }
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
