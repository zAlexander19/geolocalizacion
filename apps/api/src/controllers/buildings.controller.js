import { buildingCreateSchema, buildingUpdateSchema } from '../schemas/buildings.schemas.js'
import { createBuilding, searchBuildings, getBuilding, updateBuilding, deleteBuilding } from '../services/buildings.service.js'

export function create(req, res, next) {
  try {
    let data = req.body
    // Si se subió imagen, guardar la URL
    if (req.file) {
      // URL relativa para servir la imagen
      data.imagen = `/uploads/${req.file.filename}`
    } else {
      // Si no hay archivo, eliminar el campo imagen vacío
      delete data.imagen
    }
    data = buildingCreateSchema.parse(data)
    const { data: created, error } = createBuilding(data)
    if (error === 'DUPLICATE_ACRONYM') return res.status(400).json({ data: null, error: 'VALIDATION_ERROR', details: [{ message: 'Duplicate acronym' }] })
    return res.status(201).json({ data: created, error: null })
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ data: null, error: 'VALIDATION_ERROR', details: err.issues })
    next(err)
  }
}

export function list(req, res) {
  const { data } = searchBuildings(req.query.search)
  return res.json({ data, error: null })
}

export function getOne(req, res) {
  const { data, error } = getBuilding(req.params.id)
  if (error === 'NOT_FOUND') return res.status(404).json({ data: null, error: 'NOT_FOUND' })
  return res.json({ data, error: null })
}

export function update(req, res, next) {
  try {
    const patch = buildingUpdateSchema.parse(req.body)
    const { data, error } = updateBuilding(req.params.id, patch)
    if (error === 'NOT_FOUND') return res.status(404).json({ data: null, error: 'NOT_FOUND' })
    if (error === 'DUPLICATE_ACRONYM') return res.status(400).json({ data: null, error: 'VALIDATION_ERROR', details: [{ message: 'Duplicate acronym' }] })
    return res.json({ data, error: null })
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ data: null, error: 'VALIDATION_ERROR', details: err.issues })
    next(err)
  }
}

export function remove(req, res) {
  const { data, error } = deleteBuilding(req.params.id)
  if (error === 'NOT_FOUND') return res.status(404).json({ data: null, error: 'NOT_FOUND' })
  return res.json({ data, error: null })
}
