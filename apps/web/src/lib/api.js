import axios from 'axios'

// Detectar si estamos en desarrollo o producción
const isDevelopment = import.meta.env.DEV

// Usar localhost en desarrollo, API de Render en producción
const API_BASE_URL = isDevelopment 
  ? 'http://localhost:4000'
  : 'https://geolocalizacion-hqti.onrender.com'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api
