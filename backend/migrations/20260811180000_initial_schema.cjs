/**
 * Schema inicial do CineRay.
 * Usa CREATE IF NOT EXISTS para não quebrar bancos locais que já existiam
 * antes das migrations (quando o schema vivia no initDb).
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      cpf VARCHAR(32) NULL,
      password_hash VARCHAR(128) NOT NULL,
      password_salt VARCHAR(64) NOT NULL,
      created_at VARCHAR(40) NOT NULL,
      role VARCHAR(32) NOT NULL DEFAULT 'cliente'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS sessions (
      token VARCHAR(128) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      created_at VARCHAR(40) NOT NULL,
      CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_sessions_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS movies (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      synopsis TEXT NOT NULL,
      genre VARCHAR(255) NOT NULL DEFAULT '',
      rating DOUBLE NOT NULL DEFAULT 0,
      runtime VARCHAR(64) NOT NULL DEFAULT '',
      format VARCHAR(64) NULL,
      badge VARCHAR(64) NULL,
      poster TEXT NOT NULL,
      hero TEXT NULL,
      backdrop TEXT NULL,
      trailer_url TEXT NULL,
      created_by VARCHAR(64) NULL,
      created_at VARCHAR(40) NOT NULL,
      updated_at VARCHAR(40) NOT NULL,
      is_active TINYINT NOT NULL DEFAULT 1,
      tmdb_id INT NULL,
      source VARCHAR(32) NOT NULL DEFAULT 'local',
      CONSTRAINT fk_movies_user
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS showtimes (
      id VARCHAR(64) PRIMARY KEY,
      movie_id VARCHAR(64) NOT NULL,
      session_date VARCHAR(16) NOT NULL,
      session_time VARCHAR(8) NOT NULL,
      date_label VARCHAR(128) NOT NULL,
      cinema VARCHAR(128) NOT NULL DEFAULT 'CineRay',
      room VARCHAR(64) NOT NULL,
      capacity INT NOT NULL DEFAULT 50,
      price DECIMAL(10,2) NOT NULL DEFAULT 28,
      created_by VARCHAR(64) NULL,
      created_at VARCHAR(40) NOT NULL,
      CONSTRAINT fk_showtimes_movie
        FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
      CONSTRAINT fk_showtimes_user
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_showtimes_movie (movie_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS tickets (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      user_email VARCHAR(255) NOT NULL,
      movie_id VARCHAR(64) NOT NULL,
      movie_title VARCHAR(255) NOT NULL,
      movie_poster TEXT NOT NULL,
      session_id VARCHAR(64) NOT NULL,
      session_date VARCHAR(64) NOT NULL,
      session_time VARCHAR(16) NOT NULL,
      cinema VARCHAR(128) NOT NULL,
      room VARCHAR(64) NOT NULL,
      seat_id VARCHAR(128) NOT NULL,
      seat_label VARCHAR(32) NOT NULL,
      cpf VARCHAR(32) NOT NULL,
      payment_method VARCHAR(64) NOT NULL,
      qr_payload TEXT NOT NULL,
      purchased_at VARCHAR(40) NOT NULL,
      total_paid DECIMAL(10,2) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      cancelled_at VARCHAR(40) NULL,
      order_id VARCHAR(64) NULL,
      checked_in_at VARCHAR(40) NULL,
      checked_in_by VARCHAR(64) NULL,
      share_token VARCHAR(64) NULL,
      transfer_token VARCHAR(64) NULL,
      transfer_expires_at VARCHAR(40) NULL,
      active_slot VARCHAR(256)
        GENERATED ALWAYS AS (
          CASE
            WHEN status = 'active' THEN CONCAT(session_id, ':', seat_id)
            ELSE NULL
          END
        ) STORED,
      CONSTRAINT fk_tickets_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY uk_tickets_active_slot (active_slot),
      UNIQUE KEY uk_tickets_share_token (share_token),
      UNIQUE KEY uk_tickets_transfer_token (transfer_token),
      INDEX idx_tickets_user (user_id),
      INDEX idx_tickets_order (order_id),
      INDEX idx_tickets_session (session_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS seat_holds (
      session_id VARCHAR(64) NOT NULL,
      seat_id VARCHAR(128) NOT NULL,
      holder_key VARCHAR(128) NOT NULL,
      expires_at VARCHAR(40) NOT NULL,
      PRIMARY KEY (session_id, seat_id),
      INDEX idx_seat_holds_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('seat_holds')
  await knex.schema.dropTableIfExists('tickets')
  await knex.schema.dropTableIfExists('showtimes')
  await knex.schema.dropTableIfExists('movies')
  await knex.schema.dropTableIfExists('sessions')
  await knex.schema.dropTableIfExists('users')
}
