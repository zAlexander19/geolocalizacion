import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Resolve data file in either /data/db.json or nested /apps/api/data/db.json
function resolveDataPath() {
  const tryPaths = [
    path.resolve(__dirname, '../data/db.json'),
    path.resolve(__dirname, '../apps/api/data/db.json'),
  ]
  for (const p of tryPaths) {
    if (fs.existsSync(p)) return p
  }
  // default to first path (and ensure directory exists)
  const dir = path.dirname(tryPaths[0])
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return tryPaths[0]
}

function loadDB() {
  const dbPath = resolveDataPath()
  if (!fs.existsSync(dbPath)) {
    return { buildings: [], floors: [], rooms: [] }
  }
  try {
    const raw = fs.readFileSync(dbPath, 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    console.error('Error reading DB file:', e)
    return { buildings: [], floors: [], rooms: [] }
  }
}

function saveDB(db) {
  const dbPath = resolveDataPath()
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8')
}

function nextId(items, key) {
  const max = items.reduce((acc, it) => Math.max(acc, Number(it[key]) || 0), 0)
  return max + 1
}

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '5mb' }))

  // Static uploads
  const uploadsDir = path.resolve(__dirname, '../uploads')
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
  app.use('/uploads', express.static(uploadsDir))

  // Health
  app.get('/health', (req, res) => res.json({ ok: true }))

  // Buildings
  app.get('/buildings', (req, res) => {
    const db = loadDB()
    res.json({ data: db.buildings || [] })
  })

  app.post('/buildings', (req, res) => {
    const db = loadDB()
    const b = req.body || {}
    const buildings = db.buildings || []
    const id = nextId(buildings, 'id_edificio')
    const nuevo = {
      id_edificio: id,
      nombre_edificio: String(b.nombre_edificio || '').trim(),
      acronimo: String(b.acronimo || '').trim(),
      imagen: b.imagen || '',
      cord_latitud: Number(b.cord_latitud) || 0,
      cord_longitud: Number(b.cord_longitud) || 0,
      estado: b.estado !== false,
      disponibilidad: b.disponibilidad || 'Disponible'
    }
    db.buildings = buildings.concat(nuevo)
    saveDB(db)
    res.status(201).json({ data: nuevo })
  })

  app.put('/buildings/:id', (req, res) => {
    const db = loadDB()
    const id = Number(req.params.id)
    const idx = (db.buildings || []).findIndex(b => Number(b.id_edificio) === id)
    if (idx === -1) return res.status(404).json({ message: 'Not found' })
    const prev = db.buildings[idx]
    const b = req.body || {}
    db.buildings[idx] = {
      ...prev,
      ...b,
      id_edificio: prev.id_edificio,
    }
    saveDB(db)
    res.json({ data: db.buildings[idx] })
  })

  app.delete('/buildings/:id', (req, res) => {
    const db = loadDB()
    const id = Number(req.params.id)
    db.floors = (db.floors || []).filter(f => Number(f.id_edificio) !== id)
    db.rooms = (db.rooms || []).filter(r => {
      const floor = (db.floors || []).find(f => Number(f.id_piso) === Number(r.id_piso))
      return floor !== undefined
    })
    db.buildings = (db.buildings || []).filter(b => Number(b.id_edificio) !== id)
    saveDB(db)
    res.json({ ok: true })
  })

  // Floors
  app.get('/buildings/:id/floors', (req, res) => {
    const db = loadDB()
    const id = Number(req.params.id)
    const floors = (db.floors || []).filter(f => Number(f.id_edificio) === id)
    res.json({ data: floors })
  })

  app.post('/buildings/:id/floors', (req, res) => {
    const db = loadDB()
    const id_edificio = Number(req.params.id)
    const f = req.body || {}
    const floors = db.floors || []
    const id = nextId(floors, 'id_piso')
    const nuevo = {
      id_piso: id,
      id_edificio,
      nombre_piso: String(f.nombre_piso || '').trim(),
      numero_piso: f.numero_piso != null ? Number(f.numero_piso) : null,
      imagen: f.imagen || '',
      codigo_qr: f.codigo_qr || '',
      estado: f.estado !== false,
      disponibilidad: f.disponibilidad || 'Disponible',
    }
    db.floors = floors.concat(nuevo)
    saveDB(db)
    res.status(201).json({ data: nuevo })
  })

  app.put('/floors/:id', (req, res) => {
    const db = loadDB()
    const id = Number(req.params.id)
    const idx = (db.floors || []).findIndex(f => Number(f.id_piso) === id)
    if (idx === -1) return res.status(404).json({ message: 'Not found' })
    const prev = db.floors[idx]
    db.floors[idx] = { ...prev, ...req.body, id_piso: prev.id_piso }
    saveDB(db)
    res.json({ data: db.floors[idx] })
  })

  app.delete('/floors/:id', (req, res) => {
    const db = loadDB()
    const id = Number(req.params.id)
    db.rooms = (db.rooms || []).filter(r => Number(r.id_piso) !== id)
    db.floors = (db.floors || []).filter(f => Number(f.id_piso) !== id)
    saveDB(db)
    res.json({ ok: true })
  })

  // Rooms
  app.get('/rooms', (req, res) => {
    const db = loadDB()
    res.json({ data: db.rooms || [] })
  })

  app.post('/rooms', (req, res) => {
    const db = loadDB()
    const r = req.body || {}
    const rooms = db.rooms || []
    const id = nextId(rooms, 'id_sala')
    const nuevo = {
      id_sala: id,
      id_piso: Number(r.id_piso),
      nombre_sala: String(r.nombre_sala || '').trim(),
      imagen: r.imagen || '',
      capacidad: Number(r.capacidad) || 0,
      tipo_sala: r.tipo_sala || '',
      cord_latitud: Number(r.cord_latitud) || 0,
      cord_longitud: Number(r.cord_longitud) || 0,
      estado: r.estado !== false,
      disponibilidad: r.disponibilidad || 'Disponible'
    }
    db.rooms = rooms.concat(nuevo)
    saveDB(db)
    res.status(201).json({ data: nuevo })
  })

  app.put('/rooms/:id', (req, res) => {
    const db = loadDB()
    const id = Number(req.params.id)
    const idx = (db.rooms || []).findIndex(r => Number(r.id_sala) === id)
    if (idx === -1) return res.status(404).json({ message: 'Not found' })
    const prev = db.rooms[idx]
    db.rooms[idx] = { ...prev, ...req.body, id_sala: prev.id_sala }
    saveDB(db)
    res.json({ data: db.rooms[idx] })
  })

  app.delete('/rooms/:id', (req, res) => {
    const db = loadDB()
    const id = Number(req.params.id)
    db.rooms = (db.rooms || []).filter(r => Number(r.id_sala) !== id)
    saveDB(db)
    res.json({ ok: true })
  })

  return app
}

export default createApp
