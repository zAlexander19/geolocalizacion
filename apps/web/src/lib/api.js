import axios from 'axios'

// Usar la variable de entorno de Vite (disponible en construcción)
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Log para debugging
if (typeof window !== 'undefined') {
  console.log('API Base URL:', baseURL)
  console.log('VITE_API_URL:', import.meta.env.VITE_API_URL)
}

export default api
