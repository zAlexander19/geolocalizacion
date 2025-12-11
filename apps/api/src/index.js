import { createApp } from './app.js'
import createStatisticsTable from './db/create-statistics.js'

const app = createApp()
const PORT = process.env.PORT || 4000

// Crear tabla de estadísticas si no existe
createStatisticsTable().catch(err => {
	console.error('Error al inicializar tabla de estadísticas:', err)
})

app.listen(PORT, () => {
	console.log(`API listening on http://localhost:${PORT}`)
})

