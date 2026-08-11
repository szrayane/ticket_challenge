import { createRequire } from 'node:module'
import knex from 'knex'

const require = createRequire(import.meta.url)

/**
 * Aplica migrations pendentes (Knex).
 * Idempotente: só roda o que ainda não está em `knex_migrations`.
 */
export async function runMigrations() {
  const config = require('../../knexfile.cjs')
  const db = knex(config)
  try {
    const [batch, log] = await db.migrate.latest()
    if (log.length > 0) {
      console.log(`[migrate] batch ${batch}: ${log.join(', ')}`)
    }
  } finally {
    await db.destroy()
  }
}
