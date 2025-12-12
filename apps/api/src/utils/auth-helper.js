/**
 * Extrae el email del usuario desde el header de autorización
 * Si no hay token o no se puede extraer, retorna 'sistema'
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
