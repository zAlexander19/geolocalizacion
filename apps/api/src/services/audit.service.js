import pool from '../config/database.js'

/**
 * Registra una acción en el historial de auditoría
 * @param {Object} params
 * @param {number} params.userId - ID del usuario que realizó la acción
 * @param {string} params.userEmail - Email del usuario (legacy, opcional)
 * @param {string} params.action - Tipo de acción: 'crear', 'modificar', 'eliminar'
 * @param {string} params.entityType - Tipo de entidad: 'edificio', 'piso', 'sala', 'baño', 'facultad'
 * @param {string|number} params.entityId - ID de la entidad
 * @param {string} params.entityName - Nombre de la entidad
 * @param {Object} params.changes - Objeto con los cambios realizados
 */
export async function logAudit({ userId, userEmail = null, action, entityType, entityId, entityName, changes = null }) {
  try {
    const query = `
      INSERT INTO audit_logs (id_usuario, user_email, action, entity_type, entity_id, entity_name, changes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `
    const values = [
      userId || null,
      userEmail || null,
      action,
      entityType,
      String(entityId),
      entityName,
      changes ? JSON.stringify(changes) : null
    ]

    const result = await pool.query(query, values)
    return result.rows[0]
  } catch (error) {
    console.error('Error al registrar auditoría:', error)
    // No lanzamos el error para no interrumpir la operación principal
  }
}

/**
 * Obtiene el historial de auditoría con filtros opcionales
 */
export async function getAuditLogs({ userEmail, action, entityType, limit = 100, offset = 0 }) {
  try {
    let query = `
      SELECT * FROM audit_logs
      WHERE 1=1
    `
    const values = []
    let paramIndex = 1

    if (userEmail) {
      query += ` AND user_email = $${paramIndex++}`
      values.push(userEmail)
    }

    if (action) {
      query += ` AND action = $${paramIndex++}`
      values.push(action)
    }

    if (entityType) {
      query += ` AND entity_type = $${paramIndex++}`
      values.push(entityType)
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    values.push(limit, offset)

    const result = await pool.query(query, values)
    
    // Obtener el total de registros
    let countQuery = `SELECT COUNT(*) as total FROM audit_logs WHERE 1=1`
    const countValues = []
    let countIndex = 1

    if (userEmail) {
      countQuery += ` AND user_email = $${countIndex++}`
      countValues.push(userEmail)
    }

    if (action) {
      countQuery += ` AND action = $${countIndex++}`
      countValues.push(action)
    }

    if (entityType) {
      countQuery += ` AND entity_type = $${countIndex++}`
      countValues.push(entityType)
    }

    const countResult = await pool.query(countQuery, countValues)
    const total = parseInt(countResult.rows[0].total)

    return {
      logs: result.rows,
      total,
      limit,
      offset
    }
  } catch (error) {
    console.error('Error al obtener auditoría:', error)
    throw error
  }
}

/**
 * Obtiene un registro de auditoría específico
 */
export async function getAuditLogById(id) {
  try {
    const query = 'SELECT * FROM audit_logs WHERE id_audit = $1'
    const result = await pool.query(query, [id])
    return result.rows[0]
  } catch (error) {
    console.error('Error al obtener registro de auditoría:', error)
    throw error
  }
}
