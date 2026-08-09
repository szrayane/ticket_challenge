import 'dotenv/config'
import './db/index.js'
import app from './app.js'

const PORT = process.env.PORT || 3333

app.listen(PORT, () => {
  console.log(`CineRay API running on http://localhost:${PORT}`)
})
