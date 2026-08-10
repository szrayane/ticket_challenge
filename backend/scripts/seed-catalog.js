import 'dotenv/config'
import { initDb, queryOne } from '../src/db/index.js'
import { seedDemoCatalog } from '../src/db/seedCatalog.js'

await initDb()

const organizer = await queryOne(
  `SELECT id FROM users WHERE email = ?`,
  ['organizador@cineray.com'],
)
if (!organizer) {
  console.error('Organizador seed não encontrado.')
  process.exit(1)
}

const result = await seedDemoCatalog(organizer.id)
console.log(
  `Catálogo: criados ${result.created}, já existiam ${result.skipped}, total lista ${result.total}`,
)
process.exit(0)
