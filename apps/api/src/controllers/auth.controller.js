import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { pool } from '../config/database.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = '24h'

/**
 * Login de usuario
 */
export const login = async (req, res) => {
  const client = await pool.connect()
  
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email y contraseña son requeridos' 
      })
    }

    // Buscar usuario por email
    const result = await client.query(
      'SELECT * FROM usuarios WHERE email = $1 AND estado = true',
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales inválidas' 
      })
    }

    const usuario = result.rows[0]

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, usuario.password_hash)

    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales inválidas' 
      })
    }

    // Actualizar último acceso
    await client.query(
      'UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id_usuario = $1',
      [usuario.id_usuario]
    )

    // Generar token JWT
    const token = jwt.sign(
      { 
        id: usuario.id_usuario,
        email: usuario.email,
        rol: usuario.rol,
        nombre: usuario.nombre
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    res.json({
      success: true,
      data: {
        token,
        usuario: {
          id: usuario.id_usuario,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol
        }
      }
    })

  } catch (error) {
    console.error('Error en login:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al iniciar sesión',
      error: error.message 
    })
  } finally {
    client.release()
  }
}

/**
 * Verificar token y obtener usuario actual
 */
export const getCurrentUser = async (req, res) => {
  try {
    // El middleware ya validó el token y agregó req.user
    const usuario = req.user

    res.json({
      success: true,
      data: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    })

  } catch (error) {
    console.error('Error al obtener usuario:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener usuario',
      error: error.message 
    })
  }
}

/**
 * Cambiar contraseña propia
 */
export const changePassword = async (req, res) => {
  const client = await pool.connect()
  
  try {
    const { passwordActual, passwordNueva } = req.body
    const userId = req.user.id

    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ 
        success: false, 
        message: 'Contraseña actual y nueva son requeridas' 
      })
    }

    if (passwordNueva.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'La contraseña debe tener al menos 6 caracteres' 
      })
    }

    // Obtener usuario
    const result = await client.query(
      'SELECT * FROM usuarios WHERE id_usuario = $1',
      [userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      })
    }

    const usuario = result.rows[0]

    // Verificar contraseña actual
    const passwordMatch = await bcrypt.compare(passwordActual, usuario.password_hash)

    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Contraseña actual incorrecta' 
      })
    }

    // Generar hash de nueva contraseña
    const newPasswordHash = await bcrypt.hash(passwordNueva, 10)

    // Actualizar contraseña
    await client.query(
      'UPDATE usuarios SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id_usuario = $2',
      [newPasswordHash, userId]
    )

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    })

  } catch (error) {
    console.error('Error al cambiar contraseña:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al cambiar contraseña',
      error: error.message 
    })
  } finally {
    client.release()
  }
}

/**
 * Cambiar contraseña de otro usuario (solo admin primario)
 */
export const resetUserPassword = async (req, res) => {
  const client = await pool.connect()
  
  try {
    const { userId } = req.params
    const { passwordNueva } = req.body
    const adminRole = req.user.rol

    // Solo admin primario puede cambiar contraseñas de otros usuarios
    if (adminRole !== 'admin_primario') {
      return res.status(403).json({ 
        success: false, 
        message: 'Solo los administradores primarios pueden cambiar contraseñas de otros usuarios' 
      })
    }

    if (!passwordNueva) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nueva contraseña es requerida' 
      })
    }

    if (passwordNueva.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'La contraseña debe tener al menos 6 caracteres' 
      })
    }

    // Verificar que el usuario existe
    const result = await client.query(
      'SELECT * FROM usuarios WHERE id_usuario = $1',
      [userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      })
    }

    // Generar hash de nueva contraseña
    const newPasswordHash = await bcrypt.hash(passwordNueva, 10)

    // Actualizar contraseña
    await client.query(
      'UPDATE usuarios SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id_usuario = $2',
      [newPasswordHash, userId]
    )

    res.json({
      success: true,
      message: 'Contraseña del usuario actualizada exitosamente'
    })

  } catch (error) {
    console.error('Error al resetear contraseña:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al resetear contraseña',
      error: error.message 
    })
  } finally {
    client.release()
  }
}

/**
 * Obtener todos los usuarios (solo admin primario)
 */
export const getAllUsers = async (req, res) => {
  const client = await pool.connect()
  
  try {
    const adminRole = req.user.rol

    // Solo admin primario puede ver todos los usuarios
    if (adminRole !== 'admin_primario') {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para ver los usuarios' 
      })
    }

    const result = await client.query(
      'SELECT id_usuario, nombre, email, rol, estado, ultimo_acceso, created_at FROM usuarios ORDER BY created_at DESC'
    )

    res.json({
      success: true,
      data: result.rows
    })

  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener usuarios',
      error: error.message 
    })
  } finally {
    client.release()
  }
}

/**
 * Crear nuevo usuario (solo admin primario)
 */
export const createUser = async (req, res) => {
  const client = await pool.connect()
  
  try {
    const { nombre, email, password, rol } = req.body
    const adminRole = req.user.rol

    // Solo admin primario puede crear usuarios
    if (adminRole !== 'admin_primario') {
      return res.status(403).json({ 
        success: false, 
        message: 'Solo los administradores primarios pueden crear usuarios' 
      })
    }

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ 
        success: false, 
        message: 'Todos los campos son requeridos' 
      })
    }

    if (!['admin_primario', 'admin_secundario'].includes(rol)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rol inválido' 
      })
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'La contraseña debe tener al menos 6 caracteres' 
      })
    }

    // Verificar que el email no existe
    const existingUser = await client.query(
      'SELECT id_usuario FROM usuarios WHERE email = $1',
      [email]
    )

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'El email ya está registrado' 
      })
    }

    // Generar hash de contraseña
    const passwordHash = await bcrypt.hash(password, 10)

    // Crear usuario
    const result = await client.query(
      'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1, $2, $3, $4) RETURNING id_usuario, nombre, email, rol, estado, created_at',
      [nombre, email, passwordHash, rol]
    )

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: result.rows[0]
    })

  } catch (error) {
    console.error('Error al crear usuario:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al crear usuario',
      error: error.message 
    })
  } finally {
    client.release()
  }
}

/**
 * Actualizar estado de usuario (solo admin primario)
 */
export const updateUserStatus = async (req, res) => {
  const client = await pool.connect()
  
  try {
    const { userId } = req.params
    const { estado } = req.body
    const adminRole = req.user.rol

    // Solo admin primario puede cambiar estado de usuarios
    if (adminRole !== 'admin_primario') {
      return res.status(403).json({ 
        success: false, 
        message: 'Solo los administradores primarios pueden cambiar el estado de usuarios' 
      })
    }

    if (typeof estado !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        message: 'Estado debe ser true o false' 
      })
    }

    // Actualizar estado
    const result = await client.query(
      'UPDATE usuarios SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id_usuario = $2 RETURNING id_usuario, nombre, email, rol, estado',
      [estado, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      })
    }

    res.json({
      success: true,
      message: 'Estado del usuario actualizado exitosamente',
      data: result.rows[0]
    })

  } catch (error) {
    console.error('Error al actualizar estado:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar estado',
      error: error.message 
    })
  } finally {
    client.release()
  }
}

/**
 * Actualizar datos de usuario (nombre, email) - solo admin primario
 */
export const updateUser = async (req, res) => {
  const client = await pool.connect()
  
  try {
    const { userId } = req.params
    const { nombre, email } = req.body
    const adminRole = req.user.rol

    // Solo admin primario puede actualizar usuarios
    if (adminRole !== 'admin_primario') {
      return res.status(403).json({ 
        success: false, 
        message: 'Solo los administradores primarios pueden actualizar usuarios' 
      })
    }

    if (!nombre && !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Debe proporcionar al menos un campo para actualizar' 
      })
    }

    // Construir query dinámicamente
    const updates = []
    const values = []
    let paramCount = 1

    if (nombre) {
      updates.push(`nombre = $${paramCount}`)
      values.push(nombre)
      paramCount++
    }

    if (email) {
      // Verificar que el email no esté en uso por otro usuario
      const emailCheck = await client.query(
        'SELECT id_usuario FROM usuarios WHERE email = $1 AND id_usuario != $2',
        [email, userId]
      )
      
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'El email ya está en uso por otro usuario' 
        })
      }

      updates.push(`email = $${paramCount}`)
      values.push(email)
      paramCount++
    }

    values.push(userId)

    const query = `
      UPDATE usuarios 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id_usuario = $${paramCount}
      RETURNING id_usuario, nombre, email, rol, estado
    `

    const result = await client.query(query, values)

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      })
    }

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: result.rows[0]
    })

  } catch (error) {
    console.error('Error al actualizar usuario:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar usuario',
      error: error.message 
    })
  } finally {
    client.release()
  }
}
