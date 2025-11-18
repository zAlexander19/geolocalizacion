import 'dotenv/config'
import { createApp } from './app.js'

const PORT = process.env.PORT || 4000
const app = createApp()

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════╗
║   🌍 Geolocalizacion API Server        ║
╚════════════════════════════════════════╝
  Environment: ${process.env.NODE_ENV || 'development'}
  Port: ${PORT}
  CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}
  Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'JSON (db.json)'}
  `)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

