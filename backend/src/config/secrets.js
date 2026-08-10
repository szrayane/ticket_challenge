const WEAK_QR_SECRETS = new Set([
  'cineray-qr-dev-secret',
  'cineray-qr-compose-secret',
  'change-me',
  'secret',
  'password',
])

const WEAK_INVITE_CODES = new Set(['cineray-staff', 'staff', 'invite'])

function isProduction() {
  return String(process.env.NODE_ENV || '').trim() === 'production'
}

export function getTicketQrSecret() {
  const value = String(process.env.TICKET_QR_SECRET || '').trim()
  if (!value) {
    const err = new Error(
      'TICKET_QR_SECRET é obrigatório. Defina no .env (openssl rand -hex 32).',
    )
    err.code = 'MISSING_TICKET_QR_SECRET'
    throw err
  }
  if (isProduction() && WEAK_QR_SECRETS.has(value)) {
    const err = new Error(
      'TICKET_QR_SECRET inseguro para produção. Use um valor aleatório longo.',
    )
    err.code = 'WEAK_TICKET_QR_SECRET'
    throw err
  }
  return value
}

export function getStaffInviteCode() {
  const value = String(process.env.STAFF_INVITE_CODE || '').trim()
  if (!value) {
    if (isProduction()) {
      const err = new Error(
        'STAFF_INVITE_CODE é obrigatório em produção.',
      )
      err.code = 'MISSING_STAFF_INVITE_CODE'
      throw err
    }
    return 'cineray-staff'
  }
  if (isProduction() && WEAK_INVITE_CODES.has(value)) {
    const err = new Error(
      'STAFF_INVITE_CODE inseguro para produção. Troque o valor padrão.',
    )
    err.code = 'WEAK_STAFF_INVITE_CODE'
    throw err
  }
  return value
}

export function assertRequiredSecrets() {
  getTicketQrSecret()
  if (isProduction()) {
    getStaffInviteCode()
    const mysqlPassword = String(process.env.MYSQL_PASSWORD || '').trim()
    if (!mysqlPassword || mysqlPassword === 'cineray') {
      const err = new Error(
        'MYSQL_PASSWORD inseguro ou ausente em produção. Defina uma senha forte.',
      )
      err.code = 'WEAK_MYSQL_PASSWORD'
      throw err
    }
  }
}
