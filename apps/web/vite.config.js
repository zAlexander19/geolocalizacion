import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // HTTPS deshabilitado para desarrollo local
    // En producción en servidor de universidad, NGINX/Apache maneja HTTPS
  }
})
