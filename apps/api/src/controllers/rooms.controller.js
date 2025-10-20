import { roomCreateSchema, roomUpdateSchema } from '../schemas/rooms.schemas.js'
import { createRoom, searchRooms, getRoom, updateRoom, deleteRoom } from '../services/rooms.service.js'

export function create(req, res, next) {
  try {
    let data = req.body
    // Si se subió imagen, guardar la URL relativa en el campo imagen
    if (req.file) {
      data.imagen = `/uploads/${req.file.filename}`
    } else {
      // Si no hay archivo, remover campo vacío para que pase el esquema
      if (!data.imagen) delete data.imagen
    }
    data = roomCreateSchema.parse(data)
    const { data: created, error } = createRoom(data)
    if (error === 'DUPLICATE_ROOM') return res.status(400).json({ data: null, error: 'VALIDATION_ERROR', details: [{ message: 'Duplicate room' }] })
    return res.status(201).json({ data: created, error: null })
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ data: null, error: 'VALIDATION_ERROR', details: err.issues })
    next(err)
  }
}

export function list(req, res) {
  const { data } = searchRooms({ id_piso: req.query.id_piso, search: req.query.search })
  return res.json({ data, error: null })
}

export function getOne(req, res) {
  const { data, error } = getRoom(req.params.id)
  if (error === 'NOT_FOUND') return res.status(404).json({ data: null, error: 'NOT_FOUND' })
  return res.json({ data, error: null })
}

export function update(req, res, next) {
  try {
    const patch = roomUpdateSchema.parse(req.body)
    const { data, error } = updateRoom(req.params.id, patch)
    if (error === 'NOT_FOUND') return res.status(404).json({ data: null, error: 'NOT_FOUND' })
    if (error === 'DUPLICATE_ROOM') return res.status(400).json({ data: null, error: 'VALIDATION_ERROR', details: [{ message: 'Duplicate room' }] })
    return res.json({ data, error: null })
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ data: null, error: 'VALIDATION_ERROR', details: err.issues })
    next(err)
  }
}

export function remove(req, res) {
  const { data, error } = deleteRoom(req.params.id)
  if (error === 'NOT_FOUND') return res.status(404).json({ data: null, error: 'NOT_FOUND' })
  return res.json({ data, error: null })
}
