/**
 * Extrae el email del usuario desde el header de autorización
 * Si no hay token o no se puede extraer, retorna 'sistema'
 * @deprecated Usar getUserFromRequest en su lugar
 */
export function getUserEmailFromRequest(req) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No se encontró header de autorización')
      return 'sistema'
    }

    const token = authHeader.split(' ')[1]
    // Decodificar el payload del JWT (sin verificar, solo para extraer datos)
    const base64Payload = token.split('.')[1]
    const decodedPayload = Buffer.from(base64Payload, 'base64').toString('utf-8')
    const payload = JSON.parse(decodedPayload)
    
    console.log('Token decodificado:', payload)
    return payload.email || payload.sub || payload.userId || 'sistema'
  } catch (error) {
    console.error('Error al decodificar token:', error.message)
    return 'sistema'
  }
}

/**
 * Obtiene los datos del usuario autenticado desde req.user
 * El middleware de autenticación debe setear req.user con los datos del JWT
 * @param {Object} req - Request de Express
 * @returns {Object} { userId: number|null, email: string|null }
 */
export function getUserFromRequest(req) {
  if (req.user) {
    return {
      userId: req.user.id || null,
      email: req.user.email || null
    }
  }
  
  // Fallback: intentar decodificar del token directamente
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { userId: null, email: null }
    }

    const token = authHeader.split(' ')[1]
    const base64Payload = token.split('.')[1]
    const decodedPayload = Buffer.from(base64Payload, 'base64').toString('utf-8')
    const payload = JSON.parse(decodedPayload)
    
    return {
      userId: payload.id || null,
      email: payload.email || null
    }
  } catch (error) {
    console.error('Error al obtener usuario del token:', error.message)
    return { userId: null, email: null }
  }
}
