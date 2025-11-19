import axios from 'axios'

// Obtener la URL de la API desde variables de entorno
// En desarrollo: http://localhost:4000
// En producción: https://geolocalizacion-m65o.onrender.com (desde .env.production)
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

console.log('🔗 API Configuration:')
console.log('  Base URL:', baseURL)
console.log('  Environment:', import.meta.env.MODE)

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
})

export default api
