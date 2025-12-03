import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('Current directory:', __dirname)
console.log('Looking for .env at:', path.resolve(__dirname, '.env'))

dotenv.config({ path: path.resolve(__dirname, '.env') })

console.log('\nEnvironment variables:')
console.log('DB_HOST:', process.env.DB_HOST)
console.log('DB_NAME:', process.env.DB_NAME)
console.log('DB_USER:', process.env.DB_USER)
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***hidden***' : 'NOT SET')
console.log('DB_SSL:', process.env.DB_SSL)
