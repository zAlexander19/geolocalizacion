import { getAuditLogs, getAuditLogById } from '../services/audit.service.js'

/**
 * Obtiene el historial de auditoría con filtros
 */
export async function getAuditLogsHandler(req, res) {
  try {
    const { userEmail, action, entityType, limit = 100, offset = 0 } = req.query

    const result = await getAuditLogs({
      userEmail,
      action,
      entityType,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })

    return res.json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.offset + result.logs.length < result.total
      }
    })
  } catch (error) {
    console.error('Error al obtener historial de auditoría:', error)
    return res.status(500).json({
      success: false,
      message: 'Error al obtener historial de auditoría',
      error: error.message
    })
  }
}

/**
 * Obtiene un registro de auditoría específico
 */
export async function getAuditLogByIdHandler(req, res) {
  try {
    const { id } = req.params

    const log = await getAuditLogById(id)

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Registro de auditoría no encontrado'
      })
    }

    return res.json({
      success: true,
      data: log
    })
  } catch (error) {
    console.error('Error al obtener registro de auditoría:', error)
    return res.status(500).json({
      success: false,
      message: 'Error al obtener registro de auditoría',
      error: error.message
    })
  }
}
