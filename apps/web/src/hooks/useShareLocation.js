import { useEffect, useState } from 'react'
import { parseShareParams, isValidShareParams } from '../utils/shareLocation'

/**
 * Hook para manejar parámetros de URL de ubicación compartida
 * @returns {Object} Objeto con parámetros y funciones de utilidad
 */
export const useShareLocation = () => {
  const [shareParams, setShareParams] = useState(null)
  const [hasShareParams, setHasShareParams] = useState(false)

  useEffect(() => {
    const params = parseShareParams()
    console.log('useShareLocation - Parámetros parseados:', params)
    if (isValidShareParams(params)) {
      console.log('useShareLocation - Parámetros válidos, estableciendo estado')
      setShareParams(params)
      setHasShareParams(true)
    } else {
      console.log('useShareLocation - Parámetros inválidos o no existen')
    }
  }, [])

  const clearShareParams = () => {
    // Limpiar los parámetros de la URL sin recargar
    window.history.replaceState({}, document.title, window.location.pathname)
    setShareParams(null)
    setHasShareParams(false)
  }

  return {
    shareParams,
    hasShareParams,
    clearShareParams
  }
}
