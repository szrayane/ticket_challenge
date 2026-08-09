import { Router } from 'express'
import {
  createEvent,
  getCatalogMovie,
  searchCatalog,
} from '../controllers/catalog.controller.js'
import { requireAuth, requireRole } from '../middlewares/auth.js'

const router = Router()

router.get(
  '/tmdb/search',
  requireAuth,
  requireRole('organizador'),
  searchCatalog,
)
router.get(
  '/tmdb/:tmdbId',
  requireAuth,
  requireRole('organizador'),
  getCatalogMovie,
)
router.post('/events', requireAuth, requireRole('organizador'), createEvent)

export default router
