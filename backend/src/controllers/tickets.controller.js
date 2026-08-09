import {
  cancelTicketForUser,
  createTickets,
  getTicketByShareToken,
  listGateSessions,
  listRecentCheckIns,
  listTicketsForUser,
  validateTicketCheckIn,
} from '../services/tickets.service.js'

export function listMyTickets(req, res, next) {
  try {
    const tickets = listTicketsForUser(req.user.id)
    res.json({ tickets })
  } catch (error) {
    next(error)
  }
}

export function createMyTickets(req, res, next) {
  try {
    const holderKey = String(
      req.body?.holderKey || req.headers['x-hold-key'] || '',
    ).trim()
    const tickets = createTickets(req.user, req.body?.tickets || [], {
      holderKey,
    })
    res.status(201).json({ tickets })
  } catch (error) {
    next(error)
  }
}

export function cancelMyTicket(req, res, next) {
  try {
    const ticket = cancelTicketForUser(req.user.id, req.params.id)
    res.json({ ticket })
  } catch (error) {
    next(error)
  }
}

export function getSharedTicket(req, res, next) {
  try {
    const ticket = getTicketByShareToken(req.params.shareToken)
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

export function listGateCheckIns(req, res, next) {
  try {
    const tickets = listRecentCheckIns({
      limit: Number(req.query.limit) || 30,
    })
    res.json({ tickets })
  } catch (error) {
    next(error)
  }
}

export function listGateActiveSessions(req, res, next) {
  try {
    res.json({
      sessions: listGateSessions({
        beforeMinutes: Number(req.query.beforeMinutes) || 60,
        afterMinutes: Number(req.query.afterMinutes) || 180,
      }),
    })
  } catch (error) {
    next(error)
  }
}

export function validateTicket(req, res, next) {
  try {
    const result = validateTicketCheckIn(
      req.user,
      req.body?.qrPayload || req.body?.payload || '',
      {
        expectedSessionId: req.body?.expectedSessionId,
        force: Boolean(req.body?.force),
      },
    )
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
