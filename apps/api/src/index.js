import { createApp } from './app.js'
import createStatisticsTable from './db/create-statistics.js'
import logger from './utils/logger.js'

const app = createApp()
const PORT = process.env.PORT || 4000

// Crear tabla de estadísticas si no existe
createStatisticsTable().catch(err => {
	logger.error('Error al inicializar tabla de estadísticas:', { error: err.message, stack: err.stack })
})

app.listen(PORT, () => {
	logger.info(`API listening on http://localhost:${PORT}`)
})

