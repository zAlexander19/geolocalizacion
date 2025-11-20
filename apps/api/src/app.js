import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configurar multer para subir archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.resolve(__dirname, '../uploads')
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten archivos PNG o JPG'))
    }
  }
})

// Middleware para validar dimensiones de imagen
function validateImageDimensions(expectedWidth, expectedHeight) {
  return async (req, res, next) => {
    if (!req.file) {
      return next()
    }

    try {
      const metadata = await sharp(req.file.path).metadata()
      
      if (metadata.width !== expectedWidth || metadata.height !== expectedHeight) {
        // Eliminar el archivo subido
        fs.unlinkSync(req.file.path)
        return res.status(400).json({ 
          message: `La imagen debe tener exactamente ${expectedWidth}x${expectedHeight} píxeles. Imagen recibida: ${metadata.width}x${metadata.height} píxeles` 
        })
      }
      
      next()
    } catch (error) {
      // Eliminar el archivo si hay error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
      return res.status(400).json({ message: 'Error al procesar la imagen' })
    }
  }
}

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
    return { buildings: [], floors: [], rooms: [], bathrooms: [], faculties: [] }
  }
  try {
    const raw = fs.readFileSync(dbPath, 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    console.error('Error reading DB file:', e)
    return { buildings: [], floors: [], rooms: [], bathrooms: [], faculties: [] }
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

  // multer storage para manejar subidas de imagenes
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`
      cb(null, safeName)
    }
  })
  const upload = multer({ storage })

  // Health
  app.get('/health', (req, res) => res.json({ ok: true }))

  // Buildings
  app.get('/buildings', (req, res) => {
    const db = loadDB()
    res.json({ data: db.buildings || [] })
  })

  app.post('/buildings', upload.single('imagen'), validateImageDimensions(1600, 1200), (req, res) => {
    const db = loadDB()
    const b = req.body || {}
    const buildings = db.buildings || []
    const id = nextId(buildings, 'id_edificio')
    const nuevo = {
      id_edificio: id,
      nombre_edificio: String(b.nombre_edificio || '').trim(),
      acronimo: String(b.acronimo || '').trim(),
      descripcion: b.descripcion ? String(b.descripcion).trim() : '',
      imagen: req.file ? `/uploads/${req.file.filename}` : (b.imagen || ''),
      cord_latitud: Number(b.cord_latitud) || 0,
      cord_longitud: Number(b.cord_longitud) || 0,
      estado: b.estado === 'true' || b.estado === true,
      disponibilidad: b.disponibilidad || 'Disponible'
    }
    db.buildings = buildings.concat(nuevo)
    saveDB(db)
    res.status(201).json({ data: nuevo })
  })

  app.put('/buildings/:id', upload.single('imagen'), validateImageDimensions(1600, 1200), (req, res) => {
    const db = loadDB()
    const id = Number(req.params.id)
    const idx = (db.buildings || []).findIndex(b => Number(b.id_edificio) === id)
    if (idx === -1) return res.status(404).json({ message: 'Not found' })
    const prev = db.buildings[idx]
    const b = req.body || {}
    db.buildings[idx] = {
      ...prev,
      nombre_edificio: b.nombre_edificio || prev.nombre_edificio,
      acronimo: b.acronimo !== undefined ? b.acronimo : prev.acronimo,
      descripcion: b.descripcion !== undefined ? String(b.descripcion || '').trim() : prev.descripcion,
      imagen: req.file ? `/uploads/${req.file.filename}` : (b.imagen !== undefined ? b.imagen : prev.imagen),
      cord_latitud: b.cord_latitud !== undefined ? Number(b.cord_latitud) : prev.cord_latitud,
      cord_longitud: b.cord_longitud !== undefined ? Number(b.cord_longitud) : prev.cord_longitud,
      estado: b.estado !== undefined ? (b.estado === 'true' || b.estado === true) : prev.estado,
      disponibilidad: b.disponibilidad || prev.disponibilidad,
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
    // eliminar baños que ya no pertenecen a pisos existentes
    db.bathrooms = (db.bathrooms || []).filter(b => {
      const floor = (db.floors || []).find(f => Number(f.id_piso) === Number(b.id_piso))
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

  app.post('/buildings/:id/floors', upload.single('imagen'), validateImageDimensions(1600, 1200), (req, res) => {
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
      imagen: req.file ? `/uploads/${req.file.filename}` : (f.imagen || ''),
      codigo_qr: f.codigo_qr || '',
      estado: f.estado === 'true' || f.estado === true,
      disponibilidad: f.disponibilidad || 'Disponible',
    }
    db.floors = floors.concat(nuevo)
    saveDB(db)
    res.status(201).json({ data: nuevo })
  })

  app.put('/floors/:id', upload.single('imagen'), validateImageDimensions(1600, 1200), (req, res) => {
    const db = loadDB()
    const id = Number(req.params.id)
    const idx = (db.floors || []).findIndex(f => Number(f.id_piso) === id)
    if (idx === -1) return res.status(404).json({ message: 'Not found' })
    const prev = db.floors[idx]
    const f = req.body || {}
    db.floors[idx] = {
      ...prev,
      nombre_piso: f.nombre_piso || prev.nombre_piso,
      numero_piso: f.numero_piso !== undefined ? Number(f.numero_piso) : prev.numero_piso,
      imagen: req.file ? `/uploads/${req.file.filename}` : (f.imagen !== undefined ? f.imagen : prev.imagen),
      codigo_qr: f.codigo_qr !== undefined ? f.codigo_qr : prev.codigo_qr,
      estado: f.estado !== undefined ? (f.estado === 'true' || f.estado === true) : prev.estado,
      disponibilidad: f.disponibilidad || prev.disponibilidad,
      id_piso: prev.id_piso,
      id_edificio: prev.id_edificio,
    }
    saveDB(db)
    res.json({ data: db.floors[idx] })
  })

  app.delete('/floors/:id', (req, res) => {
    const db = loadDB()
    const id = Number(req.params.id)
    db.rooms = (db.rooms || []).filter(r => Number(r.id_piso) !== id)
    db.bathrooms = (db.bathrooms || []).filter(b => Number(b.id_piso) !== id)
    db.floors = (db.floors || []).filter(f => Number(f.id_piso) !== id)
    saveDB(db)
    res.json({ ok: true })
  })

  // Get rooms by floor
  app.get('/floors/:id/rooms', (req, res) => {
    const db = loadDB()
    const id = Number(req.params.id)
    const rooms = (db.rooms || []).filter(r => Number(r.id_piso) === id)
    res.json({ data: rooms })
  })

  // Rooms
  app.get('/rooms', (req, res) => {
    const db = loadDB()
    res.json({ data: db.rooms || [] })
  })

  app.post('/rooms', upload.single('imagen'), validateImageDimensions(1200, 1600), (req, res) => {
    const db = loadDB()
    const r = req.body || {}
    const rooms = db.rooms || []
    const id = nextId(rooms, 'id_sala')
    const nuevo = {
      id_sala: id,
      id_piso: Number(r.id_piso),
      nombre_sala: String(r.nombre_sala || '').trim(),
      acronimo: String(r.acronimo || '').trim(),
      descripcion: r.descripcion ? String(r.descripcion).trim() : '',
      imagen: req.file ? `/uploads/${req.file.filename}` : (r.imagen || ''),
      capacidad: Number(r.capacidad) || 0,
      tipo_sala: r.tipo_sala || '',
      cord_latitud: Number(r.cord_latitud) || 0,
      cord_longitud: Number(r.cord_longitud) || 0,
      estado: r.estado === 'true' || r.estado === true,
      disponibilidad: r.disponibilidad || 'Disponible'
    }
    db.rooms = rooms.concat(nuevo)
    saveDB(db)
    res.status(201).json({ data: nuevo })
  })

  app.put('/rooms/:id', upload.single('imagen'), validateImageDimensions(1200, 1600), (req, res) => {
    const db = loadDB()
    const id = Number(req.params.id)
    const idx = (db.rooms || []).findIndex(r => Number(r.id_sala) === id)
    if (idx === -1) return res.status(404).json({ message: 'Not found' })
    const prev = db.rooms[idx]
    const r = req.body || {}
    db.rooms[idx] = {
      ...prev,
      id_piso: r.id_piso !== undefined ? Number(r.id_piso) : prev.id_piso,
      nombre_sala: r.nombre_sala || prev.nombre_sala,
      acronimo: r.acronimo || prev.acronimo,
      descripcion: r.descripcion !== undefined ? String(r.descripcion || '').trim() : prev.descripcion,
      imagen: req.file ? `/uploads/${req.file.filename}` : (r.imagen !== undefined ? r.imagen : prev.imagen),
      capacidad: r.capacidad !== undefined ? Number(r.capacidad) : prev.capacidad,
      tipo_sala: r.tipo_sala !== undefined ? r.tipo_sala : prev.tipo_sala,
      cord_latitud: r.cord_latitud !== undefined ? Number(r.cord_latitud) : prev.cord_latitud,
      cord_longitud: r.cord_longitud !== undefined ? Number(r.cord_longitud) : prev.cord_longitud,
      estado: r.estado !== undefined ? (r.estado === 'true' || r.estado === true) : prev.estado,
      disponibilidad: r.disponibilidad || prev.disponibilidad,
      id_sala: prev.id_sala,
    }
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

  // Bathrooms
  app.get('/bathrooms', (req, res) => {
    const db = loadDB()
    res.json({ data: db.bathrooms || [] })
  })

  app.post('/bathrooms', upload.single('imagen'), validateImageDimensions(1600, 1200), (req, res) => {
    const db = loadDB()
    const b = req.body || {}
    if (req.file) {
      b.imagen = `/uploads/${req.file.filename}`
    }
    const bathrooms = db.bathrooms || []
    const id = nextId(bathrooms, 'id_bano')

    const id_edificio = Number(b.id_edificio)
    const id_piso = Number(b.id_piso)
    let identificador = String(b.identificador || '').trim()
    const tipo = String(b.tipo || '').toLowerCase()
    const nombre = String(b.nombre || '').trim()
    const capacidad = Number(b.capacidad) || 0

    // validations
    if (!['h', 'm', 'mixto'].includes(tipo)) return res.status(400).json({ message: 'tipo inválido (h/m/mixto)' })
    const edificio = (db.buildings || []).find(x => Number(x.id_edificio) === id_edificio)
    if (!edificio) return res.status(400).json({ message: 'edificio no encontrado' })
    const piso = (db.floors || []).find(x => Number(x.id_piso) === id_piso && Number(x.id_edificio) === id_edificio)
    if (!piso) return res.status(400).json({ message: 'piso no encontrado para ese edificio' })

    if (!identificador) {
      identificador = `B${id}`
    }
    const exists = (bathrooms || []).some(x =>
      Number(x.id_edificio) === id_edificio &&
      Number(x.id_piso) === id_piso &&
      String(x.identificador) === identificador
    )
    if (exists) return res.status(400).json({ message: 'ya existe un baño con ese identificador en el mismo edificio/piso' })

    const imagen = b.imagen || ''
    const descripcion = String(b.descripcion || '').trim()

    const nuevo = {
      id_bano: id,
      id_edificio,
      id_piso,
      identificador,
      nombre,
      descripcion,
      capacidad,
      imagen,
      tipo,
      acceso_discapacidad: b.acceso_discapacidad === true || String(b.acceso_discapacidad || '').toLowerCase() === 'sí' || String(b.acceso_discapacidad || '').toLowerCase() === 'si',
      cord_latitud: Number(b.cord_latitud) || 0,
      cord_longitud: Number(b.cord_longitud) || 0,
      estado: b.estado !== false,
      disponibilidad: b.disponibilidad || 'Disponible'
    }
    db.bathrooms = bathrooms.concat(nuevo)
    saveDB(db)
    res.status(201).json({ data: nuevo })
  })

  app.put('/bathrooms/:id', upload.single('imagen'), validateImageDimensions(1600, 1200), (req, res) => {
    const db = loadDB()
    const id = Number(req.params.id)
    const idx = (db.bathrooms || []).findIndex(b => Number(b.id_bano) === id)
    if (idx === -1) return res.status(404).json({ message: 'Not found' })
    const prev = db.bathrooms[idx]
    const b = req.body || {}
    if (req.file) {
      b.imagen = `/uploads/${req.file.filename}`
    }
    if (b.nombre !== undefined) b.nombre = String(b.nombre).trim()
    if (b.capacidad !== undefined) b.capacidad = Number(b.capacidad)
    db.bathrooms[idx] = { ...prev, ...b, id_bano: prev.id_bano }
    saveDB(db)
    res.json({ data: db.bathrooms[idx] })
  })

  app.delete('/bathrooms/:id', (req, res) => {
    const db = loadDB()
    const id = Number(req.params.id)
    db.bathrooms = (db.bathrooms || []).filter(b => Number(b.id_bano) !== id)
    saveDB(db)
    res.json({ ok: true })
  })

  // Faculties
  app.get('/faculties', (req, res) => {
    const db = loadDB()
    res.json({ data: db.faculties || [] })
  })

  app.post('/faculties', upload.single('logo'), validateImageDimensions(1600, 1200), (req, res) => {
    try {
      const db = loadDB()
      const f = req.body || {}
      if (req.file) {
        f.logo = `/uploads/${req.file.filename}`
      }

      const faculties = db.faculties || []
      const idNum = nextId(faculties, 'codigo_facultad')

      // Allow provided code or use numeric id as string
      const codigo_facultad = f.codigo_facultad !== undefined && String(f.codigo_facultad).trim() !== '' ? String(f.codigo_facultad).trim() : String(idNum)
      const nombre_facultad = String(f.nombre_facultad || '').trim()
      const descripcion = String(f.descripcion || '').trim()
      const id_edificio = f.id_edificio ? Number(f.id_edificio) : null

      // Validations
      if (!nombre_facultad) return res.status(400).json({ message: 'Nombre de facultad obligatorio' })
      if (!codigo_facultad) return res.status(400).json({ message: 'Código de facultad obligatorio' })
      const codeRe = /^[A-Za-z0-9_-]{2,50}$/
      if (!codeRe.test(String(codigo_facultad))) return res.status(400).json({ message: 'Formato de código inválido' })

      const nameExists = (db.faculties || []).some(x => String(x.nombre_facultad || '').toLowerCase() === nombre_facultad.toLowerCase())
      const codeExists = (db.faculties || []).some(x => String(x.codigo_facultad || '').toLowerCase() === String(codigo_facultad).toLowerCase())
      if (nameExists) return res.status(400).json({ message: 'Ya existe una facultad con ese nombre' })
      if (codeExists) return res.status(400).json({ message: 'Ya existe una facultad con ese código' })

      // Validate building association if provided
      if (id_edificio) {
        const edificio = (db.buildings || []).find(b => Number(b.id_edificio) === id_edificio)
        if (!edificio) return res.status(400).json({ message: 'Edificio no encontrado' })
      }

      const nuevo = {
        codigo_facultad,
        nombre_facultad,
        descripcion,
        logo: f.logo || '',
        id_edificio: id_edificio || null,
        estado: f.estado !== undefined ? (f.estado === 'true' || f.estado === true) : true,
        disponibilidad: f.disponibilidad || 'Disponible'
      }

      db.faculties = faculties.concat(nuevo)
      saveDB(db)
      res.status(201).json({ data: nuevo })
    } catch (error) {
      console.error('Error creating faculty:', error)
      res.status(500).json({ message: 'Error al crear facultad' })
    }
  })

  app.put('/faculties/:id', upload.single('logo'), validateImageDimensions(1600, 1200), (req, res) => {
    try {
      const db = loadDB()
      const id = req.params.id
      const fbody = req.body || {}
      if (req.file) {
        fbody.logo = `/uploads/${req.file.filename}`
      }

      const faculties = db.faculties || []
      const idx = faculties.findIndex(x => String(x.codigo_facultad) === String(id) || String(x.codigo_facultad) === String(Number(id)))
      if (idx === -1) return res.status(404).json({ message: 'Facultad no encontrada' })

      const current = faculties[idx]

      const codigo_facultad = fbody.codigo_facultad !== undefined && String(fbody.codigo_facultad).trim() !== '' ? String(fbody.codigo_facultad).trim() : current.codigo_facultad
      const nombre_facultad = String(fbody.nombre_facultad !== undefined ? fbody.nombre_facultad : current.nombre_facultad).trim()
      const descripcion = String(fbody.descripcion !== undefined ? fbody.descripcion : current.descripcion || '').trim()
      const id_edificio = fbody.id_edificio !== undefined && fbody.id_edificio !== '' ? Number(fbody.id_edificio) : (current.id_edificio || null)

      if (!nombre_facultad) return res.status(400).json({ message: 'Nombre de facultad obligatorio' })
      if (!codigo_facultad) return res.status(400).json({ message: 'Código de facultad obligatorio' })
      const codeRe = /^[A-Za-z0-9_-]{2,50}$/
      if (!codeRe.test(String(codigo_facultad))) return res.status(400).json({ message: 'Formato de código inválido' })

      // uniqueness excluding current
      const nameExists = (db.faculties || []).some(x => String(x.nombre_facultad || '').toLowerCase() === nombre_facultad.toLowerCase() && String(x.codigo_facultad) !== String(current.codigo_facultad))
      const codeExists = (db.faculties || []).some(x => String(x.codigo_facultad || '').toLowerCase() === String(codigo_facultad).toLowerCase() && String(x.codigo_facultad) !== String(current.codigo_facultad))
      if (nameExists) return res.status(400).json({ message: 'Ya existe una facultad con ese nombre' })
      if (codeExists) return res.status(400).json({ message: 'Ya existe una facultad con ese código' })

      // Validate building association if provided
      if (id_edificio) {
        const edificio = (db.buildings || []).find(b => Number(b.id_edificio) === id_edificio)
        if (!edificio) return res.status(400).json({ message: 'Edificio no encontrado' })
      }

      // apply updates
      const updated = {
        ...current,
        codigo_facultad,
        nombre_facultad,
        descripcion,
        logo: fbody.logo !== undefined ? fbody.logo : current.logo || '',
        id_edificio: id_edificio || null,
        estado: fbody.estado !== undefined ? (fbody.estado === 'true' || fbody.estado === true) : current.estado,
        disponibilidad: fbody.disponibilidad || current.disponibilidad || 'Disponible'
      }

      db.faculties[idx] = updated
      saveDB(db)
      res.json({ data: updated })
    } catch (error) {
      console.error('Error updating faculty:', error)
      res.status(500).json({ message: 'Error al actualizar facultad' })
    }
  })

  app.delete('/faculties/:id', (req, res) => {
    const db = loadDB()
    const id = req.params.id
    db.faculties = (db.faculties || []).filter(f => String(f.codigo_facultad) !== String(id) && String(f.codigo_facultad) !== String(Number(id)))
    saveDB(db)
    res.json({ ok: true })
  })

  app.put('/faculties/:id', upload.single('logo'), (req, res) => {
    try {
      const db = loadDB()
      const id = req.params.id
      const f = req.body || {}

      // Find faculty by codigo_facultad
      const idx = (db.faculties || []).findIndex(x => String(x.codigo_facultad) === String(id))
      if (idx === -1) return res.status(404).json({ message: 'Facultad no encontrada' })

      const prev = db.faculties[idx]

      const nombre_facultad = f.nombre_facultad !== undefined ? String(f.nombre_facultad).trim() : prev.nombre_facultad
      const descripcion = f.descripcion !== undefined ? String(f.descripcion).trim() : prev.descripcion
      const id_edificio = f.id_edificio !== undefined ? (f.id_edificio ? Number(f.id_edificio) : null) : prev.id_edificio
      const logo = req.file ? `/uploads/${req.file.filename}` : (f.logo !== undefined ? f.logo : prev.logo)
      const codigo_facultad = f.codigo_facultad !== undefined ? String(f.codigo_facultad).trim() : prev.codigo_facultad

      // Validations
      if (!nombre_facultad) return res.status(400).json({ message: 'Nombre de facultad obligatorio' })
      if (!codigo_facultad) return res.status(400).json({ message: 'Código de facultad obligatorio' })

      const codeRe = /^[A-Za-z0-9_-]{2,50}$/
      if (!codeRe.test(codigo_facultad)) return res.status(400).json({ message: 'Formato de código inválido' })

      // Check uniqueness (excluding current faculty)
      const nameExists = (db.faculties || []).some(x => {
        if (idx !== undefined && String(x.codigo_facultad) === String(prev.codigo_facultad)) return false
        return String(x.nombre_facultad || '').toLowerCase() === nombre_facultad.toLowerCase()
      })
      const codeExists = (db.faculties || []).some(x => {
        if (idx !== undefined && String(x.codigo_facultad) === String(prev.codigo_facultad)) return false
        return String(x.codigo_facultad || '').toLowerCase() === String(codigo_facultad).toLowerCase()
      })
      if (nameExists) return res.status(400).json({ message: 'Ya existe una facultad con ese nombre' })
      if (codeExists) return res.status(400).json({ message: 'Ya existe una facultad con ese código' })

      // Validate building if provided
      if (id_edificio) {
        const edificio = (db.buildings || []).find(b => Number(b.id_edificio) === id_edificio)
        if (!edificio) return res.status(400).json({ message: 'Edificio no encontrado' })
      }

      db.faculties[idx] = {
        ...prev,
        codigo_facultad,
        nombre_facultad,
        descripcion,
        logo,
        id_edificio,
        estado: f.estado !== undefined ? (f.estado === 'true' || f.estado === true) : prev.estado,
        disponibilidad: f.disponibilidad !== undefined ? f.disponibilidad : prev.disponibilidad,
      }

      saveDB(db)
      res.json({ data: db.faculties[idx] })
    } catch (error) {
      console.error('Error updating faculty:', error)
      res.status(500).json({ message: 'Error al actualizar facultad' })
    }
  })

  // OSM Import endpoint
  app.post('/import/osm', async (req, res) => {
    try {
      const { importOSMData } = await import('./utils/osm-import.js')
      const path = await import('path')
      const { fileURLToPath } = await import('url')
      
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = path.dirname(__filename)
      const osmFilePath = path.resolve(__dirname, '../data/map.osm')

      const options = {
        mergeMode: req.body.mergeMode || 'add',
        updateExisting: req.body.updateExisting || false,
        skipDuplicates: req.body.skipDuplicates !== undefined ? req.body.skipDuplicates : true
      }

      const results = importOSMData(osmFilePath, options)
      res.json({ 
        success: true, 
        message: 'OSM data imported successfully', 
        ...results 
      })
    } catch (error) {
      console.error('OSM import error:', error)
      res.status(500).json({ 
        success: false, 
        message: 'Failed to import OSM data', 
        error: error.message 
      })
    }
  })

  // Get OSM import preview (without actually importing)
  app.get('/import/osm/preview', async (req, res) => {
    try {
      const { parseOSMForImport } = await import('./utils/osm-parser.js')
      const path = await import('path')
      const { fileURLToPath } = await import('url')
      
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = path.dirname(__filename)
      const osmFilePath = path.resolve(__dirname, '../data/map.osm')

      const osmData = parseOSMForImport(osmFilePath)
      res.json({
        success: true,
        buildings: osmData.buildings,
        pois: osmData.pois,
        stats: osmData.stats
      })
    } catch (error) {
      console.error('OSM preview error:', error)
      res.status(500).json({ 
        success: false, 
        message: 'Failed to preview OSM data', 
        error: error.message 
      })
    }
  })

  return app
}

export default createApp
