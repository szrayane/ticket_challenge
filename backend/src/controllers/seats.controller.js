import {
  assertSeatsAvailable,
  holdSeat,
  listUnavailableSeatIds,
  refreshHolds,
  releaseSeat,
} from '../services/seats.service.js'

function holderFromRequest(req) {
  return String(
    req.body?.holderKey ||
      req.query?.holderKey ||
      req.headers['x-hold-key'] ||
      '',
  ).trim()
}

export function getOccupiedSeats(req, res, next) {
  try {
    const holderKey = holderFromRequest(req)
    const seatIds = listUnavailableSeatIds(req.params.sessionId, {
      excludeHolderKey: holderKey || undefined,
    })
    res.json({ sessionId: String(req.params.sessionId), seatIds })
  } catch (error) {
    next(error)
  }
}

export function checkSeatsAvailability(req, res, next) {
  try {
    const sessionId = req.body?.sessionId
    const seatIds = req.body?.seatIds || []
    const holderKey = holderFromRequest(req)
    assertSeatsAvailable(sessionId, seatIds, { holderKey })
    res.json({ available: true })
  } catch (error) {
    next(error)
  }
}

export function holdSeatController(req, res, next) {
  try {
    const result = holdSeat({
      sessionId: req.body?.sessionId,
      seatId: req.body?.seatId,
      holderKey: holderFromRequest(req),
    })
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export function releaseSeatController(req, res, next) {
  try {
    const result = releaseSeat({
      sessionId: req.body?.sessionId,
      seatId: req.body?.seatId,
      holderKey: holderFromRequest(req),
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export function refreshHoldsController(req, res, next) {
  try {
    const result = refreshHolds({
      sessionId: req.body?.sessionId,
      seatIds: req.body?.seatIds || [],
      holderKey: holderFromRequest(req),
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
}
