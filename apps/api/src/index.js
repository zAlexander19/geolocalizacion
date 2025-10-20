import dotenv from 'dotenv'
import { createApp } from './app.js'
import { loadDB, seedIfEmpty, saveDB } from './db/memory.js'
import path from 'path'

// Cargar variables de entorno desde la raíz del monorepo
const rootDir = process.cwd().includes('apps\\api') 
  ? path.join(process.cwd(), '..', '..') 
  : process.cwd()
dotenv.config({ path: path.join(rootDir, '.env') })

const PORT = process.env.PORT || 4000
// Load persisted DB; if empty, seed initial data, then save
const loaded = loadDB()
if (!loaded) seedIfEmpty()
saveDB()
const app = createApp()

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
