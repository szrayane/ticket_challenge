import { Router } from 'express'
import {
  changePassword,
  login,
  logout,
  me,
  register,
  registerStaff,
  updateProfile,
} from '../controllers/auth.controller.js'
import { requireAuth } from '../middlewares/auth.js'

const router = Router()

router.post('/register', register)
router.post('/staff/register', registerStaff)
router.post('/login', login)
router.get('/me', requireAuth, me)
router.post('/logout', requireAuth, logout)
router.patch('/profile', requireAuth, updateProfile)
router.post('/password', requireAuth, changePassword)

export default router
