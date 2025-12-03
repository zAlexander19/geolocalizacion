import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pkg from 'pg'
const { Pool } = pkg

// Cargar .env explícitamente
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.resolve(__dirname, '../../.env')

dotenv.config({ path: envPath })

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

async function testConnection() {
  console.log('🔍 Testing PostgreSQL connection...\n')
  console.log(`📁 Loading .env from: ${envPath}\n`)
  
  // Debug: mostrar qué variables se están cargando
  console.log('Environment variables loaded:')
  console.log(`  DB_HOST exists: ${!!process.env.DB_HOST}`)
  console.log(`  DB_NAME exists: ${!!process.env.DB_NAME}`)
  console.log(`  DB_USER exists: ${!!process.env.DB_USER}`)
  console.log(`  DB_PASSWORD exists: ${!!process.env.DB_PASSWORD}`)
  console.log('')
  
  console.log('Configuration:')
  console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`)
  console.log(`  Port: ${process.env.DB_PORT || 5432}`)
  console.log(`  Database: ${process.env.DB_NAME || 'geolocalizacion'}`)
  console.log(`  User: ${process.env.DB_USER || 'postgres'}`)
  console.log(`  SSL: ${process.env.DB_SSL === 'true' ? 'Enabled' : 'Disabled'}`)
  console.log('')
  
  try {
    const client = await pool.connect()
    console.log('✅ Connection successful!')
    
    // Test query
    const result = await client.query('SELECT version()')
    console.log('\n📊 PostgreSQL Version:')
    console.log(result.rows[0].version)
    
    // Check if tables exist
    console.log('\n📋 Checking tables...')
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    if (tables.rows.length === 0) {
      console.log('⚠️  No tables found. You need to run the schema.sql script.')
      console.log('   Use pgAdmin or run: psql -f src/db/schema.sql')
    } else {
      console.log('✅ Found tables:')
      tables.rows.forEach(row => {
        console.log(`   - ${row.table_name}`)
      })
      
      // Count records
      console.log('\n📊 Record counts:')
      for (const table of tables.rows) {
        const count = await client.query(`SELECT COUNT(*) FROM ${table.table_name}`)
        console.log(`   ${table.table_name}: ${count.rows[0].count} records`)
      }
    }
    
    client.release()
    await pool.end()
    
    console.log('\n✅ Test completed successfully!')
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ Connection failed!')
    console.error('Error:', error.message)
    console.error('Error Code:', error.code)
    console.error('\nFull error details:')
    console.error(error)
    console.error('\nTroubleshooting:')
    console.error('  1. Check that PostgreSQL server is running')
    console.error('  2. Verify credentials in .env file')
    console.error('  3. Ensure database exists')
    console.error('  4. Check firewall/network settings')
    console.error('  5. Verify SSL settings if required')
    
    await pool.end()
    process.exit(1)
  }
}

testConnection()
