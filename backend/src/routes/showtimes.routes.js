import { Router } from 'express'
import {
  cloneShowtime,
  getOccupancy,
  getShowtimeSeats,
  patchShowtime,
  removeShowtime,
} from '../controllers/showtimes.controller.js'
import { requireAuth, requireRole } from '../middlewares/auth.js'

const router = Router()

router.get('/:id/seats', getShowtimeSeats)
router.get(
  '/:id/occupancy',
  requireAuth,
  requireRole('organizador'),
  getOccupancy,
)
router.patch('/:id', requireAuth, requireRole('organizador'), patchShowtime)
router.post(
  '/:id/duplicate',
  requireAuth,
  requireRole('organizador'),
  cloneShowtime,
)
router.delete(
  '/:id',
  requireAuth,
  requireRole('organizador'),
  removeShowtime,
)

export default router
