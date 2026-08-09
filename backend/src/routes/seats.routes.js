import { Router } from 'express'
import {
  checkSeatsAvailability,
  getOccupiedSeats,
  holdSeatController,
  refreshHoldsController,
  releaseSeatController,
} from '../controllers/seats.controller.js'
import { requireAuth } from '../middlewares/auth.js'

const router = Router()

router.get('/occupied/:sessionId', getOccupiedSeats)
router.post('/hold', holdSeatController)
router.post('/release', releaseSeatController)
router.post('/refresh', refreshHoldsController)
router.post('/check', requireAuth, checkSeatsAvailability)

export default router
