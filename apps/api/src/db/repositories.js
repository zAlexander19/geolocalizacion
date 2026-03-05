import pool from '../config/database.js'

// Buildings Repository
export const buildingsRepo = {
  async findAll({ limit, offset, search, estado } = {}) {
    let query = 'SELECT * FROM buildings'
    const where = []
    const params = []

    if (estado !== undefined) {
      where.push(`estado = $${params.length + 1}`)
      params.push(estado)
    }

    if (search) {
      where.push(`(nombre_edificio ILIKE $${params.length + 1} OR acronimo ILIKE $${params.length + 1})`)
      params.push(`%${search}%`)
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ')
    }

    query += ' ORDER BY id_edificio'

    if (limit) {
      query += ` LIMIT $${params.length + 1}`
      params.push(limit)
    }

    if (offset) {
      query += ` OFFSET $${params.length + 1}`
      params.push(offset)
    }

    const result = await pool.query(query, params)
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
    // Helper para evitar undefined
    const val = (v) => v === undefined ? null : v
    
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
      val(building.nombre_edificio),
      val(building.acronimo),
      val(building.descripcion),
      val(building.imagen),
      val(building.cord_latitud),
      val(building.cord_longitud),
      val(building.estado),
      val(building.disponibilidad),
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
  async findAll({ limit, offset, search, estado, id_edificio } = {}) {
    let query = 'SELECT * FROM floors'
    const where = []
    const params = []

    if (estado !== undefined) {
      where.push(`estado = $${params.length + 1}`)
      params.push(estado)
    }

    if (id_edificio) {
      where.push(`id_edificio = $${params.length + 1}`)
      params.push(id_edificio)
    }

    if (search) {
      where.push(`nombre_piso ILIKE $${params.length + 1}`)
      params.push(`%${search}%`)
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ')
    }

    query += ' ORDER BY id_piso'

    if (limit) {
      query += ` LIMIT $${params.length + 1}`
      params.push(limit)
    }
    if (offset) {
      query += ` OFFSET $${params.length + 1}`
      params.push(offset)
    }

    const result = await pool.query(query, params)
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
        nombre_piso = COALESCE($1, nombre_piso),
        numero_piso = COALESCE($2, numero_piso),
        imagen = COALESCE($3, imagen),
        estado = COALESCE($4, estado),
        disponibilidad = COALESCE($5, disponibilidad)
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
    const result = await pool.query(`
      UPDATE floors SET estado = $1
      WHERE id_piso = $2
      RETURNING *
    `, [estado, id])
    return result.rows[0]
  }
}

// Rooms Repository
export const roomsRepo = {
  async findAll({ limit, offset, search, estado = true } = {}) {
    let query = 'SELECT * FROM rooms'
    const where = []
    const params = []

    if (estado !== null && estado !== undefined) {
      where.push(`estado = $${params.length + 1}`)
      params.push(estado)
    }

    if (search) {
      where.push(`(nombre_sala ILIKE $${params.length + 1} OR acronimo ILIKE $${params.length + 1})`)
      params.push(`%${search}%`)
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ')
    }

    query += ' ORDER BY id_sala'

    if (limit) {
      query += ` LIMIT $${params.length + 1}`
      params.push(limit)
    }

    if (offset) {
      query += ` OFFSET $${params.length + 1}`
      params.push(offset)
    }

    const result = await pool.query(query, params)
    return result.rows
  },

  async findAllIncludingDeleted(options = {}) {
    // Override default estado=true
    return this.findAll({ ...options, estado: null })
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
    const result = await pool.query(
      'UPDATE rooms SET estado = $1 WHERE id_sala = $2 RETURNING *',
      [estado, id]
    )
    return result.rows[0]
  }
}

// Bathrooms Repository
export const bathroomsRepo = {
  async findAll({ limit, offset, search, estado = true } = {}) {
    let query = 'SELECT * FROM bathrooms'
    const where = []
    const params = []

    if (estado !== null && estado !== undefined) {
      where.push(`estado = $${params.length + 1}`)
      params.push(estado)
    }

    if (search) {
      where.push(`(nombre ILIKE $${params.length + 1} OR identificador ILIKE $${params.length + 1})`)
      params.push(`%${search}%`)
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ')
    }

    query += ' ORDER BY id_bano'

    if (limit) {
      query += ` LIMIT $${params.length + 1}`
      params.push(limit)
    }
    if (offset) {
      query += ` OFFSET $${params.length + 1}`
      params.push(offset)
    }

    const result = await pool.query(query, params)
    return result.rows
  },

  async findAllIncludingDeleted(options = {}) {
    return this.findAll({ ...options, estado: null })
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
    const result = await pool.query(
      'UPDATE bathrooms SET estado = $1 WHERE id_bano = $2 RETURNING *',
      [estado, id]
    )
    return result.rows[0]
  }
}

// Faculties Repository
export const facultiesRepo = {
  async findAll({ limit, offset, search, estado = true } = {}) {
    let query = 'SELECT * FROM faculties'
    const where = []
    const params = []

    if (estado !== null && estado !== undefined) {
      where.push(`estado = $${params.length + 1}`)
      params.push(estado)
    }

    if (search) {
      where.push(`(nombre_facultad ILIKE $${params.length + 1} OR codigo_facultad ILIKE $${params.length + 1})`)
      params.push(`%${search}%`)
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ')
    }

    query += ' ORDER BY nombre_facultad'

    if (limit) {
      query += ` LIMIT $${params.length + 1}`
      params.push(limit)
    }
    if (offset) {
      query += ` OFFSET $${params.length + 1}`
      params.push(offset)
    }

    const result = await pool.query(query, params)
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
        estado, disponibilidad
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      faculty.codigo_facultad,
      faculty.nombre_facultad,
      faculty.descripcion || '',
      faculty.logo || '',
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
        estado = COALESCE($4, estado),
        disponibilidad = COALESCE($5, disponibilidad)
      WHERE codigo_facultad = $6
      RETURNING *
    `, [
      faculty.nombre_facultad,
      faculty.descripcion,
      faculty.logo,
      faculty.estado,
      faculty.disponibilidad,
      codigo
    ])
    return result.rows[0]
  },

  async delete(codigo) {
    await pool.query('DELETE FROM faculties WHERE codigo_facultad = $1', [codigo])
  },

  async updateEstado(codigo, estado) {
    const result = await pool.query(
      'UPDATE faculties SET estado = $1 WHERE codigo_facultad = $2 RETURNING *',
      [estado, codigo]
    )
    return result.rows[0]
  },

  async findAllIncludingDeleted(options = {}) {
    return this.findAll({ ...options, estado: null })
  }
}

// Totems Repository
export const totemsRepo = {
  async findAll({ limit, offset, search } = {}) {
    let query = `
      SELECT t.*, u.email 
      FROM totems t
      LEFT JOIN usuarios u ON t.id_usuario = u.id_usuario
    `
    const where = []
    const params = []

    if (search) {
      where.push(`(t.nombre_totem ILIKE $${params.length + 1} OR u.email ILIKE $${params.length + 1})`)
      params.push(`%${search}%`)
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ')
    }

    query += ' ORDER BY t.id_totem'

    if (limit) {
      query += ` LIMIT $${params.length + 1}`
      params.push(limit)
    }

    if (offset) {
      query += ` OFFSET $${params.length + 1}`
      params.push(offset)
    }

    const result = await pool.query(query, params)
    return result.rows
  },

  async findById(id) {
    const result = await pool.query(`
      SELECT t.*, u.email 
      FROM totems t
      LEFT JOIN usuarios u ON t.id_usuario = u.id_usuario
      WHERE t.id_totem = $1
    `, [id])
    return result.rows[0]
  },

  async create(totem) {
    const result = await pool.query(`
      INSERT INTO totems (
        nombre_totem, descripcion, imagen,
        cord_latitud, cord_longitud, id_usuario
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      totem.nombre_totem,
      totem.descripcion || '',
      totem.imagen || '',
      totem.cord_latitud || 0,
      totem.cord_longitud || 0,
      totem.id_usuario || null
    ])
    return result.rows[0]
  },

  async update(id, totem) {
    const result = await pool.query(`
      UPDATE totems SET
        nombre_totem = COALESCE($1, nombre_totem),
        descripcion = COALESCE($2, descripcion),
        imagen = COALESCE($3, imagen),
        cord_latitud = COALESCE($4, cord_latitud),
        cord_longitud = COALESCE($5, cord_longitud)
      WHERE id_totem = $6
      RETURNING *
    `, [
      totem.nombre_totem,
      totem.descripcion,
      totem.imagen,
      totem.cord_latitud,
      totem.cord_longitud,
      id
    ])
    return result.rows[0]
  },

  async delete(id) {
    await pool.query('DELETE FROM totems WHERE id_totem = $1', [id])
  }
}
