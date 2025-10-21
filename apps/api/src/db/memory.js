import fs from 'fs'
import path from 'path'

// Simple in-memory DB with optional JSON persistence
export const db = {
  buildings: [],
  floors: [],
  rooms: [],
}

const dataDir = path.join(process.cwd(), 'apps', 'api', 'data')
const dbFile = path.join(dataDir, 'db.json')

export function loadDB() {
  try {
    if (!fs.existsSync(dbFile)) return false
    const raw = fs.readFileSync(dbFile, 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      db.buildings = parsed.buildings || []
      db.floors = parsed.floors || []
      db.rooms = parsed.rooms || []
      return true
    }
    return false
  } catch (e) {
    console.warn('Failed to load DB file, starting fresh:', e.message)
    return false
  }
}

export function saveDB() {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to save DB file:', e.message)
  }
}

export function nextId() {
  // Devuelve el siguiente id global (no por entidad)
  const all = [...db.buildings, ...db.floors, ...db.rooms]
  return all.length ? Math.max(...all.map(x => x.id_edificio || x.id_piso || x.id_sala || 0)) + 1 : 1
}

// incremental ids


export function seed() {
  db.buildings = []
  db.floors = []
  db.rooms = []
}

export function seedIfEmpty() {
  const isEmpty = db.buildings.length === 0 && db.floors.length === 0 && db.rooms.length === 0
  if (isEmpty) {
    seed()
  }
}
