import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import cloudinary from './config/cloudinary.js'
import { 
  buildingsRepo, 
  floorsRepo, 
  roomsRepo, 
  bathroomsRepo, 
  facultiesRepo 
} from './db/repositories.js'
import statisticsRoutes from './routes/statistics.routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configurar multer para almacenamiento en memoria
const storage = multer.memoryStorage()

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten archivos PNG o JPG'))
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
})

// Función para subir imagen a Cloudinary
async function uploadToCloudinary(buffer, folder, expectedWidth, expectedHeight) {
  const metadata = await sharp(buffer).metadata()
  
  // Validar que las dimensiones estén en un rango razonable (entre 500 y 1800 píxeles)
  const minDimension = 500
  const maxDimension = 1800
  const isValidWidth = metadata.width >= minDimension && metadata.width <= maxDimension
  const isValidHeight = metadata.height >= minDimension && metadata.height <= maxDimension
  
  if (!isValidWidth || !isValidHeight) {
    throw new Error(`La imagen debe tener dimensiones entre ${minDimension}x${minDimension} y ${maxDimension}x${maxDimension} píxeles. Imagen recibida: ${metadata.width}x${metadata.height} píxeles`)
  }
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `geolocalizacion/${folder}`,
        resource_type: 'image',
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result.secure_url)
      }
    )
    
    uploadStream.end(buffer)
  })
}

export function createApp() {
  const app = express()
  
  // Configuración de CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:5173', 'http://localhost:3000']
  
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      
      if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true
  }))
  
  app.use(express.json({ limit: '5mb' }))

  // Static uploads
  const uploadsDir = path.resolve(__dirname, '../uploads')
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
  app.use('/uploads', express.static(uploadsDir))

  // Health
  app.get('/health', (req, res) => res.json({ ok: true }))

  // ==================== STATISTICS ====================
  app.use('/statistics', statisticsRoutes)

  // ==================== DELETED ITEMS ====================
  app.get('/deleted', async (req, res) => {
    try {
      const { type, search } = req.query
      let result = []

      if (!type || type === 'buildings') {
        const buildings = await buildingsRepo.findAll()
        const deleted = buildings.filter(b => !b.estado).map(b => ({
          ...b,
          entity_type: 'building',
          entity_name: 'Edificio'
        }))
        result = [...result, ...deleted]
      }

      if (!type || type === 'floors') {
        const floors = await floorsRepo.findAll()
        const deleted = floors.filter(f => !f.estado).map(f => ({
          ...f,
          entity_type: 'floor',
          entity_name: 'Piso'
        }))
        result = [...result, ...deleted]
      }

      if (!type || type === 'rooms') {
        const rooms = await roomsRepo.findAll()
        const deleted = rooms.filter(r => !r.estado).map(r => ({
          ...r,
          entity_type: 'room',
          entity_name: 'Sala'
        }))
        result = [...result, ...deleted]
      }

      if (!type || type === 'bathrooms') {
        const bathrooms = await bathroomsRepo.findAll()
        const deleted = bathrooms.filter(b => !b.estado).map(b => ({
          ...b,
          entity_type: 'bathroom',
          entity_name: 'Baño'
        }))
        result = [...result, ...deleted]
      }

      // Aplicar búsqueda si existe
      if (search) {
        const searchLower = search.toLowerCase()
        result = result.filter(item => {
          const nombre = item.nombre_edificio || item.nombre_piso || item.nombre_sala || item.nombre_bano || ''
          return nombre.toLowerCase().includes(searchLower)
        })
      }

      res.json({ data: result })
    } catch (error) {
      console.error('Error fetching deleted items:', error)
      res.status(500).json({ message: 'Error al obtener elementos eliminados' })
    }
  })

  // Restaurar elemento eliminado
  app.patch('/deleted/:type/:id/restore', async (req, res) => {
    try {
      const { type, id } = req.params
      const numId = Number(id)

      switch (type) {
        case 'building':
          await buildingsRepo.update(numId, { estado: true })
          break
        case 'floor':
          await floorsRepo.update(numId, { estado: true })
          break
        case 'room':
          await roomsRepo.update(numId, { estado: true })
          break
        case 'bathroom':
          await bathroomsRepo.update(numId, { estado: true })
          break
        default:
          return res.status(400).json({ message: 'Tipo de entidad no válido' })
      }

      res.json({ ok: true, message: 'Elemento restaurado correctamente' })
    } catch (error) {
      console.error('Error restoring item:', error)
      res.status(500).json({ message: 'Error al restaurar elemento' })
    }
  })

  // Eliminar permanentemente
  app.delete('/deleted/:type/:id/permanent', async (req, res) => {
    try {
      const { type, id } = req.params
      const numId = Number(id)

      switch (type) {
        case 'building':
          await buildingsRepo.delete(numId)
          break
        case 'floor':
          await floorsRepo.delete(numId)
          break
        case 'room':
          await roomsRepo.delete(numId)
          break
        case 'bathroom':
          await bathroomsRepo.delete(numId)
          break
        default:
          return res.status(400).json({ message: 'Tipo de entidad no válido' })
      }

      res.json({ ok: true, message: 'Elemento eliminado permanentemente' })
    } catch (error) {
      console.error('Error permanently deleting item:', error)
      res.status(500).json({ message: 'Error al eliminar elemento permanentemente' })
    }
  })

  // ==================== BUILDINGS ====================
  
  app.get('/buildings', async (req, res) => {
    try {
      const buildings = await buildingsRepo.findAll()
      // Filtrar solo edificios activos
      const activeBuildings = buildings.filter(b => b.estado !== false)
      res.json({ data: activeBuildings })
    } catch (error) {
      console.error('Error fetching buildings:', error)
      res.status(500).json({ message: 'Error al obtener edificios' })
    }
  })

  app.post('/buildings', upload.single('imagen'), async (req, res) => {
    try {
      const b = req.body || {}
      
      let imagenUrl = b.imagen || ''
      if (req.file) {
        imagenUrl = await uploadToCloudinary(req.file.buffer, 'buildings', 1600, 1200)
      }
      
      const building = await buildingsRepo.create({
        nombre_edificio: String(b.nombre_edificio || '').trim(),
        acronimo: String(b.acronimo || '').trim(),
        descripcion: b.descripcion ? String(b.descripcion).trim() : '',
        imagen: imagenUrl,
        cord_latitud: Number(b.cord_latitud) || 0,
        cord_longitud: Number(b.cord_longitud) || 0,
        estado: b.estado === 'true' || b.estado === true,
        disponibilidad: b.disponibilidad || 'Disponible'
      })
      
      res.status(201).json({ data: building })
    } catch (error) {
      console.error('Error creating building:', error)
      res.status(400).json({ message: error.message || 'Error al crear edificio' })
    }
  })

  app.put('/buildings/:id', upload.single('imagen'), async (req, res) => {
    try {
      const id = Number(req.params.id)
      const prev = await buildingsRepo.findById(id)
      if (!prev) return res.status(404).json({ message: 'Not found' })
      
      const b = req.body || {}
      
      let imagenUrl = b.imagen !== undefined ? b.imagen : prev.imagen
      if (req.file) {
        imagenUrl = await uploadToCloudinary(req.file.buffer, 'buildings', 1600, 1200)
      }
      
      const building = await buildingsRepo.update(id, {
        nombre_edificio: b.nombre_edificio || prev.nombre_edificio,
        acronimo: b.acronimo !== undefined ? b.acronimo : prev.acronimo,
        descripcion: b.descripcion !== undefined ? String(b.descripcion || '').trim() : prev.descripcion,
        imagen: imagenUrl,
        cord_latitud: b.cord_latitud !== undefined ? Number(b.cord_latitud) : prev.cord_latitud,
        cord_longitud: b.cord_longitud !== undefined ? Number(b.cord_longitud) : prev.cord_longitud,
        estado: b.estado !== undefined ? (b.estado === 'true' || b.estado === true) : prev.estado,
        disponibilidad: b.disponibilidad || prev.disponibilidad,
      })
      
      res.json({ data: building })
    } catch (error) {
      console.error('Error updating building:', error)
      res.status(400).json({ message: error.message || 'Error al actualizar edificio' })
    }
  })

  app.delete('/buildings/:id', async (req, res) => {
    try {
      const id = Number(req.params.id)
      
      // Verificar si existen pisos activos asociados al edificio
      const floors = await floorsRepo.findByBuilding(id)
      const activeFloors = floors.filter(f => f.estado)
      
      if (activeFloors && activeFloors.length > 0) {
        // Verificar si existen salas activas asociadas a los pisos activos
        const roomsPromises = activeFloors.map(floor => roomsRepo.findByFloor(floor.id_piso))
        const roomsResults = await Promise.all(roomsPromises)
        const allActiveRooms = roomsResults.flat().filter(r => r.estado)
        
        // Si hay pisos o salas activas, retornar error con los detalles
        return res.status(400).json({
          error: 'DEPENDENCIAS_ENCONTRADAS',
          message: 'No se puede eliminar el edificio porque tiene pisos y/o salas activas asociadas',
          dependencias: {
            pisos: activeFloors.map(f => ({
              id: f.id_piso,
              nombre: f.nombre_piso,
              numero: f.numero_piso
            })),
            salas: allActiveRooms.map(r => ({
              id: r.id_sala,
              nombre: r.nombre_sala,
              piso: activeFloors.find(f => f.id_piso === r.id_piso)?.nombre_piso
            }))
          }
        })
      }
      
      // Si no hay dependencias activas, marcar como eliminado (soft delete)
      await buildingsRepo.update(id, { estado: false })
      res.json({ ok: true, message: 'Edificio marcado como eliminado' })
    } catch (error) {
      console.error('Error deleting building:', error)
      res.status(500).json({ message: 'Error al eliminar edificio' })
    }
  })

  // ==================== FLOORS ====================
  
  app.get('/buildings/:id/floors', async (req, res) => {
    try {
      const id = Number(req.params.id)
      const floors = await floorsRepo.findByBuilding(id)
      res.json({ data: floors })
    } catch (error) {
      console.error('Error fetching floors:', error)
      res.status(500).json({ message: 'Error al obtener pisos' })
    }
  })

  app.post('/buildings/:id/floors', upload.single('imagen'), async (req, res) => {
    try {
      const id_edificio = Number(req.params.id)
      const f = req.body || {}
      
      let imagenUrl = f.imagen || ''
      if (req.file) {
        imagenUrl = await uploadToCloudinary(req.file.buffer, 'floors', 1600, 1200)
      }
      
      const floor = await floorsRepo.create({
        id_edificio,
        nombre_piso: String(f.nombre_piso || '').trim(),
        numero_piso: f.numero_piso != null ? Number(f.numero_piso) : null,
        imagen: imagenUrl,
        codigo_qr: f.codigo_qr || '',
        estado: f.estado === 'true' || f.estado === true,
        disponibilidad: f.disponibilidad || 'Disponible',
      })
      
      res.status(201).json({ data: floor })
    } catch (error) {
      console.error('Error creating floor:', error)
      res.status(400).json({ message: error.message || 'Error al crear piso' })
    }
  })

  app.put('/floors/:id', upload.single('imagen'), async (req, res) => {
    try {
      const id = Number(req.params.id)
      const prev = await floorsRepo.findById(id)
      if (!prev) return res.status(404).json({ message: 'Not found' })
      
      const f = req.body || {}
      
      let imagenUrl = f.imagen !== undefined ? f.imagen : prev.imagen
      if (req.file) {
        imagenUrl = await uploadToCloudinary(req.file.buffer, 'floors', 1600, 1200)
      }
      
      const floor = await floorsRepo.update(id, {
        nombre_piso: f.nombre_piso || prev.nombre_piso,
        numero_piso: f.numero_piso !== undefined ? Number(f.numero_piso) : prev.numero_piso,
        imagen: imagenUrl,
        codigo_qr: f.codigo_qr !== undefined ? f.codigo_qr : prev.codigo_qr,
        estado: f.estado !== undefined ? (f.estado === 'true' || f.estado === true) : prev.estado,
        disponibilidad: f.disponibilidad || prev.disponibilidad,
      })
      
      res.json({ data: floor })
    } catch (error) {
      console.error('Error updating floor:', error)
      res.status(400).json({ message: error.message || 'Error al actualizar piso' })
    }
  })

  app.delete('/floors/:id', async (req, res) => {
    try {
      const id = Number(req.params.id)
      
      // Verificar si existen salas activas asociadas al piso
      const rooms = await roomsRepo.findByFloor(id)
      const activeRooms = rooms.filter(r => r.estado)
      
      if (activeRooms && activeRooms.length > 0) {
        return res.status(400).json({
          error: 'DEPENDENCIAS_ENCONTRADAS',
          message: 'No se puede eliminar el piso porque tiene salas activas asociadas',
          dependencias: {
            salas: activeRooms.map(r => ({
              id: r.id_sala,
              nombre: r.nombre_sala
            }))
          }
        })
      }
      
      // Marcar como eliminado (soft delete)
      await floorsRepo.update(id, { estado: false })
      res.json({ ok: true, message: 'Piso marcado como eliminado' })
    } catch (error) {
      console.error('Error deleting floor:', error)
      res.status(500).json({ message: 'Error al eliminar piso' })
    }
  })

  app.get('/floors/:id/rooms', async (req, res) => {
    try {
      const id = Number(req.params.id)
      const rooms = await roomsRepo.findByFloor(id)
      res.json({ data: rooms })
    } catch (error) {
      console.error('Error fetching rooms:', error)
      res.status(500).json({ message: 'Error al obtener salas' })
    }
  })

  // ==================== ROOMS ====================
  
  app.get('/rooms', async (req, res) => {
    try {
      const rooms = await roomsRepo.findAll()
      res.json({ data: rooms })
    } catch (error) {
      console.error('Error fetching rooms:', error)
      res.status(500).json({ message: 'Error al obtener salas' })
    }
  })

  app.post('/rooms', upload.single('imagen'), async (req, res) => {
    try {
      const r = req.body || {}
      
      let imagenUrl = r.imagen || ''
      if (req.file) {
        imagenUrl = await uploadToCloudinary(req.file.buffer, 'rooms', 1200, 1600)
      }
      
      const room = await roomsRepo.create({
        id_piso: Number(r.id_piso),
        nombre_sala: String(r.nombre_sala || '').trim(),
        acronimo: String(r.acronimo || '').trim(),
        descripcion: r.descripcion ? String(r.descripcion).trim() : '',
        imagen: imagenUrl,
        capacidad: Number(r.capacidad) || 0,
        tipo_sala: r.tipo_sala || '',
        cord_latitud: Number(r.cord_latitud) || 0,
        cord_longitud: Number(r.cord_longitud) || 0,
        estado: r.estado === 'true' || r.estado === true,
        disponibilidad: r.disponibilidad || 'Disponible'
      })
      
      res.status(201).json({ data: room })
    } catch (error) {
      console.error('Error creating room:', error)
      res.status(400).json({ message: error.message || 'Error al crear sala' })
    }
  })

  app.put('/rooms/:id', upload.single('imagen'), async (req, res) => {
    try {
      const id = Number(req.params.id)
      const prev = await roomsRepo.findById(id)
      if (!prev) return res.status(404).json({ message: 'Not found' })
      
      const r = req.body || {}
      
      let imagenUrl = r.imagen !== undefined ? r.imagen : prev.imagen
      if (req.file) {
        imagenUrl = await uploadToCloudinary(req.file.buffer, 'rooms', 1200, 1600)
      }
      
      const room = await roomsRepo.update(id, {
        id_piso: r.id_piso !== undefined ? Number(r.id_piso) : prev.id_piso,
        nombre_sala: r.nombre_sala || prev.nombre_sala,
        acronimo: r.acronimo || prev.acronimo,
        descripcion: r.descripcion !== undefined ? String(r.descripcion || '').trim() : prev.descripcion,
        imagen: imagenUrl,
        capacidad: r.capacidad !== undefined ? Number(r.capacidad) : prev.capacidad,
        tipo_sala: r.tipo_sala !== undefined ? r.tipo_sala : prev.tipo_sala,
        cord_latitud: r.cord_latitud !== undefined ? Number(r.cord_latitud) : prev.cord_latitud,
        cord_longitud: r.cord_longitud !== undefined ? Number(r.cord_longitud) : prev.cord_longitud,
        estado: r.estado !== undefined ? (r.estado === 'true' || r.estado === true) : prev.estado,
        disponibilidad: r.disponibilidad || prev.disponibilidad,
      })
      
      res.json({ data: room })
    } catch (error) {
      console.error('Error updating room:', error)
      res.status(400).json({ message: error.message || 'Error al actualizar sala' })
    }
  })

  app.delete('/rooms/:id', async (req, res) => {
    try {
      const id = Number(req.params.id)
      // Marcar como eliminado (soft delete)
      await roomsRepo.update(id, { estado: false })
      res.json({ ok: true, message: 'Sala marcada como eliminada' })
    } catch (error) {
      console.error('Error deleting room:', error)
      res.status(500).json({ message: 'Error al eliminar sala' })
    }
  })

  // ==================== BATHROOMS ====================
  
  app.get('/bathrooms', async (req, res) => {
    try {
      const bathrooms = await bathroomsRepo.findAll()
      res.json({ data: bathrooms })
    } catch (error) {
      console.error('Error fetching bathrooms:', error)
      res.status(500).json({ message: 'Error al obtener baños' })
    }
  })

  app.post('/bathrooms', upload.single('imagen'), async (req, res) => {
    try {
      const b = req.body || {}
      
      let imagenUrl = b.imagen || ''
      if (req.file) {
        imagenUrl = await uploadToCloudinary(req.file.buffer, 'bathrooms', 1600, 1200)
      }
      
      const id_edificio = Number(b.id_edificio)
      const id_piso = Number(b.id_piso)
      const identificador = String(b.identificador || '').trim()
      const tipo = String(b.tipo || '').toLowerCase()
      const nombre = String(b.nombre || '').trim()
      const capacidad = Number(b.capacidad) || 0

      // validations
      if (!['h', 'm', 'mixto'].includes(tipo)) {
        return res.status(400).json({ message: 'tipo inválido (h/m/mixto)' })
      }

      const descripcion = String(b.descripcion || '').trim()

      const bathroom = await bathroomsRepo.create({
        id_edificio,
        id_piso,
        identificador: identificador || `B${Date.now()}`,
        nombre,
        descripcion,
        capacidad,
        imagen: imagenUrl,
        tipo,
        acceso_discapacidad: b.acceso_discapacidad === true || String(b.acceso_discapacidad || '').toLowerCase() === 'sí' || String(b.acceso_discapacidad || '').toLowerCase() === 'si',
        cord_latitud: Number(b.cord_latitud) || 0,
        cord_longitud: Number(b.cord_longitud) || 0,
        estado: b.estado !== false,
        disponibilidad: b.disponibilidad || 'Disponible'
      })
      
      res.status(201).json({ data: bathroom })
    } catch (error) {
      console.error('Error creating bathroom:', error)
      res.status(400).json({ message: error.message || 'Error al crear baño' })
    }
  })

  app.put('/bathrooms/:id', upload.single('imagen'), async (req, res) => {
    try {
      const id = Number(req.params.id)
      const prev = await bathroomsRepo.findById(id)
      if (!prev) return res.status(404).json({ message: 'Not found' })
      
      const b = req.body || {}
      
      let imagenUrl = b.imagen !== undefined ? b.imagen : prev.imagen
      if (req.file) {
        imagenUrl = await uploadToCloudinary(req.file.buffer, 'bathrooms', 1600, 1200)
      }
      
      const bathroom = await bathroomsRepo.update(id, {
        nombre: b.nombre !== undefined ? String(b.nombre).trim() : prev.nombre,
        descripcion: b.descripcion !== undefined ? String(b.descripcion).trim() : prev.descripcion,
        capacidad: b.capacidad !== undefined ? Number(b.capacidad) : prev.capacidad,
        imagen: imagenUrl,
        tipo: b.tipo || prev.tipo,
        acceso_discapacidad: b.acceso_discapacidad !== undefined ? b.acceso_discapacidad : prev.acceso_discapacidad,
        cord_latitud: b.cord_latitud !== undefined ? Number(b.cord_latitud) : prev.cord_latitud,
        cord_longitud: b.cord_longitud !== undefined ? Number(b.cord_longitud) : prev.cord_longitud,
        estado: b.estado !== undefined ? b.estado : prev.estado,
        disponibilidad: b.disponibilidad || prev.disponibilidad,
      })
      
      res.json({ data: bathroom })
    } catch (error) {
      console.error('Error updating bathroom:', error)
      res.status(400).json({ message: error.message || 'Error al actualizar baño' })
    }
  })

  app.delete('/bathrooms/:id', async (req, res) => {
    try {
      const id = Number(req.params.id)
      // Marcar como eliminado (soft delete)
      await bathroomsRepo.update(id, { estado: false })
      res.json({ ok: true, message: 'Baño marcado como eliminado' })
    } catch (error) {
      console.error('Error deleting bathroom:', error)
      res.status(500).json({ message: 'Error al eliminar baño' })
    }
  })

  // ==================== FACULTIES ====================
  
  app.get('/faculties', async (req, res) => {
    try {
      const faculties = await facultiesRepo.findAll()
      res.json({ data: faculties })
    } catch (error) {
      console.error('Error fetching faculties:', error)
      res.status(500).json({ message: 'Error al obtener facultades' })
    }
  })

  app.post('/faculties', upload.single('logo'), async (req, res) => {
    try {
      const f = req.body || {}
      
      let logoUrl = f.logo || ''
      if (req.file) {
        logoUrl = await uploadToCloudinary(req.file.buffer, 'faculties', 1600, 1200)
      }

      const codigo_facultad = f.codigo_facultad !== undefined && String(f.codigo_facultad).trim() !== '' ? String(f.codigo_facultad).trim() : `FAC${Date.now()}`
      const nombre_facultad = String(f.nombre_facultad || '').trim()
      const descripcion = String(f.descripcion || '').trim()
      const id_edificio = f.id_edificio ? Number(f.id_edificio) : null

      // Validations
      if (!nombre_facultad) return res.status(400).json({ message: 'Nombre de facultad obligatorio' })
      if (!codigo_facultad) return res.status(400).json({ message: 'Código de facultad obligatorio' })
      const codeRe = /^[A-Za-z0-9_-]{2,50}$/
      if (!codeRe.test(String(codigo_facultad))) return res.status(400).json({ message: 'Formato de código inválido' })

      const faculty = await facultiesRepo.create({
        codigo_facultad,
        nombre_facultad,
        descripcion,
        logo: logoUrl,
        id_edificio: id_edificio || null,
        estado: f.estado !== undefined ? (f.estado === 'true' || f.estado === true) : true,
        disponibilidad: f.disponibilidad || 'Disponible'
      })

      res.status(201).json({ data: faculty })
    } catch (error) {
      console.error('Error creating faculty:', error)
      res.status(400).json({ message: error.message || 'Error al crear facultad' })
    }
  })

  app.put('/faculties/:id', upload.single('logo'), async (req, res) => {
    try {
      const id = req.params.id
      const prev = await facultiesRepo.findById(id)
      if (!prev) return res.status(404).json({ message: 'Facultad no encontrada' })
      
      const fbody = req.body || {}
      
      let logoUrl = fbody.logo !== undefined ? fbody.logo : prev.logo || ''
      if (req.file) {
        logoUrl = await uploadToCloudinary(req.file.buffer, 'faculties', 1600, 1200)
      }

      const nombre_facultad = String(fbody.nombre_facultad !== undefined ? fbody.nombre_facultad : prev.nombre_facultad).trim()
      const descripcion = String(fbody.descripcion !== undefined ? fbody.descripcion : prev.descripcion || '').trim()
      const id_edificio = fbody.id_edificio !== undefined && fbody.id_edificio !== '' ? Number(fbody.id_edificio) : (prev.id_edificio || null)

      if (!nombre_facultad) return res.status(400).json({ message: 'Nombre de facultad obligatorio' })

      const updated = await facultiesRepo.update(id, {
        nombre_facultad,
        descripcion,
        logo: logoUrl,
        id_edificio: id_edificio || null,
        estado: fbody.estado !== undefined ? (fbody.estado === 'true' || fbody.estado === true) : prev.estado,
        disponibilidad: fbody.disponibilidad || prev.disponibilidad || 'Disponible'
      })

      res.json({ data: updated })
    } catch (error) {
      console.error('Error updating faculty:', error)
      res.status(400).json({ message: error.message || 'Error al actualizar facultad' })
    }
  })

  app.delete('/faculties/:id', async (req, res) => {
    try {
      const id = req.params.id
      await facultiesRepo.delete(id)
      res.json({ ok: true })
    } catch (error) {
      console.error('Error deleting faculty:', error)
      res.status(500).json({ message: 'Error al eliminar facultad' })
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
