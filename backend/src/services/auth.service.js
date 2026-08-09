import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { execute, queryOne } from '../db/index.js'

const ROLES = new Set(['cliente', 'organizador', 'portaria'])

function nowIso() {
  return new Date().toISOString()
}

function createId(prefix) {
  return `${prefix}_${randomBytes(12).toString('hex')}`
}

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 64).toString('hex')
  return { salt, hash }
}

export function verifyPassword(password, salt, expectedHash) {
  const actual = scryptSync(password, salt, 64)
  const expected = Buffer.from(expectedHash, 'hex')
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

export function normalizeRole(role) {
  const value = String(role || 'cliente').trim().toLowerCase()
  return ROLES.has(value) ? value : 'cliente'
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    cpf: row.cpf || undefined,
    role: normalizeRole(row.role),
  }
}

export async function registerUser({ email, password, name }) {
  return createUserAccount({
    email,
    password,
    name,
    role: 'cliente',
  })
}

export async function registerStaffUser({ email, password, name, role, inviteCode }) {
  const expected = String(process.env.STAFF_INVITE_CODE || 'cineray-staff').trim()
  const provided = String(inviteCode || '').trim()

  if (!expected) {
    const err = new Error('Cadastro de equipe indisponível no momento.')
    err.status = 503
    throw err
  }
  if (!provided || provided !== expected) {
    const err = new Error('Código de convite inválido.')
    err.status = 403
    throw err
  }

  const staffRole = normalizeRole(role)
  if (staffRole !== 'organizador' && staffRole !== 'portaria') {
    const err = new Error('Escolha o perfil organizador ou portaria.')
    err.status = 400
    throw err
  }

  return createUserAccount({
    email,
    password,
    name,
    role: staffRole,
  })
}

async function createUserAccount({ email, password, name, role }) {
  const normalized = String(email || '')
    .trim()
    .toLowerCase()
  const trimmedName = String(name || '').trim()
  const pwd = String(password || '')

  if (!normalized || !normalized.includes('@')) {
    const err = new Error('Informe um e-mail válido.')
    err.status = 400
    throw err
  }
  if (pwd.length < 4) {
    const err = new Error('A senha precisa ter ao menos 4 caracteres.')
    err.status = 400
    throw err
  }
  if (trimmedName.length < 2) {
    const err = new Error('Informe seu nome.')
    err.status = 400
    throw err
  }

  const existing = await queryOne('SELECT id FROM users WHERE email = ?', [
    normalized,
  ])
  if (existing) {
    const err = new Error('Já existe uma conta com este e-mail.')
    err.status = 409
    throw err
  }

  const { salt, hash } = hashPassword(pwd)
  const user = {
    id: createId('usr'),
    email: normalized,
    name: trimmedName,
    cpf: null,
    password_hash: hash,
    password_salt: salt,
    created_at: nowIso(),
    role: normalizeRole(role),
  }

  await execute(
    `INSERT INTO users (id, email, name, cpf, password_hash, password_salt, created_at, role)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      user.email,
      user.name,
      user.cpf,
      user.password_hash,
      user.password_salt,
      user.created_at,
      user.role,
    ],
  )

  const token = await createSession(user.id)
  return { user: publicUser(user), token }
}

export async function loginUser({ email, password }) {
  const normalized = String(email || '')
    .trim()
    .toLowerCase()
  const pwd = String(password || '')

  const row = await queryOne(
    'SELECT id, email, name, cpf, password_hash, password_salt, role FROM users WHERE email = ?',
    [normalized],
  )

  if (!row || !verifyPassword(pwd, row.password_salt, row.password_hash)) {
    const err = new Error('E-mail ou senha inválidos.')
    err.status = 401
    throw err
  }

  const token = await createSession(row.id)
  return { user: publicUser(row), token }
}

export async function createSession(userId) {
  const token = randomBytes(32).toString('hex')
  await execute(
    'INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)',
    [token, userId, nowIso()],
  )
  return token
}

export async function getUserByToken(token) {
  if (!token) return null
  const row = await queryOne(
    `SELECT u.id, u.email, u.name, u.cpf, u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`,
    [token],
  )
  return row ? publicUser(row) : null
}

export async function logoutUser(token) {
  if (!token) return
  await execute('DELETE FROM sessions WHERE token = ?', [token])
}

export async function updateUserProfile(userId, { name, cpf }) {
  const current = await queryOne(
    'SELECT id, email, name, cpf, role FROM users WHERE id = ?',
    [userId],
  )
  if (!current) {
    const err = new Error('Usuário não encontrado.')
    err.status = 404
    throw err
  }

  const nextName =
    typeof name === 'string' && name.trim() ? name.trim() : current.name
  const nextCpf =
    typeof cpf === 'string' && cpf.trim() ? cpf.trim() : current.cpf

  await execute('UPDATE users SET name = ?, cpf = ? WHERE id = ?', [
    nextName,
    nextCpf,
    userId,
  ])

  return publicUser({
    id: current.id,
    email: current.email,
    name: nextName,
    cpf: nextCpf,
    role: current.role,
  })
}

export async function changeUserPassword(userId, { currentPassword, newPassword }) {
  const row = await queryOne(
    'SELECT id, password_hash, password_salt FROM users WHERE id = ?',
    [userId],
  )

  if (!row) {
    const err = new Error('Usuário não encontrado.')
    err.status = 404
    throw err
  }

  const current = String(currentPassword || '')
  const next = String(newPassword || '')

  if (!verifyPassword(current, row.password_salt, row.password_hash)) {
    const err = new Error('Senha atual incorreta.')
    err.status = 401
    throw err
  }

  if (next.length < 4) {
    const err = new Error('A nova senha precisa ter ao menos 4 caracteres.')
    err.status = 400
    throw err
  }

  if (current === next) {
    const err = new Error('A nova senha deve ser diferente da atual.')
    err.status = 400
    throw err
  }

  const { salt, hash } = hashPassword(next)
  await execute(
    'UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?',
    [hash, salt, userId],
  )

  return { ok: true }
}
