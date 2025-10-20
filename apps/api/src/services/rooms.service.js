import { db, nextId, saveDB } from '../db/memory.js'


export function createRoom(data) {
  const exists = db.rooms.find(
    (r) => r.id_piso === data.id_piso && r.nombre_sala === data.nombre_sala
  )
  if (exists) return { error: 'DUPLICATE_ROOM' }
  const room = {
    id_sala: nextId(),
    id_piso: data.id_piso,
    nombre_sala: data.nombre_sala,
    imagen: data.imagen,
    capacidad: data.capacidad,
    tipo_sala: data.tipo_sala,
    cord_latitud: data.cord_latitud,
    cord_longitud: data.cord_longitud,
    estado: data.estado,
    disponibilidad: data.disponibilidad
  }
  db.rooms.push(room)
  saveDB()
  return { data: room }
}

export function searchRooms({ id_piso, search }) {
  const q = (search || '').toLowerCase()
  const list = db.rooms.filter((r) => {
    if (id_piso && r.id_piso !== Number(id_piso)) return false
    if (!q) return true
    return r.nombre_sala.toLowerCase().includes(q)
  })
  return { data: list }
}

export function getRoom(id_sala) {
  const room = db.rooms.find((r) => r.id_sala === Number(id_sala))
  if (!room) return { error: 'NOT_FOUND' }
  return { data: room }
}

export function updateRoom(id_sala, patch) {
  const idx = db.rooms.findIndex((r) => r.id_sala === Number(id_sala))
  if (idx === -1) return { error: 'NOT_FOUND' }
  const target = db.rooms[idx]
  const nombre_sala = patch.nombre_sala ?? target.nombre_sala
  const id_piso = patch.id_piso ?? target.id_piso
  const dup = db.rooms.find(
    (r) => r.id_sala !== Number(id_sala) && r.id_piso === id_piso && r.nombre_sala === nombre_sala
  )
  if (dup) return { error: 'DUPLICATE_ROOM' }
  db.rooms[idx] = { ...target, ...patch }
  saveDB()
  return { data: db.rooms[idx] }
}

export function deleteRoom(id_sala) {
  const idx = db.rooms.findIndex((r) => r.id_sala === Number(id_sala))
  if (idx === -1) return { error: 'NOT_FOUND' }
  const removed = db.rooms.splice(idx, 1)[0]
  saveDB()
  return { data: removed }
}
