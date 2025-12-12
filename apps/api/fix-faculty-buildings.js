import { pool } from './src/config/database.js'

async function fixFacultyBuildings() {
  try {
    console.log('🔧 Limpiando facultades de prueba y verificando datos...')
    
    // Ver todas las facultades
    const faculties = await pool.query('SELECT * FROM faculties ORDER BY codigo_facultad')
    console.log('\n📋 Facultades actuales:')
    faculties.rows.forEach(f => {
      console.log(`  - ${f.codigo_facultad}: ${f.nombre_facultad}`)
    })
    
    // Ver datos en faculty_buildings
    const fb = await pool.query('SELECT * FROM faculty_buildings')
    console.log(`\n📦 Registros en faculty_buildings: ${fb.rowCount}`)
    fb.rows.forEach(r => {
      console.log(`  - Facultad: ${r.codigo_facultad} -> Edificio: ${r.id_edificio}`)
    })
    
    // Eliminar facultades de prueba (asdasd, fia, asdasd, ADA, asdasd)
    console.log('\n🗑️ Eliminando facultades de prueba...')
    const deleteResult = await pool.query(`
      DELETE FROM faculties 
      WHERE codigo_facultad IN ('asdasd', 'fia', 'asdasd', 'ADA', 'asdasd')
      RETURNING codigo_facultad
    `)
    console.log(`✅ ${deleteResult.rowCount} facultades eliminadas:`, deleteResult.rows.map(r => r.codigo_facultad))
    
    // Verificar si FIA tiene edificios asociados
    const fiaBuildings = await pool.query(`
      SELECT * FROM faculty_buildings WHERE codigo_facultad = 'FIA'
    `)
    console.log(`\n🏢 Edificios asociados a FIA: ${fiaBuildings.rowCount}`)
    
    console.log('\n✅ Limpieza completada')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  } finally {
    await pool.end()
  }
}

fixFacultyBuildings()
