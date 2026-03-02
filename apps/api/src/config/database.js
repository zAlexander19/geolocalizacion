import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pkg from 'pg'
import logger from '../utils/logger.js'

// Asegurar carga de variables de entorno AQUÍ mismo por si se importa directamente
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const { Pool } = pkg

// Validación estricta de variables de entorno para evitar fallbacks silenciosos
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
const missingVars = requiredEnvVars.filter(key => !process.env[key])

if (missingVars.length > 0) {
  const errorMsg = `❌ Error crítico de base de datos: Faltan las siguientes variables de entorno: ${missingVars.join(', ')}`
  console.error(errorMsg)
  // En producción, es mejor fallar rápido si no hay configuración
  if (process.env.NODE_ENV === 'production') {
     throw new Error(errorMsg)
  }
}

// Configuración de PostgreSQL - SIN FALLBACKS PELIGROSOS
const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // SSL: Requerido para algunas conexiones remotas, opcional en redes internas
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
}

console.log(`🔌 Intentando conectar a PostgreSQL en: ${dbConfig.host}:${dbConfig.port} (User: ${dbConfig.user}, DB: ${dbConfig.database})`)

const pool = new Pool(dbConfig)

// Test connection
pool.on('connect', () => {
  console.log(`✅ Conexión establecida exitosamente con la base de datos en ${dbConfig.host}`)
})

pool.on('error', (err) => {
  console.error(`❌ Error inesperado en el cliente PostgreSQL conectado a ${dbConfig.host}:`, err)
})

export { pool }
export default pool
