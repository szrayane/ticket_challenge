import {
  cancelTicketForUser,
  claimTicketTransfer,
  createTicketTransfer,
  createTickets,
  getTicketByShareToken,
  getTicketForUser,
  getTransferPreview,
  listGateSessions,
  listRecentCheckIns,
  listTicketsForUser,
  validateTicketCheckIn,
} from '../services/tickets.service.js'
import {
  buildGoogleWalletSaveUrl,
  getGoogleWalletStatus,
} from '../services/googleWallet.service.js'
import {
  publishGateCheckIn,
  publishOrganizerStats,
  publishSessionSeats,
} from '../realtime/hub.js'

export async function listMyTickets(req, res, next) {
  try {
    const tickets = await listTicketsForUser(req.user.id)
    res.json({ tickets })
  } catch (error) {
    next(error)
  }
}

export async function createMyTickets(req, res, next) {
  try {
    const holderKey = String(
      req.body?.holderKey || req.headers['x-hold-key'] || '',
    ).trim()
    const tickets = await createTickets(req.user, req.body?.tickets || [], {
      holderKey,
    })
    const sessionIds = [...new Set(tickets.map((t) => t.sessionId))]
    for (const sessionId of sessionIds) {
      publishSessionSeats(sessionId, { action: 'sold' })
    }
    publishOrganizerStats({ action: 'sold' })
    res.status(201).json({ tickets })
  } catch (error) {
    next(error)
  }
}

export async function cancelMyTicket(req, res, next) {
  try {
    const ticket = await cancelTicketForUser(req.user.id, req.params.id)
    publishSessionSeats(ticket.sessionId, { action: 'cancel', seatId: ticket.seatId })
    publishOrganizerStats({ action: 'cancel' })
    res.json({ ticket })
  } catch (error) {
    next(error)
  }
}

export async function getSharedTicket(req, res, next) {
  try {
    const ticket = await getTicketByShareToken(req.params.shareToken)
    if (!ticket || ticket.status === 'cancelled') {
      return res.status(404).json({ message: 'Ingresso não encontrado.' })
    }
    res.json({
      ticket: {
        id: ticket.id,
        movieTitle: ticket.movieTitle,
        moviePoster: ticket.moviePoster,
        sessionDate: ticket.sessionDate,
        sessionTime: ticket.sessionTime,
        cinema: ticket.cinema,
        room: ticket.room,
        seatLabel: ticket.seatLabel,
        qrPayload: ticket.qrPayload,
        status: ticket.status,
        checkedInAt: ticket.checkedInAt,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function listGateCheckIns(req, res, next) {
  try {
    const tickets = await listRecentCheckIns({
      limit: Number(req.query.limit) || 30,
    })
    res.json({ tickets })
  } catch (error) {
    next(error)
  }
}

export async function listGateActiveSessions(req, res, next) {
  try {
    res.json({
      sessions: await listGateSessions({
        beforeMinutes: Number(req.query.beforeMinutes) || 60,
        afterMinutes: Number(req.query.afterMinutes) || 180,
      }),
    })
  } catch (error) {
    next(error)
  }
}

export async function validateTicket(req, res, next) {
  try {
    const result = await validateTicketCheckIn(
      req.user,
      req.body?.qrPayload || req.body?.payload || '',
      {
        expectedSessionId: req.body?.expectedSessionId,
        force: Boolean(req.body?.force),
      },
    )
    publishGateCheckIn({
      ticketId: result.ticket?.id,
      sessionId: result.ticket?.sessionId,
    })
    res.json(result)
  } catch (error) {
    if (error.ticket || error.code) {
      return res.status(error.status || 409).json({
        message: error.message,
        code: error.code,
        ticket: error.ticket,
      })
    }
    next(error)
  }
}

export async function createTransfer(req, res, next) {
  try {
    const result = await createTicketTransfer(req.user.id, req.params.id)
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export async function previewTransfer(req, res, next) {
  try {
    const preview = await getTransferPreview(req.params.token)
    if (!preview) {
      return res.status(404).json({ message: 'Link de transferência inválido ou expirado.' })
    }
    res.json({ transfer: preview })
  } catch (error) {
    next(error)
  }
}

export async function claimTransfer(req, res, next) {
  try {
    const ticket = await claimTicketTransfer(req.user, req.params.token)
    publishOrganizerStats({ action: 'transfer' })
    res.json({ ticket })
  } catch (error) {
    next(error)
  }
}

export async function googleWalletStatus(_req, res) {
  res.json(getGoogleWalletStatus())
}

export async function getMyTicketGoogleWallet(req, res, next) {
  try {
    const ticket = await getTicketForUser(req.user.id, req.params.id)
    if (!ticket) {
      return res.status(404).json({ message: 'Ingresso não encontrado.' })
    }
    if (ticket.status === 'cancelled') {
      return res.status(409).json({ message: 'Ingresso cancelado.' })
    }

    const originHeader = String(req.headers.origin || '').trim()
    const result = await buildGoogleWalletSaveUrl(ticket, {
      origins: originHeader ? [originHeader] : [],
    })
    res.json({
      ...result,
      ticketId: ticket.id,
    })
  } catch (error) {
    if (error.code === 'GOOGLE_WALLET_NOT_CONFIGURED') {
      return res.status(503).json({
        message: error.message,
        code: error.code,
        configured: false,
      })
    }
    if (
      error.code === 'GOOGLE_WALLET_AUTH_FAILED' ||
      error.code === 'GOOGLE_WALLET_CLASS_ERROR' ||
      error.code === 'GOOGLE_WALLET_BAD_PRIVATE_KEY'
    ) {
      return res.status(error.status || 502).json({
        message: error.message,
        code: error.code,
      })
    }
    next(error)
  }
}
