import axios from 'axios'

// Detectar si estamos en producción o desarrollo
const isProduction = import.meta.env.PROD
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (isProduction ? 'https://geolocalizacion-mjgx.vercel.app' : 'http://localhost:4000')

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api
