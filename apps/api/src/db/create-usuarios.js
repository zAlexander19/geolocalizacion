/**
 * Script para crear la tabla de usuarios
 * Ejecutar: node src/db/create-usuarios.js
 */

import pkg from 'pg'
const { Pool } = pkg
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'geolocalizacion',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
})

async function createUsuariosTable() {
  const client = await pool.connect()
  
  try {
    console.log('Creando tabla usuarios...')
    
    // Drop table if exists
    await client.query('DROP TABLE IF EXISTS usuarios CASCADE')
    console.log('✓ Tabla usuarios eliminada (si existía)')
    
    // Create table
    await client.query(`
      CREATE TABLE usuarios (
        id_usuario SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        rol VARCHAR(20) NOT NULL DEFAULT 'admin_secundario' CHECK (rol IN ('admin_primario', 'admin_secundario')),
        estado BOOLEAN DEFAULT TRUE,
        ultimo_acceso TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ Tabla usuarios creada')
    
    // Create indexes
    await client.query('CREATE INDEX idx_usuarios_email ON usuarios(email)')
    await client.query('CREATE INDEX idx_usuarios_rol ON usuarios(rol)')
    await client.query('CREATE INDEX idx_usuarios_estado ON usuarios(estado)')
    console.log('✓ Índices creados')
    
    // Create trigger
    await client.query(`
      CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `)
    console.log('✓ Trigger creado')
    
    // Generate default admin password hash
    const defaultPassword = 'admin123'
    const passwordHash = await bcrypt.hash(defaultPassword, 10)
    
    // Insert default admin user
    await client.query(`
      INSERT INTO usuarios (nombre, email, password_hash, rol) 
      VALUES ($1, $2, $3, $4)
    `, ['Administrador Principal', 'admin@unap.cl', passwordHash, 'admin_primario'])
    
    console.log('✓ Usuario administrador por defecto creado')
    console.log('\n📧 Email: admin@unap.cl')
    console.log('🔑 Contraseña: admin123')
    console.log('\n⚠️  IMPORTANTE: Cambia esta contraseña después del primer inicio de sesión\n')
    
  } catch (error) {
    console.error('Error al crear tabla usuarios:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

createUsuariosTable()
  .then(() => {
    console.log('✅ Tabla usuarios creada exitosamente')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
