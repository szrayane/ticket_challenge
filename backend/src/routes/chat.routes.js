import { Router } from 'express'
import { postChatAction, postChatMessage } from '../controllers/chat.controller.js'
import { optionalAuth, requireAuth } from '../middlewares/auth.js'

const router = Router()

router.post('/message', optionalAuth, postChatMessage)

router.post('/action', optionalAuth, (req, res, next) => {
  const action = String(req.body?.action || '')
  if (action === 'confirm_pix' || action === 'cancel_ticket') {
    return requireAuth(req, res, (err) => {
      if (err) return next(err)
      return postChatAction(req, res, next)
    })
  }
  return postChatAction(req, res, next)
})

export default router
