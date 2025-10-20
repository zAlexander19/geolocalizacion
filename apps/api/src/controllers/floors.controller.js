import { floorCreateSchema, floorUpdateSchema } from '../schemas/floors.schemas.js'
import { createFloor, getFloorsByBuilding, updateFloor, deleteFloor } from '../services/floors.service.js'

export function create(req, res, next) {
  try {
    let data = req.body
    // Si se subió imagen, guardar la URL
    if (req.file) {
      data.imagen = `/uploads/${req.file.filename}`
    } else {
      // Si no hay archivo, eliminar el campo imagen vacío
      delete data.imagen
    }
    data = floorCreateSchema.parse(data)
    const { data: created, error } = createFloor(data)
    if (error === 'DUPLICATE_FLOOR') return res.status(400).json({ data: null, error: 'VALIDATION_ERROR', details: [{ message: 'Duplicate floor' }] })
    return res.status(201).json({ data: created, error: null })
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ data: null, error: 'VALIDATION_ERROR', details: err.issues })
    next(err)
  }
}

export function listByBuilding(req, res) {
  const { data } = getFloorsByBuilding(req.params.id)
  return res.json({ data, error: null })
}

export function update(req, res, next) {
  try {
    const patch = floorUpdateSchema.parse(req.body)
    const { data, error } = updateFloor(req.params.id, patch)
    if (error === 'NOT_FOUND') return res.status(404).json({ data: null, error: 'NOT_FOUND' })
    if (error === 'DUPLICATE_FLOOR') return res.status(400).json({ data: null, error: 'VALIDATION_ERROR', details: [{ message: 'Duplicate floor' }] })
    return res.json({ data, error: null })
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ data: null, error: 'VALIDATION_ERROR', details: err.issues })
    next(err)
  }
}

export function remove(req, res) {
  const { data, error } = deleteFloor(req.params.id)
  if (error === 'NOT_FOUND') return res.status(404).json({ data: null, error: 'NOT_FOUND' })
  return res.json({ data, error: null })
}
