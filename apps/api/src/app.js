import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import sharp from 'sharp'
import bcrypt from 'bcrypt'
import { fileURLToPath } from 'url'
import morgan from 'morgan'
import cloudinary from './config/cloudinary.js'
import { pool } from './config/database.js'
import logger from './utils/logger.js'
import { 
  buildingsRepo, 
  floorsRepo, 
  roomsRepo, 
  bathroomsRepo, 
  facultiesRepo,
  totemsRepo
} from './db/repositories.js'
import statisticsRoutes from './routes/statistics.routes.js'
import auditRoutes from './routes/audit.routes.js'
import authRoutes from './routes/auth.routes.js'
import logsRoutes from './routes/logs.routes.js'
import { logAudit } from './services/audit.service.js'
import { getUserFromRequest } from './utils/auth-helper.js'
import { errorLogger } from './middlewares/error-logger.middleware.js'

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
  // Redimensionar automáticamente si excede el máximo, manteniendo aspecto
  const maxDimension = 1800
  const metadata = await sharp(buffer).metadata()
  let processedBuffer = buffer
  if (metadata.width > maxDimension || metadata.height > maxDimension) {
    processedBuffer = await sharp(buffer)
      .resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true })
      .toBuffer()
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
    
    uploadStream.end(processedBuffer)
  })
}

export function createApp() {
  const app = express()
  
  // Configuración para proxy reverso (Nginx)
  app.set('trust proxy', 1)

  logger.bindConsole()
  app.use(morgan('combined', { stream: logger.stream }))
  
  // Configuración de CORS
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',').map(o => o.trim())
  
  app.use(cors({
    origin: (origin, callback) => {
      // Permitir solicitudes sin origen (curl, Postman, llamadas servidor-servidor, etc.)
      if (!origin) return callback(null, true)
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        logger.warn(`Bloqueado por CORS: ${origin}`)
        callback(new Error('No permitido por CORS'))
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

  // ==================== AUTH ====================
  app.use('/auth', authRoutes)

  // ==================== STATISTICS ====================
  app.use('/statistics', statisticsRoutes)

  // ==================== AUDIT LOGS ====================
  app.use('/audit-logs', auditRoutes)

  // ==================== APPLICATION LOGS ====================
  app.use('/logs', logsRoutes)

  // DEBUG endpoint
  app.get('/debug/floor/:id', async (req, res) => {
    const id = Number(req.params.id)
    const floor = await floorsRepo.findById(id)
    res.json({ floor })
  })

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
        console.log('🔍 Todos los pisos:', floors.map(f => ({ id: f.id_piso, nombre: f.nombre_piso, estado: f.estado })))
        const deleted = floors.filter(f => !f.estado)
        console.log('🗑️ Pisos eliminados (estado=false):', deleted.map(f => ({ id: f.id_piso, nombre: f.nombre_piso, estado: f.estado })))
        const mapped = deleted.map(f => ({
          ...f,
          entity_type: 'floor',
          entity_name: 'Piso'
        }))
        result = [...result, ...mapped]
      }

      if (!type || type === 'rooms') {
        const rooms = await roomsRepo.findAllIncludingDeleted()
        console.log('🔍 Todas las salas:', rooms.map(r => ({ id: r.id_sala, nombre: r.nombre_sala, estado: r.estado })))
        const deleted = rooms.filter(r => !r.estado)
        console.log('🗑️ Salas eliminadas (estado=false):', deleted.map(r => ({ id: r.id_sala, nombre: r.nombre_sala, estado: r.estado })))
        const mapped = deleted.map(r => ({
          ...r,
          entity_type: 'room',
          entity_name: 'Sala'
        }))
        result = [...result, ...mapped]
      }

      if (!type || type === 'bathrooms') {
        const bathrooms = await bathroomsRepo.findAllIncludingDeleted()
        console.log('🔍 Todos los baños:', bathrooms.map(b => ({ id: b.id_bano, nombre: b.nombre, estado: b.estado })))
        const deleted = bathrooms.filter(b => !b.estado)
        console.log('🗑️ Baños eliminados (estado=false):', deleted.map(b => ({ id: b.id_bano, nombre: b.nombre, estado: b.estado })))
        const mapped = deleted.map(b => ({
          ...b,
          entity_type: 'bathroom',
          entity_name: 'Baño'
        }))
        result = [...result, ...mapped]
      }

      if (!type || type === 'faculties') {
        const faculties = await facultiesRepo.findAllIncludingDeleted()
        console.log('🔍 Todas las facultades:', faculties.map(f => ({ codigo: f.codigo_facultad, nombre: f.nombre_facultad, estado: f.estado })))
        const deleted = faculties.filter(f => !f.estado)
        console.log('🗑️ Facultades eliminadas (estado=false):', deleted.map(f => ({ codigo: f.codigo_facultad, nombre: f.nombre_facultad, estado: f.estado })))
        const mapped = deleted.map(f => ({
          ...f,
          entity_type: 'faculty',
          entity_name: 'Facultad'
        }))
        result = [...result, ...mapped]
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
      console.log(`🔄 Restaurando ${type} con ID: ${numId}`)

      let result
      let entityType
      let entityName
      
      switch (type) {
        case 'building':
          result = await buildingsRepo.update(numId, { estado: true })
          entityType = 'edificio'
          entityName = result.nombre_edificio
          console.log('✅ Edificio restaurado:', result)
          break
        case 'floor':
          const floor = await floorsRepo.findById(numId)
          result = await floorsRepo.updateEstado(numId, true)
          entityType = 'piso'
          entityName = floor.nombre_piso
          console.log('✅ Piso restaurado:', result)
          break
        case 'room':
          result = await roomsRepo.update(numId, { estado: true })
          entityType = 'sala'
          entityName = result.nombre_sala
          console.log('✅ Sala restaurada:', result)
          break
        case 'bathroom':
          result = await bathroomsRepo.update(numId, { estado: true })
          entityType = 'baño'
          entityName = result.nombre || result.identificador
          console.log('✅ Baño restaurado:', result)
          break
        case 'faculty':
          const faculty = await facultiesRepo.findById(id)
          result = await facultiesRepo.updateEstado(id, true)
          entityType = 'facultad'
          entityName = faculty.nombre_facultad
          console.log('✅ Facultad restaurada:', result)
          break
        default:
          return res.status(400).json({ message: 'Tipo de entidad no válido' })
      }

      // Registrar auditoría de restauración
      const user = getUserFromRequest(req)
      await logAudit({
        userId: user.userId,
        userEmail: user.email,
        action: 'restaurar',
        entityType: entityType,
        entityId: String(numId || id),
        entityName: entityName,
        changes: { restaurado: result }
      })

      res.json({ ok: true, message: 'Elemento restaurado correctamente' })
    } catch (error) {
      console.error('❌ Error restoring item:', error)
      res.status(500).json({ message: 'Error al restaurar elemento' })
    }
  })

  // Eliminar permanentemente
  app.delete('/deleted/:type/:id/permanent', async (req, res) => {
    try {
      const { type, id } = req.params
      const numId = Number(id)

      let entityData
      let entityType
      let entityName
      
      // Obtener datos antes de eliminar
      switch (type) {
        case 'building':
          entityData = await buildingsRepo.findById(numId)
          entityType = 'edificio'
          entityName = entityData?.nombre_edificio
          await buildingsRepo.delete(numId)
          break
        case 'floor':
          entityData = await floorsRepo.findById(numId)
          entityType = 'piso'
          entityName = entityData?.nombre_piso
          await floorsRepo.delete(numId)
          break
        case 'room':
          entityData = await roomsRepo.findById(numId)
          entityType = 'sala'
          entityName = entityData?.nombre_sala
          await roomsRepo.delete(numId)
          break
        case 'bathroom':
          entityData = await bathroomsRepo.findById(numId)
          entityType = 'baño'
          entityName = entityData?.nombre || entityData?.identificador
          await bathroomsRepo.delete(numId)
          break
        case 'faculty':
          entityData = await facultiesRepo.findById(id)
          entityType = 'facultad'
          entityName = entityData?.nombre_facultad
          await facultiesRepo.delete(id)
          break
        default:
          return res.status(400).json({ message: 'Tipo de entidad no válido' })
      }

      // Registrar auditoría de eliminación permanente
      if (entityData) {
        const user = getUserFromRequest(req)
        await logAudit({
          userId: user.userId,
          userEmail: user.email,
          action: 'eliminar',
          entityType: entityType,
          entityId: String(numId || id),
          entityName: entityName || 'Desconocido',
          changes: { eliminado_permanentemente: entityData }
        })
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
      
      // Validar que no exista otro edificio activo en la misma ubicación
      const lat = Number(b.cord_latitud) || 0
      const lng = Number(b.cord_longitud) || 0
      const allBuildings = await buildingsRepo.findAll()
      const existingLocation = allBuildings.find(existing => 
        existing.estado && 
        Math.abs(existing.cord_latitud - lat) < 0.0001 && 
        Math.abs(existing.cord_longitud - lng) < 0.0001
      )
      
      if (existingLocation) {
        return res.status(400).json({ 
          message: `Ya existe un edificio en esta ubicación: ${existingLocation.nombre_edificio}` 
        })
      }
      
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
      
      // Registrar auditoría
      const user = getUserFromRequest(req)
      await logAudit({
        userId: user.userId,
        userEmail: user.email,
        action: 'crear',
        entityType: 'edificio',
        entityId: building.id_edificio,
        entityName: building.nombre_edificio,
        changes: { nuevo: building }
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
      console.log(`[PUT /buildings/${id}] Iniciando actualizacion de datos...`)
      if (req.body) console.log('Datos recibidos:', JSON.stringify(req.body))

      const b = req.body || {}

      // Obtener el edificio previo para poder comparar y hacer fallback
      const prev = await buildingsRepo.findById(id)
      if (!prev) {
        return res.status(404).json({ message: 'Edificio no encontrado' })
      }
      
      // Validar que no exista otro edificio activo en la misma ubicación (excluyendo este edificio)
      const lat = b.cord_latitud !== undefined ? Number(b.cord_latitud) : prev.cord_latitud
      const lng = b.cord_longitud !== undefined ? Number(b.cord_longitud) : prev.cord_longitud
      const allBuildings = await buildingsRepo.findAll()
      const existingLocation = allBuildings.find(existing => 
        existing.id_edificio !== id &&
        existing.estado && 
        Math.abs(existing.cord_latitud - lat) < 0.0001 && 
        Math.abs(existing.cord_longitud - lng) < 0.0001
      )
      
      if (existingLocation) {
        return res.status(400).json({ 
          message: `Ya existe un edificio en esta ubicación: ${existingLocation.nombre_edificio}` 
        })
      }
      
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
      
      // Registrar auditoría
      const user = getUserFromRequest(req)
      await logAudit({
        userId: user.userId,
        userEmail: user.email,
        action: 'modificar',
        entityType: 'edificio',
        entityId: id,
        entityName: building.nombre_edificio,
        changes: { anterior: prev, nuevo: building }
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
      const building = await buildingsRepo.findById(id)
      await buildingsRepo.update(id, { estado: false })
      
      // Registrar auditoría
      const user = getUserFromRequest(req)
      await logAudit({
        userId: user.userId,
        userEmail: user.email,
        action: 'eliminar',
        entityType: 'edificio',
        entityId: id,
        entityName: building.nombre_edificio,
        changes: { eliminado: building }
      })
      
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
      
      // Validar que el número de piso sea único en el edificio
      if (f.numero_piso != null) {
        const allFloors = await floorsRepo.findAll()
        const duplicateFloor = allFloors.find(floor => 
          floor.id_edificio === id_edificio && 
          floor.numero_piso === Number(f.numero_piso) &&
          floor.estado
        )
        if (duplicateFloor) {
          return res.status(400).json({ 
            message: `Ya existe el piso número ${f.numero_piso} en este edificio` 
          })
        }
      }
      
      let imagenUrl = f.imagen || ''
      if (req.file) {
        imagenUrl = await uploadToCloudinary(req.file.buffer, 'floors', 1600, 1200)
      }
      
      const floor = await floorsRepo.create({
        id_edificio,
        nombre_piso: String(f.nombre_piso || '').trim(),
        numero_piso: f.numero_piso != null ? Number(f.numero_piso) : null,
        imagen: imagenUrl,
        estado: f.estado === 'true' || f.estado === true,
        disponibilidad: f.disponibilidad || 'Disponible',
      })
      
      // Registrar auditoría
      const user = getUserFromRequest(req)
      await logAudit({
        userId: user.userId,
        userEmail: user.email,
        action: 'crear',
        entityType: 'piso',
        entityId: floor.id_piso,
        entityName: floor.nombre_piso,
        changes: { nuevo: floor }
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
      
      // Validar que el número de piso sea único en el edificio (excluyendo el piso actual)
      const numero_piso = f.numero_piso !== undefined ? Number(f.numero_piso) : prev.numero_piso
      if (numero_piso != null) {
        const allFloors = await floorsRepo.findAll()
        const duplicateFloor = allFloors.find(floor => 
          floor.id_piso !== id &&
          floor.id_edificio === prev.id_edificio && 
          floor.numero_piso === numero_piso &&
          floor.estado
        )
        if (duplicateFloor) {
          return res.status(400).json({ 
            message: `Ya existe el piso número ${numero_piso} en este edificio` 
          })
        }
      }
      
      let imagenUrl = f.imagen !== undefined ? f.imagen : prev.imagen
      if (req.file) {
        imagenUrl = await uploadToCloudinary(req.file.buffer, 'floors', 1600, 1200)
      }
      
      const floor = await floorsRepo.update(id, {
        nombre_piso: f.nombre_piso || prev.nombre_piso,
        numero_piso: numero_piso,
        imagen: imagenUrl,
        estado: f.estado !== undefined ? (f.estado === 'true' || f.estado === true) : prev.estado,
        disponibilidad: f.disponibilidad || prev.disponibilidad,
      })
      
      // Registrar auditoría
      const user = getUserFromRequest(req)
      await logAudit({
        userId: user.userId,
        userEmail: user.email,
        action: 'modificar',
        entityType: 'piso',
        entityId: id,
        entityName: floor.nombre_piso,
        changes: { anterior: prev, nuevo: floor }
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
      const floor = await floorsRepo.findById(id)
      await floorsRepo.updateEstado(id, false)
      
      // Registrar auditoría
      const user = getUserFromRequest(req)
      await logAudit({
        userId: user.userId,
        userEmail: user.email,
        action: 'eliminar',
        entityType: 'piso',
        entityId: id,
        entityName: floor.nombre_piso,
        changes: { eliminado: floor }
      })
      
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
      
      // Validar que no exista otra sala activa en la misma ubicación
      const lat = Number(r.cord_latitud) || 0
      const lng = Number(r.cord_longitud) || 0
      const allRooms = await roomsRepo.findAll()
      const existingLocation = allRooms.find(existing => 
        existing.estado && 
        Math.abs(existing.cord_latitud - lat) < 0.0001 && 
        Math.abs(existing.cord_longitud - lng) < 0.0001
      )
      
      if (existingLocation) {
        return res.status(400).json({ 
          message: `Ya existe una sala en esta ubicación: ${existingLocation.nombre_sala}` 
        })
      }
      
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
      
      // Registrar auditoría
      const user = getUserFromRequest(req)
      await logAudit({
        userId: user.userId,
        userEmail: user.email,
        action: 'crear',
        entityType: 'sala',
        entityId: room.id_sala,
        entityName: room.nombre_sala,
        changes: { nuevo: room }
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
      
      // Validar que no exista otra sala activa en la misma ubicación (excluyendo esta sala)
      const lat = r.cord_latitud !== undefined ? Number(r.cord_latitud) : prev.cord_latitud
      const lng = r.cord_longitud !== undefined ? Number(r.cord_longitud) : prev.cord_longitud
      const allRooms = await roomsRepo.findAll()
      const existingLocation = allRooms.find(existing => 
        existing.id_sala !== id &&
        existing.estado && 
        Math.abs(existing.cord_latitud - lat) < 0.0001 && 
        Math.abs(existing.cord_longitud - lng) < 0.0001
      )
      
      if (existingLocation) {
        return res.status(400).json({ 
          message: `Ya existe una sala en esta ubicación: ${existingLocation.nombre_sala}` 
        })
      }
      
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
      
      // Registrar auditoría
      const user = getUserFromRequest(req)
      await logAudit({
        userId: user.userId,
        userEmail: user.email,
        action: 'modificar',
        entityType: 'sala',
        entityId: id,
        entityName: room.nombre_sala,
        changes: { anterior: prev, nuevo: room }
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
      console.log('DELETE /rooms/:id - soft delete sala:', id)
      // Marcar como eliminado (soft delete)
      const room = await roomsRepo.findById(id)
      await roomsRepo.updateEstado(id, false)
      console.log('Sala marcada como eliminada:', id)
      
      // Registrar auditoría
      const user = getUserFromRequest(req)
      await logAudit({
        userId: user.userId,
        userEmail: user.email,
        action: 'eliminar',
        entityType: 'sala',
        entityId: id,
        entityName: room.nombre_sala,
        changes: { eliminado: room }
      })
      
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
      
      /*
      // Validar que no exista otro baño activo en la misma ubicación - DESACTIVADO para permitir múltiples baños
      const lat = Number(b.cord_latitud) || 0
      const lng = Number(b.cord_longitud) || 0
      const allBathrooms = await bathroomsRepo.findAll()
      const existingLocation = allBathrooms.find(existing => 
        existing.estado && 
        Math.abs(existing.cord_latitud - lat) < 0.0001 && 
        Math.abs(existing.cord_longitud - lng) < 0.0001
      )
      
      if (existingLocation) {
        return res.status(400).json({ 
          message: `Ya existe un baño en esta ubicación: ${existingLocation.nombre_bano || existingLocation.identificador}` 
        })
      }
      */
      
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
      console.log('DELETE /bathrooms/:id - soft delete baño:', id)
      // Marcar como eliminado (soft delete)
      await bathroomsRepo.updateEstado(id, false)
      console.log('Baño marcado como eliminado:', id)
      res.json({ ok: true, message: 'Baño marcado como eliminado' })
    } catch (error) {
      console.error('Error deleting bathroom:', error)
      res.status(500).json({ message: 'Error al eliminar baño' })
    }
  })

  // ==================== FACULTIES ====================
  
  app.get('/faculties', async (req, res) => {
    try {
      console.log('📋 GET /faculties - Obteniendo facultades...')
      const faculties = await facultiesRepo.findAll()
      console.log(`✅ Encontradas ${faculties.length} facultades`)
      
      // Obtener edificios asociados para cada facultad
      for (const faculty of faculties) {
        console.log(`🔍 Buscando edificios para facultad: ${faculty.codigo_facultad}`)
        const buildingsResult = await pool.query(`
          SELECT b.id_edificio, b.nombre_edificio
          FROM faculty_buildings fb
          JOIN buildings b ON fb.id_edificio = b.id_edificio
          WHERE fb.codigo_facultad = $1 AND b.estado = true
          ORDER BY b.nombre_edificio
        `, [faculty.codigo_facultad])
        
        console.log(`  📦 Edificios encontrados: ${buildingsResult.rows.length}`)
        faculty.edificios = buildingsResult.rows
      }
      
      console.log('✅ GET /faculties - Éxito')
      res.json({ data: faculties })
    } catch (error) {
      console.error('❌ Error fetching faculties:', error)
      console.error('Stack:', error.stack)
      res.status(500).json({ message: 'Error al obtener facultades' })
    }
  })

  app.post('/faculties', upload.single('logo'), async (req, res) => {
    try {
      console.log('📝 POST /faculties - Inicio')
      const f = req.body || {}
      console.log('📦 Body recibido:', f)
      
      let logoUrl = f.logo || ''
      if (req.file) {
        console.log('🖼️ Archivo recibido:', req.file.originalname)
        logoUrl = await uploadToCloudinary(req.file.buffer, 'faculties', 1600, 1200)
        console.log('✅ Logo subido:', logoUrl)
      }

      const codigo_facultad = f.codigo_facultad !== undefined && String(f.codigo_facultad).trim() !== '' ? String(f.codigo_facultad).trim() : `FAC${Date.now()}`
      const nombre_facultad = String(f.nombre_facultad || '').trim()
      const descripcion = String(f.descripcion || '').trim()
      
      // Parse edificios_ids (puede venir como string JSON o array)
      let edificiosIds = []
      if (f.edificios_ids) {
        edificiosIds = typeof f.edificios_ids === 'string' ? JSON.parse(f.edificios_ids) : f.edificios_ids
        console.log('🏢 Edificios a asociar:', edificiosIds)
      }

      // Validations
      if (!nombre_facultad) return res.status(400).json({ message: 'Nombre de facultad obligatorio' })
      if (!codigo_facultad) return res.status(400).json({ message: 'Código de facultad obligatorio' })
      const codeRe = /^[A-Za-z0-9_-]{2,50}$/
      if (!codeRe.test(String(codigo_facultad))) return res.status(400).json({ message: 'Formato de código inválido' })

      console.log('🏗️ Creando facultad con datos:', {
        codigo_facultad,
        nombre_facultad,
        descripcion,
        logo: logoUrl,
        estado: f.estado !== undefined ? (f.estado === 'true' || f.estado === true) : true,
        disponibilidad: f.disponibilidad || 'Disponible'
      })
      
      const faculty = await facultiesRepo.create({
        codigo_facultad,
        nombre_facultad,
        descripcion,
        logo: logoUrl,
        estado: f.estado !== undefined ? (f.estado === 'true' || f.estado === true) : true,
        disponibilidad: f.disponibilidad || 'Disponible'
      })
      
      console.log('✅ Facultad creada:', faculty)
      
      // Asociar edificios
      if (edificiosIds.length > 0) {
        console.log('🔗 Asociando edificios...')
        for (const id_edificio of edificiosIds) {
          console.log(`  - Asociando edificio ${id_edificio} con facultad ${codigo_facultad}`)
          await pool.query(`
            INSERT INTO faculty_buildings (codigo_facultad, id_edificio)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `, [codigo_facultad, Number(id_edificio)])
        }
        console.log('✅ Edificios asociados correctamente')
      }

      // Registrar auditoría
      const user = getUserFromRequest(req)
      await logAudit({
        userId: user.userId,
        userEmail: user.email,
        action: 'crear',
        entityType: 'facultad',
        entityId: faculty.codigo_facultad,
        entityName: faculty.nombre_facultad,
        changes: { nuevo: faculty }
      })
      
      console.log('✅ POST /faculties - Éxito')
      res.status(201).json({ data: faculty })
    } catch (error) {
      console.error('❌ Error creating faculty:', error)
      console.error('Stack trace:', error.stack)
      
      // Manejar error de código duplicado
      if (error.code === '23505' && error.constraint === 'faculties_pkey') {
        return res.status(400).json({ message: 'El código de facultad ya existe. Por favor usa un código diferente.' })
      }
      
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
      
      // Parse edificios_ids
      let edificiosIds = []
      if (fbody.edificios_ids !== undefined) {
        edificiosIds = typeof fbody.edificios_ids === 'string' ? JSON.parse(fbody.edificios_ids) : fbody.edificios_ids
      }

      if (!nombre_facultad) return res.status(400).json({ message: 'Nombre de facultad obligatorio' })

      const updated = await facultiesRepo.update(id, {
        nombre_facultad,
        descripcion,
        logo: logoUrl,
        estado: fbody.estado !== undefined ? (fbody.estado === 'true' || fbody.estado === true) : prev.estado,
        disponibilidad: fbody.disponibilidad || prev.disponibilidad || 'Disponible'
      })
      
      // Actualizar edificios asociados si se proporcionaron
      if (fbody.edificios_ids !== undefined) {
        // Eliminar todas las asociaciones actuales
        await pool.query(`
          DELETE FROM faculty_buildings WHERE codigo_facultad = $1
        `, [id])
        
        // Agregar las nuevas asociaciones
        if (edificiosIds.length > 0) {
          for (const id_edificio of edificiosIds) {
            await pool.query(`
              INSERT INTO faculty_buildings (codigo_facultad, id_edificio)
              VALUES ($1, $2)
              ON CONFLICT DO NOTHING
            `, [id, Number(id_edificio)])
          }
        }
      }

      // Registrar auditoría
      const user = getUserFromRequest(req)
      await logAudit({
        userId: user.userId,
        userEmail: user.email,
        action: 'modificar',
        entityType: 'facultad',
        entityId: id,
        entityName: updated.nombre_facultad,
        changes: { anterior: prev, nuevo: updated }
      })
      
      res.json({ data: updated })
    } catch (error) {
      console.error('Error updating faculty:', error)
      res.status(400).json({ message: error.message || 'Error al actualizar facultad' })
    }
  })

  // Endpoint para verificar dependencias sin eliminar
  app.get('/faculties/:id/check-dependencies', async (req, res) => {
    try {
      const id = req.params.id
      console.log('\n🔍 GET /faculties/:id/check-dependencies - ID recibido:', id)
      
      // Verificar edificios asociados
      const buildingsResult = await pool.query(`
        SELECT b.id_edificio, b.nombre_edificio
        FROM faculty_buildings fb
        JOIN buildings b ON fb.id_edificio = b.id_edificio
        WHERE fb.codigo_facultad = $1 AND b.estado = true
      `, [id])
      
      if (buildingsResult.rows.length > 0) {
        console.log('⚠️ Facultad tiene edificios asociados:', buildingsResult.rows.length)
        return res.json({
          hasDependencies: true,
          dependencias: {
            edificios: buildingsResult.rows.map(b => ({
              id: b.id_edificio,
              nombre: b.nombre_edificio
            }))
          }
        })
      }
      
      console.log('✅ Facultad no tiene dependencias')
      res.json({ hasDependencies: false })
    } catch (error) {
      console.error('❌ Error checking dependencies:', error)
      res.status(500).json({ message: 'Error al verificar dependencias' })
    }
  })

  app.delete('/faculties/:id', async (req, res) => {
    try {
      const id = req.params.id
      console.log('\n🔍 DELETE /faculties/:id - ID recibido:', id)
      
      // Obtener la facultad
      const faculty = await facultiesRepo.findById(id)
      console.log('📋 Facultad encontrada:', JSON.stringify(faculty, null, 2))
      
      if (!faculty) {
        console.log('❌ Facultad no encontrada')
        return res.status(404).json({ message: 'Facultad no encontrada' })
      }
      
      // Verificar edificios asociados
      const buildingsResult = await pool.query(`
        SELECT b.id_edificio, b.nombre_edificio
        FROM faculty_buildings fb
        JOIN buildings b ON fb.id_edificio = b.id_edificio
        WHERE fb.codigo_facultad = $1 AND b.estado = true
      `, [id])
      
      if (buildingsResult.rows.length > 0) {
        console.log('❌ No se puede eliminar - facultad tiene edificios asociados:', buildingsResult.rows.length)
        return res.status(400).json({
          error: 'DEPENDENCIAS_ENCONTRADAS',
          message: 'No se puede eliminar la facultad porque tiene edificios asociados',
          dependencias: {
            edificios: buildingsResult.rows.map(b => ({
              id: b.id_edificio,
              nombre: b.nombre_edificio
            }))
          }
        })
      }
      
      console.log('✅ Procediendo con soft delete de facultad:', id)
      // Marcar como eliminado (soft delete)
      await facultiesRepo.updateEstado(id, false)
      
      // Registrar auditoría
      const user = getUserFromRequest(req)
      await logAudit({
        userId: user.userId,
        userEmail: user.email,
        action: 'eliminar',
        entityType: 'facultad',
        entityId: id,
        entityName: faculty.nombre_facultad,
        changes: { eliminado: faculty }
      })
      
      console.log('✅ Facultad marcada como eliminada:', id)
      res.json({ ok: true, message: 'Facultad marcada como eliminada' })
    } catch (error) {
      console.error('❌ Error deleting faculty:', error)
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
        skipDuplicates: req.body.skipDuplicates !== undefined ? req.body.skipDuplicates : true,
        importType: req.body.importType || 'buildings' // 'buildings' | 'routes' | 'both'
      }

      const results = importOSMData(osmFilePath, options)
      
      let message = 'OSM data imported successfully'
      if (options.importType === 'routes') {
        message = 'OSM routes imported successfully'
      } else if (options.importType === 'both') {
        message = 'OSM buildings and routes imported successfully'
      }
      
      res.json({ 
        success: true, 
        message, 
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

  // ==================== TOTEMS ====================
  
  app.get('/totems', async (req, res) => {
    try {
      const totems = await totemsRepo.findAll({
        search: req.query.search,
        limit: req.query.limit,
        offset: req.query.offset
      })
      res.json({ data: totems })
    } catch (error) {
      console.error('Error fetching totems:', error)
      res.status(500).json({ message: 'Error al obtener tótems' })
    }
  })

  app.post('/totems', upload.single('imagen'), async (req, res) => {
    const client = await pool.connect()
    try {
      const b = req.body || {}
      
      // Validaciones básicas
      if (!b.email || !b.password) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos' })
      }

      await client.query('BEGIN')

      // 1. Crear usuario para el tótem
      // Verificar si el email existe
      const userCheck = await client.query('SELECT id_usuario FROM usuarios WHERE email = $1', [b.email])
      if (userCheck.rows.length > 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({ message: 'El email ya está registrado' })
      }

      const hashedPassword = await bcrypt.hash(b.password, 10)
      const userResult = await client.query(`
        INSERT INTO usuarios (nombre, email, password_hash, rol, estado)
        VALUES ($1, $2, $3, 'totem', true)
        RETURNING id_usuario
      `, [b.nombre_totem, b.email, hashedPassword])
      
      const idUsuario = userResult.rows[0].id_usuario

      // 2. Crear el tótem
      let imagenUrl = b.imagen || ''
      if (req.file) {
        imagenUrl = await uploadToCloudinary(req.file.buffer, 'totems', 1600, 1200)
      }
      
      const totemResult = await client.query(`
        INSERT INTO totems (
          nombre_totem, descripcion, imagen,
          cord_latitud, cord_longitud, id_usuario
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        String(b.nombre_totem || '').trim(),
        b.descripcion ? String(b.descripcion).trim() : '',
        imagenUrl,
        Number(b.cord_latitud) || 0,
        Number(b.cord_longitud) || 0,
        idUsuario
      ])

      await client.query('COMMIT')
      
      // Registrar auditoría
      const user = getUserFromRequest(req)
      await logAudit({
        userId: user.userId,
        userEmail: user.email,
        action: 'crear',
        entityType: 'totem',
        entityId: String(totemResult.rows[0].id_totem),
        entityName: totemResult.rows[0].nombre_totem,
        changes: totemResult.rows[0]
      })

      res.status(201).json({ data: totemResult.rows[0] })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error creating totem:', error)
      res.status(400).json({ message: error.message || 'Error al crear tótem' })
    } finally {
      client.release()
    }
  })

  app.put('/totems/:id', upload.single('imagen'), async (req, res) => {
    try {
      const id = Number(req.params.id)
      const prev = await totemsRepo.findById(id)
      if (!prev) return res.status(404).json({ message: 'Not found' })
      
      const b = req.body || {}
      
      let imagenUrl = b.imagen
      if (req.file) {
        imagenUrl = await uploadToCloudinary(req.file.buffer, 'totems', 1600, 1200)
      }

      // Si se proporciona email o password, también actualizar usuario (si aplica)
      // Por simplicidad, aquí solo actualizamos datos del tótem, 
      // para actualizar credenciales se debería usar endpoints de usuario o expandir esto.

      const totem = await totemsRepo.update(id, {
        nombre_totem: b.nombre_totem,
        descripcion: b.descripcion,
        imagen: imagenUrl,
        cord_latitud: b.cord_latitud ? Number(b.cord_latitud) : undefined,
        cord_longitud: b.cord_longitud ? Number(b.cord_longitud) : undefined
      })
      
      // Registrar auditoría
      const user = getUserFromRequest(req)
      await logAudit({
        userId: user.userId,
        userEmail: user.email,
        action: 'modificar',
        entityType: 'totem',
        entityId: String(totem.id_totem),
        entityName: totem.nombre_totem,
        changes: {
          prev: prev,
          new: totem
        }
      })

      res.json({ data: totem })
    } catch (error) {
      console.error('Error updating totem:', error)
      res.status(400).json({ message: error.message || 'Error al actualizar tótem' })
    }
  })

  app.delete('/totems/:id', async (req, res) => {
    const client = await pool.connect()
    try {
      const id = Number(req.params.id)
      
      // Obtener el totem para saber cual es su usuario
      const totemCheck = await client.query('SELECT id_usuario FROM totems WHERE id_totem = $1', [id])
      if (totemCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Tótem no encontrado' })
      }

      const idUsuario = totemCheck.rows[0].id_usuario

      await client.query('BEGIN')
      
      // Eliminar el usuario (trigger CASCADE eliminará el tótem)
      if (idUsuario) {
        await client.query('DELETE FROM usuarios WHERE id_usuario = $1', [idUsuario])
      } else {
        // Fallback si no tiene usuario (legacy o error)
        await client.query('DELETE FROM totems WHERE id_totem = $1', [id])
      }
      
      await client.query('COMMIT')

      // Registrar auditoría
      const user = getUserFromRequest(req)
      await logAudit({
        userId: user.userId,
        userEmail: user.email,
        action: 'eliminar',
        entityType: 'totem',
        entityId: String(id),
        entityName: 'Tótem #' + id,
        changes: { deleted: true }
      })

      res.json({ message: 'Tótem y usuario asociado eliminados' })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error deleting totem:', error)
      res.status(500).json({ message: 'Error al eliminar tótem' })
    } finally {
      client.release()
    }
  })

  app.use(errorLogger)
  return app
}

export default createApp
