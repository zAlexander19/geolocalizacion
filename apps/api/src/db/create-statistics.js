import pool from '../config/database.js'
import logger from '../utils/logger.js'

/**
 * Script para crear la tabla de estadísticas si no existe
 */
async function createStatisticsTable() {
  try {
    logger.info('🔍 Verificando tabla de estadísticas...')
    
    // Verificar si la tabla existe
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'search_logs'
      );
    `)
    
    if (checkTable.rows[0].exists) {
      logger.info('✅ Tabla search_logs ya existe')
      return
    }
    
    logger.info('📝 Creando tabla search_logs...')
    
    // Crear tabla
    await pool.query(`
      CREATE TABLE search_logs (
        id_log SERIAL PRIMARY KEY,
        search_type VARCHAR(50) NOT NULL,
        search_query VARCHAR(255),
        result_type VARCHAR(50),
        result_id INTEGER,
        result_name VARCHAR(255),
        user_location_lat DECIMAL(10, 8),
        user_location_lng DECIMAL(11, 8),
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    logger.info('📊 Creando índices...')
    
    // Crear índices
    await pool.query(`
      CREATE INDEX idx_search_logs_type ON search_logs(search_type);
    `)
    
    await pool.query(`
      CREATE INDEX idx_search_logs_result_type ON search_logs(result_type);
    `)
    
    await pool.query(`
      CREATE INDEX idx_search_logs_result_id ON search_logs(result_id);
    `)
    
    await pool.query(`
      CREATE INDEX idx_search_logs_created_at ON search_logs(created_at);
    `)
    
    logger.info('✅ Tabla de estadísticas creada exitosamente')
  } catch (error) {
    logger.error('❌ Error al crear tabla de estadísticas:', error)
    throw error
  }
}

export default createStatisticsTable
