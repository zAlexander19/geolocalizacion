import axios from 'axios'
import { authService } from './auth'

// Usar variable de entorno configurada en Vercel/producción
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para agregar el token en cada petición
api.interceptors.request.use(
  (config) => {
    const token = authService.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Extract user-friendly error message
    let message = 'Ha ocurrido un error inesperado'
    
    if (error.response) {
      // Server responded with error status
      const { data, status } = error.response
      
      if (status === 401) {
        message = 'Su sesión ha expirado. Por favor inicie sesión nuevamente'
        // Optionally logout user
        authService.logout()
        window.location.href = '/login'
      } else if (status === 403) {
        message = 'No tiene permisos para realizar esta acción'
      } else if (status === 404) {
        message = 'El recurso solicitado no fue encontrado'
      } else if (status === 500) {
        message = 'Error interno del servidor. Por favor intente más tarde'
      } else if (data) {
        // Use server error message if available
        message = data.error || data.message || message
      }
    } else if (error.request) {
      // Request was made but no response received
      message = 'No se pudo conectar con el servidor. Verifique su conexión a internet'
    } else {
      // Something else happened
      message = error.message || message
    }
    
    // Attach user-friendly message to error object
    error.userMessage = message
    
    return Promise.reject(error)
  }
)

export default api
