import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pkg from 'pg'
const { Pool } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Cargar .env explícitamente
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// Crear pool después de cargar variables
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'geolocalizacion',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

// Load existing JSON data
function loadDB() {
  const tryPaths = [
    path.resolve(__dirname, '../../data/db.json'),
    path.resolve(__dirname, '../../apps/api/data/db.json'),
  ]
  for (const p of tryPaths) {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8')
      return JSON.parse(raw)
    }
  }
  return { buildings: [], floors: [], rooms: [], bathrooms: [], faculties: [] }
}

async function migrateData() {
  console.log('🚀 Starting data migration...')
  
  try {
    const db = loadDB()
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // 1. Migrate Buildings
      console.log('📦 Migrating buildings...')
      for (const building of db.buildings || []) {
        await client.query(`
          INSERT INTO buildings (
            id_edificio, nombre_edificio, acronimo, descripcion, imagen,
            cord_latitud, cord_longitud, estado, disponibilidad
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id_edificio) DO UPDATE SET
            nombre_edificio = EXCLUDED.nombre_edificio,
            acronimo = EXCLUDED.acronimo,
            descripcion = EXCLUDED.descripcion,
            imagen = EXCLUDED.imagen,
            cord_latitud = EXCLUDED.cord_latitud,
            cord_longitud = EXCLUDED.cord_longitud,
            estado = EXCLUDED.estado,
            disponibilidad = EXCLUDED.disponibilidad
        `, [
          building.id_edificio,
          building.nombre_edificio,
          building.acronimo || '',
          building.descripcion || '',
          building.imagen || '',
          building.cord_latitud || 0,
          building.cord_longitud || 0,
          building.estado !== false,
          building.disponibilidad || 'Disponible'
        ])
      }
      console.log(`✅ Migrated ${db.buildings?.length || 0} buildings`)
      
      // 2. Migrate Floors
      console.log('📦 Migrating floors...')
      for (const floor of db.floors || []) {
        await client.query(`
          INSERT INTO floors (
            id_piso, id_edificio, nombre_piso, numero_piso, imagen,
            codigo_qr, estado, disponibilidad
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id_piso) DO UPDATE SET
            id_edificio = EXCLUDED.id_edificio,
            nombre_piso = EXCLUDED.nombre_piso,
            numero_piso = EXCLUDED.numero_piso,
            imagen = EXCLUDED.imagen,
            codigo_qr = EXCLUDED.codigo_qr,
            estado = EXCLUDED.estado,
            disponibilidad = EXCLUDED.disponibilidad
        `, [
          floor.id_piso,
          floor.id_edificio,
          floor.nombre_piso,
          floor.numero_piso || null,
          floor.imagen || '',
          floor.codigo_qr || '',
          floor.estado !== false,
          floor.disponibilidad || 'Disponible'
        ])
      }
      console.log(`✅ Migrated ${db.floors?.length || 0} floors`)
      
      // 3. Migrate Rooms
      console.log('📦 Migrating rooms...')
      for (const room of db.rooms || []) {
        await client.query(`
          INSERT INTO rooms (
            id_sala, id_piso, nombre_sala, acronimo, descripcion, imagen,
            capacidad, tipo_sala, cord_latitud, cord_longitud, estado, disponibilidad
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id_sala) DO UPDATE SET
            id_piso = EXCLUDED.id_piso,
            nombre_sala = EXCLUDED.nombre_sala,
            acronimo = EXCLUDED.acronimo,
            descripcion = EXCLUDED.descripcion,
            imagen = EXCLUDED.imagen,
            capacidad = EXCLUDED.capacidad,
            tipo_sala = EXCLUDED.tipo_sala,
            cord_latitud = EXCLUDED.cord_latitud,
            cord_longitud = EXCLUDED.cord_longitud,
            estado = EXCLUDED.estado,
            disponibilidad = EXCLUDED.disponibilidad
        `, [
          room.id_sala,
          room.id_piso,
          room.nombre_sala,
          room.acronimo || '',
          room.descripcion || '',
          room.imagen || '',
          room.capacidad || 0,
          room.tipo_sala || '',
          room.cord_latitud || 0,
          room.cord_longitud || 0,
          room.estado !== false,
          room.disponibilidad || 'Disponible'
        ])
      }
      console.log(`✅ Migrated ${db.rooms?.length || 0} rooms`)
      
      // 4. Migrate Bathrooms
      console.log('📦 Migrating bathrooms...')
      for (const bathroom of db.bathrooms || []) {
        await client.query(`
          INSERT INTO bathrooms (
            id_bano, id_edificio, id_piso, identificador, nombre, descripcion,
            capacidad, imagen, tipo, acceso_discapacidad, cord_latitud, cord_longitud,
            estado, disponibilidad
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id_bano) DO UPDATE SET
            id_edificio = EXCLUDED.id_edificio,
            id_piso = EXCLUDED.id_piso,
            identificador = EXCLUDED.identificador,
            nombre = EXCLUDED.nombre,
            descripcion = EXCLUDED.descripcion,
            capacidad = EXCLUDED.capacidad,
            imagen = EXCLUDED.imagen,
            tipo = EXCLUDED.tipo,
            acceso_discapacidad = EXCLUDED.acceso_discapacidad,
            cord_latitud = EXCLUDED.cord_latitud,
            cord_longitud = EXCLUDED.cord_longitud,
            estado = EXCLUDED.estado,
            disponibilidad = EXCLUDED.disponibilidad
        `, [
          bathroom.id_bano,
          bathroom.id_edificio,
          bathroom.id_piso,
          bathroom.identificador,
          bathroom.nombre || '',
          bathroom.descripcion || '',
          bathroom.capacidad || 0,
          bathroom.imagen || '',
          bathroom.tipo || 'mixto',
          bathroom.acceso_discapacidad || false,
          bathroom.cord_latitud || 0,
          bathroom.cord_longitud || 0,
          bathroom.estado !== false,
          bathroom.disponibilidad || 'Disponible'
        ])
      }
      console.log(`✅ Migrated ${db.bathrooms?.length || 0} bathrooms`)
      
      // 5. Migrate Faculties
      console.log('📦 Migrating faculties...')
      for (const faculty of db.faculties || []) {
        await client.query(`
          INSERT INTO faculties (
            codigo_facultad, nombre_facultad, descripcion, logo,
            id_edificio, estado, disponibilidad
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (codigo_facultad) DO UPDATE SET
            nombre_facultad = EXCLUDED.nombre_facultad,
            descripcion = EXCLUDED.descripcion,
            logo = EXCLUDED.logo,
            id_edificio = EXCLUDED.id_edificio,
            estado = EXCLUDED.estado,
            disponibilidad = EXCLUDED.disponibilidad
        `, [
          faculty.codigo_facultad,
          faculty.nombre_facultad,
          faculty.descripcion || '',
          faculty.logo || '',
          faculty.id_edificio || null,
          faculty.estado !== false,
          faculty.disponibilidad || 'Disponible'
        ])
      }
      console.log(`✅ Migrated ${db.faculties?.length || 0} faculties`)
      
      // Update sequences to continue from last ID
      const sequences = [
        { table: 'buildings', column: 'id_edificio', sequence: 'buildings_id_edificio_seq' },
        { table: 'floors', column: 'id_piso', sequence: 'floors_id_piso_seq' },
        { table: 'rooms', column: 'id_sala', sequence: 'rooms_id_sala_seq' },
        { table: 'bathrooms', column: 'id_bano', sequence: 'bathrooms_id_bano_seq' }
      ]
      
      for (const seq of sequences) {
        await client.query(`
          SELECT setval('${seq.sequence}', 
            COALESCE((SELECT MAX(${seq.column}) FROM ${seq.table}), 1))
        `)
      }
      
      await client.query('COMMIT')
      console.log('✅ Migration completed successfully!')
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Run migration
migrateData().catch(console.error)
