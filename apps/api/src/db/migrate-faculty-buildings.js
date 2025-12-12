import pool from '../config/database.js'

async function migrateFacultyBuildings() {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    console.log('🔄 Migrando tabla faculties...')
    
    // 1. Crear tabla de relación
    console.log('📝 Creando tabla faculty_buildings...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS faculty_buildings (
        codigo_facultad VARCHAR(50) REFERENCES faculties(codigo_facultad) ON DELETE CASCADE,
        id_edificio INTEGER REFERENCES buildings(id_edificio) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (codigo_facultad, id_edificio)
      )
    `)
    
    // 2. Migrar datos existentes de id_edificio a la nueva tabla
    console.log('📦 Migrando datos existentes...')
    const result = await client.query(`
      INSERT INTO faculty_buildings (codigo_facultad, id_edificio)
      SELECT codigo_facultad, id_edificio 
      FROM faculties 
      WHERE id_edificio IS NOT NULL
      ON CONFLICT DO NOTHING
    `)
    console.log(`✅ ${result.rowCount} relaciones migradas`)
    
    // 3. Eliminar columna id_edificio de faculties
    console.log('🗑️ Eliminando columna id_edificio de faculties...')
    await client.query(`
      ALTER TABLE faculties DROP COLUMN IF EXISTS id_edificio
    `)
    
    // 4. Crear índices
    console.log('📊 Creando índices...')
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_faculty_buildings_facultad 
      ON faculty_buildings(codigo_facultad)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_faculty_buildings_edificio 
      ON faculty_buildings(id_edificio)
    `)
    
    // 5. Eliminar índice antiguo si existe
    await client.query(`
      DROP INDEX IF EXISTS idx_faculties_edificio
    `)
    
    await client.query('COMMIT')
    console.log('✅ Migración completada exitosamente')
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error en la migración:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

migrateFacultyBuildings()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
