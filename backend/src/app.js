import express from 'express'
import cors from 'cors'
import routes from './routes/index.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { getDbBootError, isDbReady } from './db/ready.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  if (!isDbReady()) {
    const error = getDbBootError()
    return res.status(503).json({
      status: 'starting',
      ...(error ? { error } : {}),
    })
  }
  res.json({ status: 'ok' })
})

app.use('/api', (req, res, next) => {
  if (!isDbReady()) {
    return res.status(503).json({
      message: 'API iniciando (banco). Tente de novo em alguns segundos.',
      code: 'DB_STARTING',
    })
  }
  return next()
})

app.use('/api', routes)

app.use(errorHandler)

export default app
