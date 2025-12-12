import { Router } from 'express'
import { getAuditLogsHandler, getAuditLogByIdHandler } from '../controllers/audit.controller.js'

const router = Router()

// GET /audit-logs - Obtener historial de auditoría
router.get('/', getAuditLogsHandler)

// GET /audit-logs/:id - Obtener un registro específico
router.get('/:id', getAuditLogByIdHandler)

export default router
