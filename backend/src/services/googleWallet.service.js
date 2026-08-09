import { createPrivateKey, createSign } from 'node:crypto'

function env(name, fallback = '') {
  return String(process.env[name] ?? fallback).trim()
}

function normalizePem(value) {
  return String(value || '')
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '')
    .trim()
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
  const signature = signer
    .sign(createPrivateKey(normalizePem(privateKeyPem)))
    .toString('base64url')
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

/**
 * Gera URL "Save to Google Wallet" com QR = ticket.qrPayload.
 * Grátis via Google Wallet API (precisa issuer + service account).
 */
export function buildGoogleWalletSaveUrl(ticket, { origins = [] } = {}) {
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
  const classSuffix = env('GOOGLE_WALLET_CLASS_SUFFIX', 'cineray_event_ticket')
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

  const eventId = sanitizeIdPart(ticket.sessionId || ticket.movieId || 'session')
  const nowSec = Math.floor(Date.now() / 1000)

  const claims = {
    iss: saEmail,
    aud: 'google',
    typ: 'savetowallet',
    iat: nowSec,
    origins: allowedOrigins,
    payload: {
      eventTicketClasses: [
        {
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
        },
      ],
      eventTicketObjects: [
        {
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
        },
      ],
    },
  }

  const token = signRs256Jwt(claims, privateKey)
  return {
    saveUrl: `https://pay.google.com/gp/v/save/${token}`,
    objectId,
    classId,
    shareUrl,
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
