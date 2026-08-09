import { Router } from 'express'
import {
  cancelMyTicket,
  createMyTickets,
  listGateActiveSessions,
  listGateCheckIns,
  listMyTickets,
  validateTicket,
} from '../controllers/tickets.controller.js'
import { requireAuth, requireRole } from '../middlewares/auth.js'

const router = Router()

router.post(
  '/validate',
  requireAuth,
  requireRole('portaria'),
  validateTicket,
)
router.get(
  '/gate/sessions',
  requireAuth,
  requireRole('portaria'),
  listGateActiveSessions,
)
router.get(
  '/gate/checkins',
  requireAuth,
  requireRole('portaria'),
  listGateCheckIns,
)

router.use(requireAuth)
router.get('/', listMyTickets)
router.post('/', createMyTickets)
router.post('/:id/cancel', cancelMyTicket)

export default router
