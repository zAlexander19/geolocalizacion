import { db, nextId, saveDB } from '../db/memory.js'


export function createFloor(data) {
  const exists = db.floors.find((f) => f.id_edificio === data.id_edificio && f.nombre_piso === data.nombre_piso)
  if (exists) return { error: 'DUPLICATE_FLOOR' }
  const floor = {
    id_piso: nextId(),
    id_edificio: data.id_edificio,
    nombre_piso: data.nombre_piso,
    imagen: data.imagen,
    codigo_qr: data.codigo_qr,
    estado: data.estado,
    disponibilidad: data.disponibilidad
  }
  db.floors.push(floor)
  saveDB()
  return { data: floor }
}

export function getFloorsByBuilding(id_edificio) {
  const list = db.floors.filter((f) => f.id_edificio === Number(id_edificio))
  return { data: list }
}

export function updateFloor(id_piso, patch) {
  const idx = db.floors.findIndex((f) => f.id_piso === Number(id_piso))
  if (idx === -1) return { error: 'NOT_FOUND' }
  if (patch.nombre_piso) {
    const dup = db.floors.find(
      (f) => f.id_edificio === (patch.id_edificio || db.floors[idx].id_edificio) && f.nombre_piso === patch.nombre_piso && f.id_piso !== Number(id_piso)
    )
    if (dup) return { error: 'DUPLICATE_FLOOR' }
  }
  db.floors[idx] = { ...db.floors[idx], ...patch }
  saveDB()
  return { data: db.floors[idx] }
}

export function deleteFloor(id_piso) {
  const idx = db.floors.findIndex((f) => f.id_piso === Number(id_piso))
  if (idx === -1) return { error: 'NOT_FOUND' }
  const removed = db.floors.splice(idx, 1)[0]
  db.rooms = db.rooms.filter((r) => r.id_piso !== Number(id_piso))
  saveDB()
  return { data: removed }
}
