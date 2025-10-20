import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import authRoutes from './routes/auth.routes.js'
import buildingsRoutes from './routes/buildings.routes.js'
import floorsRoutes from './routes/floors.routes.js'
import roomsRoutes from './routes/rooms.routes.js'
import { db } from './db/memory.js'

dotenv.config()

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json())

  // Servir archivos estáticos de /uploads
  app.use('/uploads', express.static(process.cwd() + '/apps/api/uploads'))

  app.get('/health', (_req, res) => {
    res.status(200).json({ data: { status: 'ok' }, error: null })
  })

  // Debug endpoint to view in-memory database
  app.get('/debug/db', (_req, res) => {
    res.status(200).json({ data: db, error: null })
  })

  app.use('/auth', authRoutes)
  app.use('/', buildingsRoutes)
  app.use('/', floorsRoutes)
  app.use('/', roomsRoutes)

  // 404
  app.use((req, res) => {
    res.status(404).json({ data: null, error: { message: 'NOT_FOUND' } })
  })

  // Error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err)
    if (err?.type === 'VALIDATION_ERROR') {
      return res
        .status(400)
        .json({ data: null, error: 'VALIDATION_ERROR', details: err.details })
    }
    res.status(500).json({ data: null, error: 'INTERNAL_ERROR' })
  })

  return app
}
