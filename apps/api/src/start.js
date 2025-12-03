// Este archivo carga las variables de entorno ANTES de cualquier otra cosa
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Cargar .env ANTES de importar cualquier otro módulo
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Ahora importar e iniciar la aplicación
import('./index.js')
