import pkg from 'pg'
const { Pool } = pkg

// Configuración de PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'geolocalizacion',
  user: process.env.DB_USER || 'afariasm',
  password: process.env.DB_PASSWORD || 'W]6[8uX7WXJT',
  // SSL: Requerido para algunas conexiones remotas (Azure/AWS), opcional en redes internas
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Aumentado a 10s para conexiones remotas
})

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database')
})

pool.on('error', (err) => {
  console.error('❌ Unexpected error on PostgreSQL client', err)
  // No cerrar el proceso, solo loguear
})

export { pool }
export default pool
