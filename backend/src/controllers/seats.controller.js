import {
  assertSeatsAvailable,
  holdSeat,
  listUnavailableSeatIds,
  refreshHolds,
  releaseSeat,
} from '../services/seats.service.js'
import { publishSessionSeats } from '../realtime/hub.js'

function holderFromRequest(req) {
  return String(
    req.body?.holderKey ||
      req.query?.holderKey ||
      req.headers['x-hold-key'] ||
      '',
  ).trim()
}

export async function getOccupiedSeats(req, res, next) {
  try {
    const holderKey = holderFromRequest(req)
    const seatIds = await listUnavailableSeatIds(req.params.sessionId, {
      excludeHolderKey: holderKey || undefined,
    })
    res.json({ sessionId: String(req.params.sessionId), seatIds })
  } catch (error) {
    next(error)
  }
}

export async function checkSeatsAvailability(req, res, next) {
  try {
    const sessionId = req.body?.sessionId
    const seatIds = req.body?.seatIds || []
    const holderKey = holderFromRequest(req)
    await assertSeatsAvailable(sessionId, seatIds, { holderKey })
    res.json({ available: true })
  } catch (error) {
    next(error)
  }
}

export async function holdSeatController(req, res, next) {
  try {
    const result = await holdSeat({
      sessionId: req.body?.sessionId,
      seatId: req.body?.seatId,
      holderKey: holderFromRequest(req),
    })
    publishSessionSeats(req.body?.sessionId, {
      action: 'hold',
      seatId: req.body?.seatId,
    })
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export async function releaseSeatController(req, res, next) {
  try {
    const result = await releaseSeat({
      sessionId: req.body?.sessionId,
      seatId: req.body?.seatId,
      holderKey: holderFromRequest(req),
    })
    publishSessionSeats(req.body?.sessionId, {
      action: 'release',
      seatId: req.body?.seatId,
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export async function refreshHoldsController(req, res, next) {
  try {
    const result = await refreshHolds({
      sessionId: req.body?.sessionId,
      seatIds: req.body?.seatIds || [],
      holderKey: holderFromRequest(req),
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
}
