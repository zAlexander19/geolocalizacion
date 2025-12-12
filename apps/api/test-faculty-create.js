import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'xd123',
  database: process.env.DB_NAME || 'geolocalizacion'
})

async function testFacultyCreate() {
  try {
    console.log('🔍 Verificando estructura de tabla faculties...')
    
    // Ver columnas de la tabla faculties
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'faculties' 
      ORDER BY ordinal_position
    `)
    
    console.log('\n📋 Columnas de la tabla faculties:')
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`)
    })
    
    // Verificar tabla faculty_buildings
    const fbExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'faculty_buildings'
      )
    `)
    
    console.log('\n📋 ¿Existe tabla faculty_buildings?', fbExists.rows[0].exists ? '✅ Sí' : '❌ No')
    
    if (fbExists.rows[0].exists) {
      const fbCols = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'faculty_buildings' 
        ORDER BY ordinal_position
      `)
      
      console.log('\n📋 Columnas de la tabla faculty_buildings:')
      fbCols.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`)
      })
      
      // Ver datos de faculty_buildings
      const fbData = await pool.query('SELECT * FROM faculty_buildings')
      console.log('\n📊 Datos en faculty_buildings:', fbData.rows)
    }
    
    // Intentar crear una facultad de prueba
    console.log('\n🧪 Intentando crear facultad de prueba...')
    
    const testInsert = await pool.query(`
      INSERT INTO faculties (codigo_facultad, nombre_facultad, descripcion, logo, estado, disponibilidad)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, ['TEST123', 'Facultad de Prueba', 'Descripción prueba', '', true, 'Disponible'])
    
    console.log('✅ Facultad creada:', testInsert.rows[0])
    
    // Limpiar
    await pool.query('DELETE FROM faculties WHERE codigo_facultad = $1', ['TEST123'])
    console.log('🧹 Facultad de prueba eliminada')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Detalle:', error)
  } finally {
    await pool.end()
  }
}

testFacultyCreate()
