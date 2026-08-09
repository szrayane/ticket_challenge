import { Router } from 'express'
import {
  createEvent,
  getCatalogCast,
  getCatalogMovie,
  searchCatalog,
} from '../controllers/catalog.controller.js'
import { requireAuth, requireRole } from '../middlewares/auth.js'

const router = Router()

/** Público: elenco ao abrir a página do filme. */
router.get('/cast', getCatalogCast)

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
