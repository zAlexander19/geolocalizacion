import pkg from 'pg'
const { Pool } = pkg
import dotenv from 'dotenv'
dotenv.config()

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
})

async function updateAuditUsers() {
  try {
    const result = await pool.query(
      "UPDATE audit_logs SET user_email = 'admin@example.com' WHERE user_email = 'sistema'"
    )
    console.log(`✅ Actualizados ${result.rowCount} registros`)
  } catch (err) {
    console.error('❌ Error:', err.message)
  } finally {
    await pool.end()
  }
}

updateAuditUsers()
