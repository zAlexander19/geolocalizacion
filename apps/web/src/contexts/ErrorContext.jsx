import { createContext, useContext, useState, useCallback } from 'react'
import { Snackbar, Alert } from '@mui/material'

const ErrorContext = createContext()

export const useError = () => {
  const context = useContext(ErrorContext)
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider')
  }
  return context
}

export const ErrorProvider = ({ children }) => {
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(false)

  const showError = useCallback((message, severity = 'error') => {
    setError({ message, severity })
    setOpen(true)
  }, [])

  const showSuccess = useCallback((message) => {
    showError(message, 'success')
  }, [showError])

  const showWarning = useCallback((message) => {
    showError(message, 'warning')
  }, [showError])

  const showInfo = useCallback((message) => {
    showError(message, 'info')
  }, [showError])

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return
    }
    setOpen(false)
  }

  const value = {
    showError,
    showSuccess,
    showWarning,
    showInfo,
  }

  return (
    <ErrorContext.Provider value={value}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleClose}
          severity={error?.severity || 'error'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {error?.message}
        </Alert>
      </Snackbar>
    </ErrorContext.Provider>
  )
}
