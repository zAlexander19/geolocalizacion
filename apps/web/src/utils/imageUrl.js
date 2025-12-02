// Utilidad para construir URLs completas de imágenes
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export function getFullImageUrl(imagePath) {
  if (!imagePath) return ''
  
  // Si ya es una URL completa (Cloudinary), devolverla tal cual
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  
  // Si es una ruta relativa (/uploads/...), construir URL completa
  if (imagePath.startsWith('/')) {
    return `${API_BASE_URL}${imagePath}`
  }
  
  // Si no tiene prefijo, asumir que es /uploads/
  return `${API_BASE_URL}/${imagePath}`
}

// Optimización: imagen placeholder mientras carga
export function getOptimizedImageUrl(imagePath, width = 800) {
  const url = getFullImageUrl(imagePath)
  
  // Si es Cloudinary, agregar transformaciones
  if (url.includes('cloudinary')) {
    return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto/`)
  }
  
  return url
}
