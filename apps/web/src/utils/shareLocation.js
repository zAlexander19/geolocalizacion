/**
 * Utilidades para generar y procesar URLs de compartir ubicación
 */

const BASE_URL = window.location.origin

/**
 * Genera una URL amigable para compartir una ubicación
 * @param {Object} params - Parámetros de la ubicación
 * @param {number} params.latitude - Latitud de la ubicación
 * @param {number} params.longitude - Longitud de la ubicación
 * @param {string} [params.type] - Tipo de ubicación: 'building', 'room', 'bathroom', 'faculty'
 * @param {number} [params.id] - ID del elemento (id_edificio, id_sala, etc.)
 * @param {string} [params.name] - Nombre del elemento
 * @param {number} [params.zoom] - Nivel de zoom del mapa (default: 18)
 * @returns {string} URL compartible
 */
export const generateShareUrl = ({
  latitude,
  longitude,
  type = 'location',
  id = null,
  name = null,
  zoom = 18
}) => {
  // Validar coordenadas
  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    throw new Error('Coordenadas inválidas')
  }

  // Crear parámetros de búsqueda - solo los esenciales
  const params = new URLSearchParams()
  params.set('lat', parseFloat(latitude).toFixed(6))
  params.set('lng', parseFloat(longitude).toFixed(6))
  if (type !== 'location') params.set('type', type)
  if (id) params.set('id', id)
  if (name) params.set('name', name) // URLSearchParams ya codifica automáticamente

  return `${BASE_URL}/?${params.toString()}`
}

/**
 * Parsea los parámetros de URL para obtener la ubicación
 * @returns {Object|null} Objeto con los parámetros de ubicación o null si no existen
 */
export const parseShareParams = () => {
  const params = new URLSearchParams(window.location.search)

  const lat = params.get('lat')
  const lng = params.get('lng')

  // Si no hay coordenadas, retornar null
  if (!lat || !lng) return null

  return {
    latitude: parseFloat(lat),
    longitude: parseFloat(lng),
    type: params.get('type') || 'location',
    id: params.get('id') ? parseInt(params.get('id')) : null,
    name: params.get('name') ? decodeURIComponent(params.get('name')) : null,
    zoom: parseInt(params.get('zoom')) || 18
  }
}

/**
 * Copia una URL al portapapeles
 * @param {string} url - URL a copiar
 * @returns {Promise<boolean>} true si fue exitoso, false si falló
 */
export const copyToClipboard = async (url) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      // Usar la API moderna si está disponible
      await navigator.clipboard.writeText(url)
      return true
    } else {
      // Fallback para navegadores antiguos
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const result = document.execCommand('copy')
      document.body.removeChild(textarea)
      return result
    }
  } catch (err) {
    console.error('Error al copiar al portapapeles:', err)
    return false
  }
}

/**
 * Valida si los parámetros de URL son válidos
 * @param {Object} params - Parámetros a validar
 * @returns {boolean} true si son válidos
 */
export const isValidShareParams = (params) => {
  if (!params) return false
  return (
    typeof params.latitude === 'number' &&
    typeof params.longitude === 'number' &&
    !isNaN(params.latitude) &&
    !isNaN(params.longitude) &&
    params.latitude >= -90 &&
    params.latitude <= 90 &&
    params.longitude >= -180 &&
    params.longitude <= 180
  )
}
