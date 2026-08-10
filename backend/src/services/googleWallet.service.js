import { createPrivateKey, createSign } from 'node:crypto'

const WALLET_SCOPE = 'https://www.googleapis.com/auth/wallet_object.issuer'
const WALLET_API = 'https://walletobjects.googleapis.com/walletobjects/v1'

function env(name, fallback = '') {
  return String(process.env[name] ?? fallback).trim()
}

function normalizePem(value) {
  let pem = String(value || '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/\r/g, '')
    // Env vars no Render/Vercel costumam guardar "\n" literal.
    .replace(/\\n/g, '\n')

  // Se colaram o JSON inteiro da service account, extrai private_key.
  if (!pem.includes('BEGIN PRIVATE KEY') && /private_key/i.test(pem)) {
    try {
      const json = pem.trim().startsWith('{') ? pem : `{"private_key":${pem}}`
      const parsed = JSON.parse(json)
      if (parsed?.private_key) return normalizePem(parsed.private_key)
    } catch {
      // ignore
    }
  }

  // Chave colapsada em uma linha (sem newlines reais) → remonta o PEM.
  if (pem.includes('BEGIN') && !pem.includes('\n')) {
    const match = pem.match(
      /-----BEGIN ([A-Z0-9 ]+)-----([A-Za-z0-9+/=]+)-----END \1-----/,
    )
    if (match) {
      const label = match[1]
      const body = match[2]
      const lines = body.match(/.{1,64}/g) || []
      pem = `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`
    }
  }

  return pem.trim()
}

function loadPrivateKey(privateKeyPem) {
  const pem = normalizePem(privateKeyPem)
  try {
    return createPrivateKey(pem)
  } catch (error) {
    const err = new Error(
      'GOOGLE_WALLET_SA_PRIVATE_KEY inválida no servidor (DECODER unsupported). No Render, cole a chave com \\n entre aspas, ou em campo multiline começando com -----BEGIN PRIVATE KEY-----.',
    )
    err.status = 500
    err.code = 'GOOGLE_WALLET_BAD_PRIVATE_KEY'
    err.cause = error
    throw err
  }
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
}

function signRs256Jwt(claims, privateKeyPem) {
  const header = { alg: 'RS256', typ: 'JWT' }
  const body = `${base64UrlJson(header)}.${base64UrlJson(claims)}`
  const signer = createSign('RSA-SHA256')
  signer.update(body)
  signer.end()
  const signature = signer.sign(loadPrivateKey(privateKeyPem)).toString('base64url')
  return `${body}.${signature}`
}

function sanitizeIdPart(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 64)
}

export function isGoogleWalletConfigured() {
  return Boolean(
    env('GOOGLE_WALLET_ISSUER_ID') &&
      env('GOOGLE_WALLET_SA_EMAIL') &&
      normalizePem(env('GOOGLE_WALLET_SA_PRIVATE_KEY')),
  )
}

export function getGoogleWalletStatus() {
  return {
    configured: isGoogleWalletConfigured(),
    issuerId: env('GOOGLE_WALLET_ISSUER_ID') || null,
  }
}

async function getGoogleAccessToken(saEmail, privateKey) {
  const nowSec = Math.floor(Date.now() / 1000)
  const assertion = signRs256Jwt(
    {
      iss: saEmail,
      sub: saEmail,
      aud: 'https://oauth2.googleapis.com/token',
      iat: nowSec,
      exp: nowSec + 3600,
      scope: WALLET_SCOPE,
    },
    privateKey,
  )

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.access_token) {
    const err = new Error(
      data.error_description ||
        data.error ||
        'Falha ao autenticar a service account no Google Wallet.',
    )
    err.status = 502
    err.code = 'GOOGLE_WALLET_AUTH_FAILED'
    throw err
  }
  return data.access_token
}

function buildEventTicketClass(classId, ticket) {
  return {
    id: classId,
    issuerName: 'CineRay',
    reviewStatus: 'UNDER_REVIEW',
    eventName: {
      defaultValue: {
        language: 'pt-BR',
        value: String(ticket.movieTitle || 'Ingresso CineRay'),
      },
    },
    venue: {
      name: {
        defaultValue: {
          language: 'pt-BR',
          value: String(ticket.cinema || 'Cinema'),
        },
      },
      address: {
        defaultValue: {
          language: 'pt-BR',
          value: String(ticket.room || 'Sala'),
        },
      },
    },
    dateTime: {
      start: buildGoogleDateTime(ticket.sessionDate, ticket.sessionTime),
    },
    hexBackgroundColor: '#1a0a12',
  }
}

function buildEventTicketObject(objectId, classId, ticket, shareUrl) {
  const eventId = sanitizeIdPart(ticket.sessionId || ticket.movieId || 'session')
  return {
    id: objectId,
    classId,
    state: 'ACTIVE',
    ticketHolderName: String(ticket.userEmail || 'Cliente CineRay'),
    ticketNumber: String(ticket.id),
    seatInfo: {
      seat: {
        defaultValue: {
          language: 'pt-BR',
          value: String(ticket.seatLabel || '—'),
        },
      },
      row: {
        defaultValue: {
          language: 'pt-BR',
          value: String(ticket.room || 'Sala'),
        },
      },
    },
    barcode: {
      type: 'QR_CODE',
      value: String(ticket.qrPayload),
      alternateText: 'CineRay',
    },
    textModulesData: [
      {
        id: 'session',
        header: 'Sessão',
        body: `${ticket.sessionDate || ''} ${ticket.sessionTime || ''}`.trim(),
      },
      {
        id: 'transfer',
        header: 'Enviar para iPhone',
        body: shareUrl,
      },
    ],
    linksModuleData: {
      uris: [
        {
          uri: shareUrl,
          description: 'Abrir ingresso (iPhone / compartilhar)',
          id: 'share',
        },
      ],
    },
    groupingInfo: {
      groupingId: eventId,
    },
  }
}

/**
 * Garante a Event Ticket Class via REST (evita AlreadyExists no JWT save).
 * Se a API REST ainda não estiver habilitada no GCP, retorna false para
 * o caller incluir a class no JWT (fluxo legado "skinny" com class+object).
 */
async function ensureEventTicketClass(classId, ticket, accessToken) {
  const getRes = await fetch(
    `${WALLET_API}/eventTicketClass/${encodeURIComponent(classId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (getRes.ok) return true

  const getBody = await getRes.text().catch(() => '')
  if (isWalletApiDisabledError(getRes.status, getBody)) {
    return false
  }

  if (getRes.status !== 404) {
    const err = new Error(friendlyWalletApiError(getRes.status, getBody))
    err.status = 502
    err.code = 'GOOGLE_WALLET_CLASS_ERROR'
    throw err
  }

  const createRes = await fetch(`${WALLET_API}/eventTicketClass`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildEventTicketClass(classId, ticket)),
  })

  if (createRes.ok || createRes.status === 409) return true

  const createBody = await createRes.text().catch(() => '')
  if (isWalletApiDisabledError(createRes.status, createBody)) {
    return false
  }

  const err = new Error(friendlyWalletApiError(createRes.status, createBody))
  err.status = 502
  err.code = 'GOOGLE_WALLET_CLASS_ERROR'
  throw err
}

function isWalletApiDisabledError(status, body) {
  if (status !== 403) return false
  return /SERVICE_DISABLED|accessNotConfigured|has not been used|is disabled/i.test(
    String(body || ''),
  )
}

function friendlyWalletApiError(status, body) {
  const text = String(body || '')
  if (isWalletApiDisabledError(status, text)) {
    return 'Google Wallet API desabilitada no Google Cloud. Ative walletobjects.googleapis.com no projeto da service account e tente de novo.'
  }
  if (status === 403) {
    return 'Sem permissão na Google Wallet. Adicione o e-mail da service account como usuário (Admin/Developer) no Pay & Wallet Console.'
  }
  return `Falha na Google Wallet API (${status}). ${text.slice(0, 280)}`.trim()
}

/**
 * Gera URL "Save to Google Wallet" com QR = ticket.qrPayload.
 * Grátis via Google Wallet API (precisa issuer + service account).
 */
export async function buildGoogleWalletSaveUrl(ticket, { origins = [] } = {}) {
  if (!isGoogleWalletConfigured()) {
    const err = new Error(
      'Google Wallet ainda não configurado. Defina GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_SA_EMAIL e GOOGLE_WALLET_SA_PRIVATE_KEY.',
    )
    err.status = 503
    err.code = 'GOOGLE_WALLET_NOT_CONFIGURED'
    throw err
  }

  const issuerId = env('GOOGLE_WALLET_ISSUER_ID')
  const saEmail = env('GOOGLE_WALLET_SA_EMAIL')
  const privateKey = normalizePem(env('GOOGLE_WALLET_SA_PRIVATE_KEY'))
  const classSuffix = env(
    'GOOGLE_WALLET_CLASS_SUFFIX',
    sanitizeIdPart(`movie_${ticket.movieId || ticket.movieTitle || 'event'}`),
  )
  const classId = `${issuerId}.${sanitizeIdPart(classSuffix)}`
  const objectId = `${issuerId}.${sanitizeIdPart(`tkt_${ticket.id}`)}`

  const appOrigin = env('APP_PUBLIC_URL', 'http://localhost:5173').replace(/\/$/, '')
  const sharePath =
    ticket.sharePath ||
    (ticket.shareToken ? `/i/${ticket.shareToken}` : '')
  const shareUrl = sharePath ? `${appOrigin}${sharePath}` : appOrigin

  const allowedOrigins = [
    ...origins,
    ...env('GOOGLE_WALLET_ORIGINS')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    appOrigin,
  ].filter((value, index, all) => value && all.indexOf(value) === index)

  let classReady = false
  try {
    const accessToken = await getGoogleAccessToken(saEmail, privateKey)
    classReady = await ensureEventTicketClass(classId, ticket, accessToken)
  } catch (error) {
    if (error.code === 'GOOGLE_WALLET_AUTH_FAILED') throw error
    // Se a REST falhar por outro motivo, ainda tenta o JWT com class+object.
    classReady = false
  }

  const nowSec = Math.floor(Date.now() / 1000)
  const payload = {
    eventTicketObjects: [
      buildEventTicketObject(objectId, classId, ticket, shareUrl),
    ],
  }
  if (!classReady) {
    payload.eventTicketClasses = [buildEventTicketClass(classId, ticket)]
  }

  const claims = {
    iss: saEmail,
    aud: 'google',
    typ: 'savetowallet',
    iat: nowSec,
    origins: allowedOrigins,
    payload,
  }

  const token = signRs256Jwt(claims, privateKey)
  return {
    saveUrl: `https://pay.google.com/gp/v/save/${token}`,
    objectId,
    classId,
    shareUrl,
    classEnsuredViaApi: classReady,
  }
}

/** Converte "09/08/2026" + "20:30" em ISO aproximado para o passe. */
function buildGoogleDateTime(sessionDate, sessionTime) {
  const dateMatch = String(sessionDate || '').match(/(\d{2})\/(\d{2})\/(\d{4})/)
  const [hours = '20', minutes = '00'] = String(sessionTime || '20:00').split(':')
  if (!dateMatch) {
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
  const [, day, month, year] = dateMatch
  const iso = `${year}-${month}-${day}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) {
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
  return parsed.toISOString()
}
