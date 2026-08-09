import mysql from 'mysql2/promise'

let pool = null

export function getPool() {
  if (!pool) throw new Error('Banco ainda não inicializado. Chame initDb() antes.')
  return pool
}

export function createPoolFromEnv() {
  const sslEnabled = ['1', 'true', 'required', 'REQUIRED'].includes(
    String(process.env.MYSQL_SSL || '').trim(),
  )

  return mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'cineray',
    password: process.env.MYSQL_PASSWORD || 'cineray',
    database: process.env.MYSQL_DATABASE || 'cineray',
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_POOL || 10),
    namedPlaceholders: false,
    timezone: 'Z',
    // Aiven e outros MySQL gerenciados pedem SSL (ssl-mode=REQUIRED).
    ...(sslEnabled ? { ssl: { rejectUnauthorized: false } } : {}),
  })
}

export function setPool(next) {
  pool = next
}

/** @param {import('mysql2/promise').Pool|import('mysql2/promise').PoolConnection} runner */
export async function query(sql, params = [], runner = null) {
  const target = runner || getPool()
  const [rows] = await target.execute(sql, params)
  return rows
}

export async function queryOne(sql, params = [], runner = null) {
  const rows = await query(sql, params, runner)
  return rows[0] || null
}

export async function execute(sql, params = [], runner = null) {
  const target = runner || getPool()
  const [result] = await target.execute(sql, params)
  return result
}

/**
 * @template T
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<T>} fn
 */
export async function withTransaction(fn) {
  const conn = await getPool().getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (error) {
    try {
      await conn.rollback()
    } catch {
      // ignore
    }
    throw error
  } finally {
    conn.release()
  }
}

export function isDuplicateKeyError(error) {
  return (
    Number(error?.errno) === 1062 ||
    String(error?.code || '') === 'ER_DUP_ENTRY' ||
    String(error?.message || '').includes('Duplicate entry')
  )
}
