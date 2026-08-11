import { handleChatMessage } from '../services/chat/index.js'
import {
  confirmPendingPixPayment,
  executeTool,
} from '../services/chat/tools.js'
import { getOrCreateChatSession } from '../services/chat/sessions.js'

function sessionFromReq(req) {
  return getOrCreateChatSession({
    sessionId: req.body?.sessionId,
    userId: req.user?.id || null,
    holderKey: String(
      req.body?.holderKey || req.headers['x-hold-key'] || '',
    ).trim(),
  })
}

function toolCtx(req, session) {
  return {
    user: req.user || null,
    holderKey: session.holderKey,
    sessionId: session.id,
  }
}

export async function postChatMessage(req, res, next) {
  try {
    const message = String(req.body?.message || '').trim()
    if (!message) {
      return res.status(400).json({ message: 'Envie uma mensagem.' })
    }

    const result = await handleChatMessage({
      sessionId: req.body?.sessionId,
      message,
      user: req.user || null,
      holderKey: String(
        req.body?.holderKey || req.headers['x-hold-key'] || '',
      ).trim(),
    })

    res.json({
      sessionId: result.sessionId,
      holderKey: result.holderKey,
      provider: result.provider,
      message: {
        role: 'assistant',
        content: result.reply,
        ui: result.uiBlocks,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function postChatAction(req, res, next) {
  try {
    const action = String(req.body?.action || '').trim()
    const session = sessionFromReq(req)
    const ctx = toolCtx(req, session)

    if (action === 'confirm_pix') {
      const pendingId = String(req.body?.pendingId || '').trim()
      if (!pendingId) {
        return res.status(400).json({ message: 'pendingId é obrigatório.' })
      }
      const result = await confirmPendingPixPayment(pendingId, req.user)
      return res.json({
        sessionId: session.id,
        holderKey: session.holderKey,
        message: {
          role: 'assistant',
          content: `Pagamento Pix confirmado (simulado)! Ingressos gerados para ${result.tickets.map((t) => t.seatLabel).join(', ')}. Veja em Minha conta.`,
          ui: result.ui ? [result.ui] : [],
        },
        tickets: result.tickets,
        orderId: result.orderId,
      })
    }

    if (action === 'cancel_ticket') {
      const ticketId = String(req.body?.ticketId || '').trim()
      if (!ticketId) {
        return res.status(400).json({ message: 'ticketId é obrigatório.' })
      }
      const result = await executeTool('cancel_ticket', { ticketId }, ctx)
      if (!result.ok) {
        const status = result.needsAuth ? 401 : 400
        return res.status(status).json({ message: result.message })
      }
      return res.json({
        sessionId: session.id,
        holderKey: session.holderKey,
        message: {
          role: 'assistant',
          content: result.message,
          ui: result.ui ? [result.ui] : [],
        },
      })
    }

    if (action === 'pick_movie') {
      const movieId = String(req.body?.movieId || '').trim()
      if (!movieId) {
        return res.status(400).json({ message: 'movieId é obrigatório.' })
      }
      const result = await executeTool('list_showtimes', { movieId }, ctx)
      if (!result.ok) {
        return res.status(400).json({ message: result.message })
      }
      const title = result.movie?.title || 'este filme'
      return res.json({
        sessionId: session.id,
        holderKey: session.holderKey,
        message: {
          role: 'assistant',
          content: result.showtimes?.length
            ? `Horários disponíveis para ${title}. Escolha uma sessão (vou reservar 1 assento; diga se quiser mais).`
            : `Não há sessões futuras com vagas para ${title}.`,
          ui: result.ui ? [result.ui] : [],
        },
      })
    }

    if (action === 'pick_showtime') {
      const showtimeId = String(req.body?.showtimeId || '').trim()
      const quantity = Math.min(
        Math.max(Number(req.body?.quantity) || 1, 1),
        6,
      )
      if (!showtimeId) {
        return res.status(400).json({ message: 'showtimeId é obrigatório.' })
      }

      const seatsResult = await executeTool(
        'suggest_seats',
        { showtimeId, quantity },
        ctx,
      )
      if (!seatsResult.ok) {
        return res.status(400).json({ message: seatsResult.message })
      }

      const uiBlocks = seatsResult.ui ? [seatsResult.ui] : []
      let content = `Separei ${quantity} assento(s): ${seatsResult.seats.map((s) => s.label).join(', ')}.`

      if (!ctx.user) {
        content +=
          ' Faça login como cliente para eu gerar o QR Pix e concluir a compra.'
        return res.json({
          sessionId: session.id,
          holderKey: session.holderKey,
          message: { role: 'assistant', content, ui: uiBlocks },
        })
      }

      const pixResult = await executeTool(
        'prepare_pix_purchase',
        {
          showtimeId,
          seatIds: seatsResult.seats.map((s) => s.id),
        },
        ctx,
      )

      if (!pixResult.ok) {
        content += ` ${pixResult.message || 'Não consegui gerar o Pix agora.'}`
        return res.json({
          sessionId: session.id,
          holderKey: session.holderKey,
          message: {
            role: 'assistant',
            content,
            ui: uiBlocks,
          },
        })
      }

      if (pixResult.ui) uiBlocks.push(pixResult.ui)
      content +=
        ' Escaneie o QR Pix (fictício) e toque em "Já paguei — confirmar".'

      return res.json({
        sessionId: session.id,
        holderKey: session.holderKey,
        message: {
          role: 'assistant',
          content,
          ui: uiBlocks,
        },
      })
    }

    return res.status(400).json({ message: `Ação desconhecida: ${action}` })
  } catch (error) {
    next(error)
  }
}
