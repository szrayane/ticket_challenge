exports.up = async function up(knex) {
  const [cols] = await knex.raw(`
    SELECT COLUMN_NAME AS name
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets'
  `)
  const names = new Set((cols || []).map((c) => c.name))

  if (!names.has('transfer_token')) {
    await knex.raw(`
      ALTER TABLE tickets
        ADD COLUMN transfer_token VARCHAR(64) NULL AFTER share_token,
        ADD COLUMN transfer_expires_at VARCHAR(40) NULL AFTER transfer_token
    `)
  }

  const [indexes] = await knex.raw(`
    SELECT INDEX_NAME AS name
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tickets'
      AND INDEX_NAME = 'uk_tickets_transfer_token'
  `)

  if (!(indexes || []).length) {
    try {
      await knex.raw(
        `ALTER TABLE tickets ADD UNIQUE KEY uk_tickets_transfer_token (transfer_token)`,
      )
    } catch {
    }
  }
}

exports.down = async function down() {
}
