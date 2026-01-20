import axios from 'axios'
import { authService } from './auth'
import { reportOfflineAttempt } from './networkStatus'

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
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      reportOfflineAttempt()
      return Promise.reject(new axios.Cancel('offline'))
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.request.use(
  (config) => {
    const token = authService.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

export default api
