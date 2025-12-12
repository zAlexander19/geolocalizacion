import pool from './src/config/database.js'

async function checkFaculties() {
  try {
    const result = await pool.query(`
      SELECT 
        f.codigo_facultad, 
        f.nombre_facultad, 
        f.id_edificio,
        f.estado as facultad_estado,
        b.id_edificio as edificio_id,
        b.nombre_edificio,
        b.estado as edificio_estado
      FROM faculties f
      LEFT JOIN buildings b ON f.id_edificio = b.id_edificio
      ORDER BY f.codigo_facultad
    `)
    
    console.log('\n📋 Facultades y sus edificios asociados:\n')
    result.rows.forEach(row => {
      console.log(`Código: ${row.codigo_facultad}`)
      console.log(`Nombre: ${row.nombre_facultad}`)
      console.log(`Estado Facultad: ${row.facultad_estado}`)
      console.log(`id_edificio: ${row.id_edificio || 'NULL'}`)
      if (row.id_edificio) {
        console.log(`Edificio: ${row.nombre_edificio} (ID: ${row.edificio_id})`)
        console.log(`Estado Edificio: ${row.edificio_estado}`)
      }
      console.log('---')
    })
    
    await pool.end()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkFaculties()
