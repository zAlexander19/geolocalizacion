
import pkg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
const { Pool } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

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

async function runMigration() {
  const client = await pool.connect()
  try {
    const sqlPath = path.resolve(__dirname, 'migrations/003_update_totem_auth.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    console.log('Running migration: 003_update_totem_auth.sql')
    await client.query(sql)
    console.log('Migration completed successfully.')
  } catch (err) {
    console.error('Error running migration:', err)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()
