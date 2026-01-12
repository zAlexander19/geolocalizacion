import { useError } from '../contexts/ErrorContext'

/**
 * Utility to extract user-friendly error messages from API errors
 * @param {Error} error - The error object from API call
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error) => {
  // Use the userMessage attached by API interceptor
  if (error.userMessage) {
    return error.userMessage
  }
  
  // Fallback to response data
  if (error.response?.data) {
    const data = error.response.data
    return data.error || data.message || 'Ha ocurrido un error inesperado'
  }
  
  // Fallback to error message
  return error.message || 'Ha ocurrido un error inesperado'
}

/**
 * Hook to handle API errors with notifications
 * Usage: const handleError = useApiErrorHandler()
 * Then: handleError(error) in catch blocks
 */
export const useApiErrorHandler = () => {
  const { showError } = useError()
  
  return (error) => {
    const message = getErrorMessage(error)
    showError(message)
  }
}
