// Este archivo carga las variables de entorno ANTES de cualquier otra cosa
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Intentar cargar .env desde la raíz del proyecto (apps/api/.env)
const envPath = path.resolve(__dirname, '../.env')

if (fs.existsSync(envPath)) {
  console.log(`✅ Cargando variables de entorno desde: ${envPath}`)
  const result = dotenv.config({ path: envPath })
  
  if (result.error) {
    console.error('❌ Error cargando .env:', result.error)
  } else {
    console.log('✅ .env cargado correctamente')
  }
} else {
  console.warn(`⚠️ No se encontró el archivo .env en: ${envPath}`)
  console.warn('⚠️ Se confiará en las variables de entorno del sistema.')
}

// Validar variables críticas
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
const missingVars = requiredEnvVars.filter(key => !process.env[key])

if (missingVars.length > 0) {
  console.error(`❌ Faltan variables de entorno críticas: ${missingVars.join(', ')}`)
  // No salimos del proceso para permitir depuración, pero esto seguramente fallará
}

console.log(`ℹ️ Entorno: ${process.env.NODE_ENV}`)
console.log(`ℹ️ DB Host configurado: ${process.env.DB_HOST}`)
console.log(`ℹ️ Puerto configurado: ${process.env.PORT}`)

// Ahora importar e iniciar la aplicación
import('./index.js')
