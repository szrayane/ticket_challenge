import { Router } from 'express'
import {
  addMovieShowtime,
  createMovie,
  getMovie,
  getMovieShowtimes,
  listAdminMovies,
  listMovies,
  organizerReport,
  removeMovie,
  setActiveMovie,
  updateMovie,
} from '../controllers/movies.controller.js'
import { optionalAuth, requireAuth, requireRole } from '../middlewares/auth.js'

const router = Router()

router.get(
  '/admin',
  requireAuth,
  requireRole('organizador'),
  listAdminMovies,
)
router.get(
  '/report',
  requireAuth,
  requireRole('organizador'),
  organizerReport,
)

router.get('/', listMovies)
router.get('/:id', optionalAuth, getMovie)
router.get('/:id/showtimes', optionalAuth, getMovieShowtimes)

router.post('/', requireAuth, requireRole('organizador'), createMovie)
router.patch('/:id', requireAuth, requireRole('organizador'), updateMovie)
router.post(
  '/:id/active',
  requireAuth,
  requireRole('organizador'),
  setActiveMovie,
)
router.delete('/:id', requireAuth, requireRole('organizador'), removeMovie)
router.post(
  '/:id/showtimes',
  requireAuth,
  requireRole('organizador'),
  addMovieShowtime,
)

export default router
