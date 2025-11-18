import axios from 'axios'

// Obtener la URL base del API según el entorno
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

console.log(`[API Client] Conectando a: ${API_URL}`)

// Crear instancia de axios con configuración base
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
})

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
  response => response,
  error => {
    console.error('[API Error]', error.response?.status, error.message)
    return Promise.reject(error)
  }
)

export default api
