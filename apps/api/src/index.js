import { createApp } from './app.js'
import createStatisticsTable from './db/create-statistics.js'
import logger from './utils/logger.js'

const app = createApp()
const PORT = process.env.PORT || 4000

console.log(`🚀 Iniciando servidor en puerto: ${PORT} (NODE_ENV: ${process.env.NODE_ENV})`)

// Crear tabla de estadísticas si no existe
createStatisticsTable().catch(err => {
  logger.error('Error al inicializar tabla de estadísticas:', err)
})

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`API escuchando en puerto ${PORT}`)
  console.log(`✅ Servidor listo en http://0.0.0.0:${PORT}`)
})

