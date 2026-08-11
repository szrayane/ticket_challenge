require('dotenv').config()

const sslEnabled = ['1', 'true', 'required', 'REQUIRED'].includes(
  String(process.env.MYSQL_SSL || '').trim(),
)

/** @type {import('knex').Knex.Config} */
module.exports = {
  client: 'mysql2',
  connection: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'cineray',
    password: process.env.MYSQL_PASSWORD || 'cineray',
    database: process.env.MYSQL_DATABASE || 'cineray',
    timezone: 'Z',
    ...(sslEnabled ? { ssl: { rejectUnauthorized: false } } : {}),
  },
  pool: {
    min: 0,
    max: 10,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations',
    extension: 'cjs',
  },
}
