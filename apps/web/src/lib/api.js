import axios from 'axios'

// Detectar si estamos en desarrollo o producción
const isDevelopment = import.meta.env.DEV

// Usar IP en lugar de localhost para permitir acceso desde celular
const API_BASE_URL = isDevelopment 
  ? 'http://192.168.1.10:4000'  // ← REEMPLAZA CON TU IP
  : '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api
