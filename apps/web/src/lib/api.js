import axios from 'axios'

// En desarrollo usa localhost, en producción usa la variable de entorno
const getBaseURL = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  return 'http://localhost:4000'
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json'
  }
})

console.log('API Base URL:', api.defaults.baseURL)

export default api
