// Example Component: Error Handling Usage
// This file demonstrates how to use the error handling system in components

import { useState } from 'react'
import { Button, Box } from '@mui/material'
import { useError } from '../contexts/ErrorContext'
import { useApiErrorHandler } from '../utils/errorHandler'
import api from '../lib/api'

function ExampleComponent() {
  const [loading, setLoading] = useState(false)
  
  // Method 1: Using ErrorContext directly
  const { showError, showSuccess, showWarning, showInfo } = useError()
  
  // Method 2: Using the API error handler utility
  const handleApiError = useApiErrorHandler()

  // Example 1: Direct error messages
  const handleDirectError = () => {
    showError('Este es un mensaje de error personalizado')
  }

  const handleSuccess = () => {
    showSuccess('¡Operación completada exitosamente!')
  }

  const handleWarning = () => {
    showWarning('Esto es una advertencia')
  }

  const handleInfo = () => {
    showInfo('Información importante para el usuario')
  }

  // Example 2: Handling API errors with custom messages
  const handleApiCallWithCustomError = async () => {
    setLoading(true)
    try {
      await api.get('/buildings')
      showSuccess('Edificios cargados correctamente')
    } catch (error) {
      showError('No se pudieron cargar los edificios. Por favor intente más tarde')
    } finally {
      setLoading(false)
    }
  }

  // Example 3: Handling API errors with automatic messages
  const handleApiCallWithAutoError = async () => {
    setLoading(true)
    try {
      await api.post('/buildings', { invalid: 'data' })
      showSuccess('Edificio creado correctamente')
    } catch (error) {
      // This will automatically show the user-friendly message from the API
      handleApiError(error)
    } finally {
      setLoading(false)
    }
  }

  // Example 4: Handling different error scenarios
  const handleComplexApiCall = async () => {
    setLoading(true)
    try {
      const response = await api.post('/buildings', { 
        nombre_edificio: 'Test',
        acronimo: 'TST'
      })
      showSuccess(`Edificio ${response.data.data.nombre_edificio} creado correctamente`)
    } catch (error) {
      // You can access the user-friendly message
      const userMessage = error.userMessage || 'Error desconocido'
      
      // And add custom handling based on status
      if (error.response?.status === 400) {
        showError(`Error de validación: ${userMessage}`)
      } else if (error.response?.status === 401) {
        showError('Su sesión ha expirado. Redirigiendo al login...')
        // Additional logic like redirecting to login
      } else {
        showError(userMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <h2>Error Handling Examples</h2>
      
      <Button variant="contained" color="error" onClick={handleDirectError}>
        Show Error
      </Button>
      
      <Button variant="contained" color="success" onClick={handleSuccess}>
        Show Success
      </Button>
      
      <Button variant="contained" color="warning" onClick={handleWarning}>
        Show Warning
      </Button>
      
      <Button variant="contained" color="info" onClick={handleInfo}>
        Show Info
      </Button>
      
      <Button 
        variant="outlined" 
        onClick={handleApiCallWithCustomError}
        disabled={loading}
      >
        API Call with Custom Error
      </Button>
      
      <Button 
        variant="outlined" 
        onClick={handleApiCallWithAutoError}
        disabled={loading}
      >
        API Call with Auto Error
      </Button>
      
      <Button 
        variant="outlined" 
        onClick={handleComplexApiCall}
        disabled={loading}
      >
        Complex API Call
      </Button>
    </Box>
  )
}

export default ExampleComponent
