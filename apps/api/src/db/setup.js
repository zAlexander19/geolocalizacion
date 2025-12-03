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

async function setupDatabase() {
  console.log('🚀 Setting up PostgreSQL database...\n')
  
  try {
    const client = await pool.connect()
    
    console.log('✅ Connected to database')
    
    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')
    
    console.log('📋 Creating tables...')
    await client.query(schema)
    console.log('✅ Tables created successfully')
    
    // Verify tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    console.log('\n✅ Created tables:')
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`)
    })
    
    client.release()
    await pool.end()
    
    console.log('\n✅ Database setup completed!')
    console.log('\nNext steps:')
    console.log('  1. If you have existing data in db.json, run: npm run db:migrate')
    console.log('  2. Start the server: npm run dev')
    
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ Setup failed!')
    console.error('Error:', error.message)
    console.error('\nDetails:', error)
    
    await pool.end()
    process.exit(1)
  }
}

setupDatabase()
