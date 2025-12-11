import pool from '../config/database.js'

/**
 * Registrar una consulta de búsqueda
 */
async function logSearch(req, res) {
  try {
    const {
      searchType,
      searchQuery,
      resultType,
      resultId,
      resultName,
      userLocation
    } = req.body

    const ip = req.ip || req.connection.remoteAddress
    const userAgent = req.get('user-agent')

    const query = `
      INSERT INTO search_logs (
        search_type, search_query, result_type, result_id, result_name,
        user_location_lat, user_location_lng, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `

    const values = [
      searchType,
      searchQuery || null,
      resultType || null,
      resultId || null,
      resultName || null,
      userLocation?.lat || null,
      userLocation?.lng || null,
      ip,
      userAgent
    ]

    const result = await pool.query(query, values)

    res.json({
      success: true,
      message: 'Búsqueda registrada',
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error al registrar búsqueda:', error)
    res.status(500).json({
      success: false,
      message: 'Error al registrar la búsqueda',
      error: error.message
    })
  }
}

/**
 * Obtener estadísticas generales
 */
async function getStatistics(req, res) {
  try {
    const { startDate, endDate, type } = req.query

    // Consulta base de estadísticas
    let dateFilter = ''
    const params = []

    if (startDate && endDate) {
      dateFilter = `WHERE created_at BETWEEN $1 AND $2`
      params.push(startDate, endDate)
    }

    // Total de búsquedas
    const totalQuery = `
      SELECT COUNT(*) as total_searches
      FROM search_logs
      ${dateFilter}
    `
    const totalResult = await pool.query(totalQuery, params)

    // Búsquedas por tipo
    const byTypeQuery = `
      SELECT 
        search_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM search_logs ${dateFilter}), 2) as percentage
      FROM search_logs
      ${dateFilter}
      GROUP BY search_type
      ORDER BY count DESC
    `
    const byTypeResult = await pool.query(byTypeQuery, params)

    // Salas más buscadas
    const topRoomsQuery = `
      SELECT 
        result_name as name,
        result_id as id,
        COUNT(*) as searches
      FROM search_logs
      WHERE result_type = 'sala' ${startDate && endDate ? 'AND created_at BETWEEN $1 AND $2' : ''}
      GROUP BY result_name, result_id
      ORDER BY searches DESC
      LIMIT 10
    `
    const topRoomsResult = await pool.query(topRoomsQuery, params)

    // Edificios más buscados
    const topBuildingsQuery = `
      SELECT 
        result_name as name,
        result_id as id,
        COUNT(*) as searches
      FROM search_logs
      WHERE result_type = 'edificio' ${startDate && endDate ? 'AND created_at BETWEEN $1 AND $2' : ''}
      GROUP BY result_name, result_id
      ORDER BY searches DESC
      LIMIT 10
    `
    const topBuildingsResult = await pool.query(topBuildingsQuery, params)

    // Baños más buscados
    const topBathroomsQuery = `
      SELECT 
        result_name as name,
        result_id as id,
        COUNT(*) as searches
      FROM search_logs
      WHERE result_type = 'bano' ${startDate && endDate ? 'AND created_at BETWEEN $1 AND $2' : ''}
      GROUP BY result_name, result_id
      ORDER BY searches DESC
      LIMIT 10
    `
    const topBathroomsResult = await pool.query(topBathroomsQuery, params)

    // Búsquedas por día (últimos 30 días)
    const byDayQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as searches
      FROM search_logs
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `
    const byDayResult = await pool.query(byDayQuery)

    // Búsquedas por hora del día
    const byHourQuery = `
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as searches
      FROM search_logs
      ${dateFilter}
      GROUP BY hour
      ORDER BY hour
    `
    const byHourResult = await pool.query(byHourQuery, params)

    // Términos de búsqueda más frecuentes
    const topSearchTermsQuery = `
      SELECT 
        search_query,
        COUNT(*) as count
      FROM search_logs
      WHERE search_query IS NOT NULL AND search_query != ''
      ${startDate && endDate ? 'AND created_at BETWEEN $1 AND $2' : ''}
      GROUP BY search_query
      ORDER BY count DESC
      LIMIT 20
    `
    const topSearchTermsResult = await pool.query(topSearchTermsQuery, params)

    res.json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0].total_searches),
        byType: byTypeResult.rows,
        topRooms: topRoomsResult.rows,
        topBuildings: topBuildingsResult.rows,
        topBathrooms: topBathroomsResult.rows,
        byDay: byDayResult.rows,
        byHour: byHourResult.rows,
        topSearchTerms: topSearchTermsResult.rows
      }
    })
  } catch (error) {
    console.error('Error al obtener estadísticas:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    })
  }
}

/**
 * Obtener reporte completo de registros
 */
async function getFullReport(req, res) {
  try {
    const { startDate, endDate, limit = 1000 } = req.query

    let query = `
      SELECT 
        id_log,
        search_type,
        search_query,
        result_type,
        result_id,
        result_name,
        user_location_lat,
        user_location_lng,
        created_at
      FROM search_logs
    `

    const params = []
    if (startDate && endDate) {
      query += ` WHERE created_at BETWEEN $1 AND $2`
      params.push(startDate, endDate)
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`
    params.push(limit)

    const result = await pool.query(query, params)

    // Calcular porcentaje de registros
    const totalQuery = `SELECT COUNT(*) as total FROM search_logs`
    const totalResult = await pool.query(totalQuery)
    const totalRecords = parseInt(totalResult.rows[0].total)
    const returnedRecords = result.rows.length
    const percentage = totalRecords > 0 ? (returnedRecords / totalRecords) * 100 : 100

    res.json({
      success: true,
      data: {
        records: result.rows,
        total: totalRecords,
        returned: returnedRecords,
        percentage: percentage.toFixed(2)
      }
    })
  } catch (error) {
    console.error('Error al obtener reporte:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener el reporte',
      error: error.message
    })
  }
}

/**
 * Exportar estadísticas en CSV
 */
async function exportStatistics(req, res) {
  try {
    const { startDate, endDate } = req.query

    let query = `
      SELECT 
        id_log,
        search_type,
        search_query,
        result_type,
        result_id,
        result_name,
        user_location_lat,
        user_location_lng,
        created_at
      FROM search_logs
    `

    const params = []
    if (startDate && endDate) {
      query += ` WHERE created_at BETWEEN $1 AND $2`
      params.push(startDate, endDate)
    }

    query += ` ORDER BY created_at DESC`

    const result = await pool.query(query, params)

    // Convertir a CSV
    const headers = [
      'ID',
      'Tipo de Búsqueda',
      'Término de Búsqueda',
      'Tipo de Resultado',
      'ID Resultado',
      'Nombre Resultado',
      'Latitud',
      'Longitud',
      'Fecha'
    ]

    let csv = headers.join(',') + '\n'

    result.rows.forEach(row => {
      csv += [
        row.id_log,
        row.search_type || '',
        `"${(row.search_query || '').replace(/"/g, '""')}"`,
        row.result_type || '',
        row.result_id || '',
        `"${(row.result_name || '').replace(/"/g, '""')}"`,
        row.user_location_lat || '',
        row.user_location_lng || '',
        row.created_at ? new Date(row.created_at).toISOString() : ''
      ].join(',') + '\n'
    })

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=estadisticas.csv')
    res.send(csv)
  } catch (error) {
    console.error('Error al exportar estadísticas:', error)
    res.status(500).json({
      success: false,
      message: 'Error al exportar estadísticas',
      error: error.message
    })
  }
}

export {
  logSearch,
  getStatistics,
  getFullReport,
  exportStatistics
}
