import { getUserByToken } from '../services/auth.service.js'

function readToken(req) {
  const header = req.headers.authorization || ''
  return header.startsWith('Bearer ')
    ? header.slice(7).trim()
    : String(req.headers['x-auth-token'] || '').trim()
}

export async function optionalAuth(req, _res, next) {
  try {
    const token = readToken(req)
    const user = token ? await getUserByToken(token) : null
    if (user) {
      req.user = user
      req.token = token
    }
    next()
  } catch (error) {
    next(error)
  }
}

export async function requireAuth(req, res, next) {
  try {
    const token = readToken(req)
    const user = await getUserByToken(token)
    if (!user) {
      return res.status(401).json({ message: 'Faça login para continuar.' })
    }

    req.user = user
    req.token = token
    next()
  } catch (error) {
    next(error)
  }
}

export function requireRole(...roles) {
  const allowed = new Set(roles.map((role) => String(role).toLowerCase()))
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Faça login para continuar.' })
    }
    if (!allowed.has(String(req.user.role || '').toLowerCase())) {
      return res.status(403).json({ message: 'Acesso não permitido para este perfil.' })
    }
    next()
  }
}
