import { Router } from 'express'
import authRoutes from './auth.routes.js'
import catalogRoutes from './catalog.routes.js'
import chatRoutes from './chat.routes.js'
import moviesRoutes from './movies.routes.js'
import showtimesRoutes from './showtimes.routes.js'
import seatsRoutes from './seats.routes.js'
import ticketsRoutes from './tickets.routes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/catalog', catalogRoutes)
router.use('/chat', chatRoutes)
router.use('/tickets', ticketsRoutes)
router.use('/movies', moviesRoutes)
router.use('/showtimes', showtimesRoutes)
router.use('/seats', seatsRoutes)

export default router
