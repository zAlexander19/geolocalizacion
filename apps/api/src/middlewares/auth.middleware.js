import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

/**
 * Middleware para verificar token JWT
 */
export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token no proporcionado' 
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ 
          success: false, 
          message: 'Token inválido o expirado' 
        })
      }

      // Agregar información del usuario al request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        rol: decoded.rol,
        nombre: decoded.nombre
      }

      next()
    })

  } catch (error) {
    console.error('Error en verifyToken:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error al verificar token',
      error: error.message 
    })
  }
}

/**
 * Middleware para requerir rol de admin primario
 */
export const requireAdminPrimario = (req, res, next) => {
  if (req.user.rol !== 'admin_primario') {
    return res.status(403).json({ 
      success: false, 
      message: 'Acceso denegado. Se requiere rol de administrador primario' 
    })
  }
  next()
}

/**
 * Middleware opcional para agregar info del usuario si existe token
 * No falla si no hay token
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next()
    }

    const token = authHeader.substring(7)

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err) {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          rol: decoded.rol,
          nombre: decoded.nombre
        }
      }
      next()
    })

  } catch (error) {
    // Si hay error, simplemente continuamos sin usuario
    next()
  }
}
