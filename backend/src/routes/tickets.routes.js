import { Router } from 'express'
import {
  cancelMyTicket,
  claimTransfer,
  createMyTickets,
  createTransfer,
  getMyTicketGoogleWallet,
  getSharedTicket,
  googleWalletStatus,
  listGateActiveSessions,
  listGateCheckIns,
  listMyTickets,
  previewTransfer,
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
router.get('/share/:shareToken', getSharedTicket)
router.get('/transfer/:token', previewTransfer)
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
router.get('/wallet/google/status', googleWalletStatus)

router.use(requireAuth)
router.get('/', listMyTickets)
router.post('/', requireRole('cliente'), createMyTickets)
router.post('/transfer/:token/claim', requireRole('cliente'), claimTransfer)
router.get('/:id/google-wallet', requireRole('cliente'), getMyTicketGoogleWallet)
router.post('/:id/transfer', requireRole('cliente'), createTransfer)
router.post('/:id/cancel', requireRole('cliente'), cancelMyTicket)

export default router
