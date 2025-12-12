import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pkg from 'pg'
const { Pool } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Cargar .env
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'geolocalizacion',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
})

async function createAuditTable() {
  console.log('🔧 Creando tabla audit_logs...\n')
  
  try {
    const client = await pool.connect()
    console.log('✅ Conectado a la base de datos')
    
    // Crear tabla
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id_audit SERIAL PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL CHECK (action IN ('crear', 'modificar', 'eliminar')),
        entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('edificio', 'piso', 'sala', 'baño', 'facultad')),
        entity_id VARCHAR(50) NOT NULL,
        entity_name VARCHAR(255),
        changes JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Tabla audit_logs creada')
    
    // Crear índices
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_email)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)')
    console.log('✅ Índices creados')
    
    // Verificar
    const result = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name = 'audit_logs'
    `)
    
    if (result.rows[0].count > 0) {
      console.log('\n✅ ¡Tabla audit_logs configurada correctamente!')
    }
    
    client.release()
    await pool.end()
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

createAuditTable()
