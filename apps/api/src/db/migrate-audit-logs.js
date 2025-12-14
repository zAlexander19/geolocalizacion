/**
 * Script para migrar la tabla audit_logs
 * Ejecutar: node src/db/migrate-audit-logs.js
 */

import pkg from 'pg'
const { Pool } = pkg
import dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'geolocalizacion',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
})

async function migrateAuditLogs() {
  const client = await pool.connect()
  
  try {
    console.log('Migrando tabla audit_logs...')
    
    // Agregar columna id_usuario
    await client.query(`
      ALTER TABLE audit_logs 
      ADD COLUMN IF NOT EXISTS id_usuario INTEGER
    `)
    console.log('✓ Columna id_usuario agregada')
    
    // Agregar foreign key
    await client.query(`
      ALTER TABLE audit_logs 
      DROP CONSTRAINT IF EXISTS fk_audit_logs_usuario
    `)
    
    await client.query(`
      ALTER TABLE audit_logs 
      ADD CONSTRAINT fk_audit_logs_usuario 
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
    `)
    console.log('✓ Foreign key creada')
    
    // Crear índice
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario ON audit_logs(id_usuario)
    `)
    console.log('✓ Índice creado')
    
    // Agregar comentarios
    await client.query(`
      COMMENT ON COLUMN audit_logs.user_email IS 'Email del usuario (legacy - mantener para logs antiguos)'
    `)
    
    await client.query(`
      COMMENT ON COLUMN audit_logs.id_usuario IS 'ID del usuario que realizó la acción (nuevo sistema)'
    `)
    console.log('✓ Comentarios agregados')
    
    console.log('\n✅ Migración completada exitosamente')
    console.log('\nAhora la tabla audit_logs puede guardar:')
    console.log('- user_email: Para logs antiguos (legacy)')
    console.log('- id_usuario: Para nuevos logs con sistema de usuarios\n')
    
  } catch (error) {
    console.error('Error al migrar audit_logs:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

migrateAuditLogs()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
