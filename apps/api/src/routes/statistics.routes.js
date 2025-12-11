import express from 'express'
import * as statisticsController from '../controllers/statistics.controller.js'

const router = express.Router()

// Ruta pública para registrar búsquedas
router.post('/log', statisticsController.logSearch)

// Rutas para administradores (temporalmente sin autenticación)
// TODO: Añadir autenticación cuando esté implementada
router.get('/summary', statisticsController.getStatistics)
router.get('/report', statisticsController.getFullReport)
router.get('/export', statisticsController.exportStatistics)

export default router
