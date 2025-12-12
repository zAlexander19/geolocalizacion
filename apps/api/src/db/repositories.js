import pool from '../config/database.js'

// Buildings Repository
export const buildingsRepo = {
  async findAll() {
    const result = await pool.query('SELECT * FROM buildings ORDER BY id_edificio')
    return result.rows
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM buildings WHERE id_edificio = $1', [id])
    return result.rows[0]
  },

  async create(building) {
    const result = await pool.query(`
      INSERT INTO buildings (
        nombre_edificio, acronimo, descripcion, imagen,
        cord_latitud, cord_longitud, estado, disponibilidad
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      building.nombre_edificio,
      building.acronimo || '',
      building.descripcion || '',
      building.imagen || '',
      building.cord_latitud || 0,
      building.cord_longitud || 0,
      building.estado !== false,
      building.disponibilidad || 'Disponible'
    ])
    return result.rows[0]
  },

  async update(id, building) {
    const result = await pool.query(`
      UPDATE buildings SET
        nombre_edificio = COALESCE($1, nombre_edificio),
        acronimo = COALESCE($2, acronimo),
        descripcion = COALESCE($3, descripcion),
        imagen = COALESCE($4, imagen),
        cord_latitud = COALESCE($5, cord_latitud),
        cord_longitud = COALESCE($6, cord_longitud),
        estado = COALESCE($7, estado),
        disponibilidad = COALESCE($8, disponibilidad)
      WHERE id_edificio = $9
      RETURNING *
    `, [
      building.nombre_edificio,
      building.acronimo,
      building.descripcion,
      building.imagen,
      building.cord_latitud,
      building.cord_longitud,
      building.estado,
      building.disponibilidad,
      id
    ])
    return result.rows[0]
  },

  async delete(id) {
    await pool.query('DELETE FROM buildings WHERE id_edificio = $1', [id])
  }
}

// Floors Repository
export const floorsRepo = {
  async findAll() {
    const result = await pool.query('SELECT * FROM floors ORDER BY id_piso')
    return result.rows
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM floors WHERE id_piso = $1', [id])
    return result.rows[0]
  },

  async findByBuilding(buildingId) {
    const result = await pool.query(
      'SELECT * FROM floors WHERE id_edificio = $1 AND estado = true ORDER BY numero_piso, nombre_piso',
      [buildingId]
    )
    return result.rows
  },

  async create(floor) {
    const result = await pool.query(`
      INSERT INTO floors (
        id_edificio, nombre_piso, numero_piso, imagen,
        estado, disponibilidad
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      floor.id_edificio,
      floor.nombre_piso,
      floor.numero_piso || null,
      floor.imagen || '',
      floor.estado !== false,
      floor.disponibilidad || 'Disponible'
    ])
    return result.rows[0]
  },

  async update(id, floor) {
    const result = await pool.query(`
      UPDATE floors SET
        nombre_piso = $1,
        numero_piso = $2,
        imagen = $3,
        estado = $4,
        disponibilidad = $5
      WHERE id_piso = $6
      RETURNING *
    `, [
      floor.nombre_piso,
      floor.numero_piso,
      floor.imagen,
      floor.estado,
      floor.disponibilidad,
      id
    ])
    return result.rows[0]
  },

  async delete(id) {
    await pool.query('DELETE FROM floors WHERE id_piso = $1', [id])
  },

  async updateEstado(id, estado) {
    console.log(`📝 updateEstado - ID: ${id}, Estado: ${estado}`)
    const result = await pool.query(`
      UPDATE floors SET estado = $1
      WHERE id_piso = $2
      RETURNING *
    `, [estado, id])
    console.log(`📝 Resultado update:`, result.rows[0])
    return result.rows[0]
  }
}

// Rooms Repository
export const roomsRepo = {
  async findAll() {
    const result = await pool.query('SELECT * FROM rooms WHERE estado = true ORDER BY id_sala')
    return result.rows
  },

  async findAllIncludingDeleted() {
    const result = await pool.query('SELECT * FROM rooms ORDER BY id_sala')
    return result.rows
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM rooms WHERE id_sala = $1', [id])
    return result.rows[0]
  },

  async findByFloor(floorId) {
    const result = await pool.query(
      'SELECT * FROM rooms WHERE id_piso = $1 ORDER BY nombre_sala',
      [floorId]
    )
    return result.rows
  },

  async create(room) {
    const result = await pool.query(`
      INSERT INTO rooms (
        id_piso, nombre_sala, acronimo, descripcion, imagen,
        capacidad, tipo_sala, cord_latitud, cord_longitud, estado, disponibilidad
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      room.id_piso,
      room.nombre_sala,
      room.acronimo || '',
      room.descripcion || '',
      room.imagen || '',
      room.capacidad || 0,
      room.tipo_sala || '',
      room.cord_latitud || 0,
      room.cord_longitud || 0,
      room.estado !== false,
      room.disponibilidad || 'Disponible'
    ])
    return result.rows[0]
  },

  async update(id, room) {
    const result = await pool.query(`
      UPDATE rooms SET
        id_piso = COALESCE($1, id_piso),
        nombre_sala = COALESCE($2, nombre_sala),
        acronimo = COALESCE($3, acronimo),
        descripcion = COALESCE($4, descripcion),
        imagen = COALESCE($5, imagen),
        capacidad = COALESCE($6, capacidad),
        tipo_sala = COALESCE($7, tipo_sala),
        cord_latitud = COALESCE($8, cord_latitud),
        cord_longitud = COALESCE($9, cord_longitud),
        estado = COALESCE($10, estado),
        disponibilidad = COALESCE($11, disponibilidad)
      WHERE id_sala = $12
      RETURNING *
    `, [
      room.id_piso,
      room.nombre_sala,
      room.acronimo,
      room.descripcion,
      room.imagen,
      room.capacidad,
      room.tipo_sala,
      room.cord_latitud,
      room.cord_longitud,
      room.estado,
      room.disponibilidad,
      id
    ])
    return result.rows[0]
  },

  async delete(id) {
    await pool.query('DELETE FROM rooms WHERE id_sala = $1', [id])
  },

  async updateEstado(id, estado) {
    console.log('roomsRepo.updateEstado - actualizando sala:', { id, estado })
    const result = await pool.query(
      'UPDATE rooms SET estado = $1 WHERE id_sala = $2 RETURNING *',
      [estado, id]
    )
    console.log('roomsRepo.updateEstado - resultado:', result.rows[0])
    return result.rows[0]
  }
}

// Bathrooms Repository
export const bathroomsRepo = {
  async findAll() {
    const result = await pool.query('SELECT * FROM bathrooms WHERE estado = true ORDER BY id_bano')
    return result.rows
  },

  async findAllIncludingDeleted() {
    const result = await pool.query('SELECT * FROM bathrooms ORDER BY id_bano')
    return result.rows
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM bathrooms WHERE id_bano = $1', [id])
    return result.rows[0]
  },

  async create(bathroom) {
    const result = await pool.query(`
      INSERT INTO bathrooms (
        id_edificio, id_piso, identificador, nombre, descripcion,
        capacidad, imagen, tipo, acceso_discapacidad, cord_latitud, cord_longitud,
        estado, disponibilidad
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      bathroom.id_edificio,
      bathroom.id_piso,
      bathroom.identificador,
      bathroom.nombre || '',
      bathroom.descripcion || '',
      bathroom.capacidad || 0,
      bathroom.imagen || '',
      bathroom.tipo || 'mixto',
      bathroom.acceso_discapacidad || false,
      bathroom.cord_latitud || 0,
      bathroom.cord_longitud || 0,
      bathroom.estado !== false,
      bathroom.disponibilidad || 'Disponible'
    ])
    return result.rows[0]
  },

  async update(id, bathroom) {
    const result = await pool.query(`
      UPDATE bathrooms SET
        nombre = COALESCE($1, nombre),
        descripcion = COALESCE($2, descripcion),
        capacidad = COALESCE($3, capacidad),
        imagen = COALESCE($4, imagen),
        tipo = COALESCE($5, tipo),
        acceso_discapacidad = COALESCE($6, acceso_discapacidad),
        cord_latitud = COALESCE($7, cord_latitud),
        cord_longitud = COALESCE($8, cord_longitud),
        estado = COALESCE($9, estado),
        disponibilidad = COALESCE($10, disponibilidad)
      WHERE id_bano = $11
      RETURNING *
    `, [
      bathroom.nombre,
      bathroom.descripcion,
      bathroom.capacidad,
      bathroom.imagen,
      bathroom.tipo,
      bathroom.acceso_discapacidad,
      bathroom.cord_latitud,
      bathroom.cord_longitud,
      bathroom.estado,
      bathroom.disponibilidad,
      id
    ])
    return result.rows[0]
  },

  async delete(id) {
    await pool.query('DELETE FROM bathrooms WHERE id_bano = $1', [id])
  },

  async updateEstado(id, estado) {
    console.log('bathroomsRepo.updateEstado - actualizando baño:', { id, estado })
    const result = await pool.query(
      'UPDATE bathrooms SET estado = $1 WHERE id_bano = $2 RETURNING *',
      [estado, id]
    )
    console.log('bathroomsRepo.updateEstado - resultado:', result.rows[0])
    return result.rows[0]
  }
}

// Faculties Repository
export const facultiesRepo = {
  async findAll() {
    const result = await pool.query('SELECT * FROM faculties ORDER BY nombre_facultad')
    return result.rows
  },

  async findById(codigo) {
    const result = await pool.query('SELECT * FROM faculties WHERE codigo_facultad = $1', [codigo])
    return result.rows[0]
  },

  async create(faculty) {
    const result = await pool.query(`
      INSERT INTO faculties (
        codigo_facultad, nombre_facultad, descripcion, logo,
        id_edificio, estado, disponibilidad
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      faculty.codigo_facultad,
      faculty.nombre_facultad,
      faculty.descripcion || '',
      faculty.logo || '',
      faculty.id_edificio || null,
      faculty.estado !== false,
      faculty.disponibilidad || 'Disponible'
    ])
    return result.rows[0]
  },

  async update(codigo, faculty) {
    const result = await pool.query(`
      UPDATE faculties SET
        nombre_facultad = COALESCE($1, nombre_facultad),
        descripcion = COALESCE($2, descripcion),
        logo = COALESCE($3, logo),
        id_edificio = COALESCE($4, id_edificio),
        estado = COALESCE($5, estado),
        disponibilidad = COALESCE($6, disponibilidad)
      WHERE codigo_facultad = $7
      RETURNING *
    `, [
      faculty.nombre_facultad,
      faculty.descripcion,
      faculty.logo,
      faculty.id_edificio,
      faculty.estado,
      faculty.disponibilidad,
      codigo
    ])
    return result.rows[0]
  },

  async delete(codigo) {
    await pool.query('DELETE FROM faculties WHERE codigo_facultad = $1', [codigo])
  }
}
