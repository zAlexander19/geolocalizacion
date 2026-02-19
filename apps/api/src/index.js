// Carga redundante de dotenv por seguridad si se ejecuta index.js directamente
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

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

