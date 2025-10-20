import { db, nextId, saveDB } from '../db/memory.js'


export function createBuilding(data) {
  // único por acronimo
  const exists = db.buildings.find((b) => b.acronimo === data.acronimo)
  if (exists) return { error: 'DUPLICATE_ACRONYM' }
  const building = {
    id_edificio: nextId(),
    nombre_edificio: data.nombre_edificio,
    acronimo: data.acronimo,
    imagen: data.imagen,
    cord_latitud: data.cord_latitud,
    cord_longitud: data.cord_longitud,
    estado: data.estado,
    disponibilidad: data.disponibilidad
  }
  db.buildings.push(building)
  saveDB()
  return { data: building }
}

export function searchBuildings(search) {
  const q = (search || '').toLowerCase()
  const list = db.buildings.filter((b) =>
    !q || b.acronimo.toLowerCase().includes(q) || b.nombre_edificio.toLowerCase().includes(q)
  )
  return { data: list }
}

export function getBuilding(id_edificio) {
  const building = db.buildings.find((b) => b.id_edificio === Number(id_edificio))
  if (!building) return { error: 'NOT_FOUND' }
  return { data: building }
}

export function updateBuilding(id_edificio, patch) {
  const idx = db.buildings.findIndex((b) => b.id_edificio === Number(id_edificio))
  if (idx === -1) return { error: 'NOT_FOUND' }
  if (patch.acronimo) {
    const dup = db.buildings.find((b) => b.acronimo === patch.acronimo && b.id_edificio !== Number(id_edificio))
    if (dup) return { error: 'DUPLICATE_ACRONYM' }
  }
  db.buildings[idx] = { ...db.buildings[idx], ...patch }
  saveDB()
  return { data: db.buildings[idx] }
}

export function deleteBuilding(id_edificio) {
  const idx = db.buildings.findIndex((b) => b.id_edificio === Number(id_edificio))
  if (idx === -1) return { error: 'NOT_FOUND' }
  // eliminar en cascada pisos y salas
  const removed = db.buildings.splice(idx, 1)[0]
  db.floors = db.floors.filter((f) => f.id_edificio !== Number(id_edificio))
  db.rooms = db.rooms.filter((r) => {
    const floor = db.floors.find((f) => f.id_piso === r.id_piso)
    return floor && floor.id_edificio !== Number(id_edificio)
  })
  saveDB()
  return { data: removed }
}
