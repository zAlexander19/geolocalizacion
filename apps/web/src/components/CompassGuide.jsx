import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Button,
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  Close as CloseIcon,
  Navigation as NavigationIcon,
} from '@mui/icons-material'

export default function CompassGuide({ open, onClose, userLocation, destination, destinationName }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [heading, setHeading] = useState(0) // Orientación del dispositivo
  const [bearing, setBearing] = useState(0) // Dirección hacia el destino
  const [distance, setDistance] = useState(0)
  const [error, setError] = useState(null)
  const [permission, setPermission] = useState('prompt')
  const animationRef = useRef(null)

  // Calcular el ángulo hacia el destino
  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const dLon = (lon2 - lon1) * Math.PI / 180
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180)
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon)
    const bearing = Math.atan2(y, x) * 180 / Math.PI
    return (bearing + 360) % 360
  }

  // Calcular distancia
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3 // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return Math.round(R * c)
  }

  // Solicitar permisos de orientación (iOS 13+)
  const requestOrientationPermission = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission()
        setPermission(permission)
        if (permission !== 'granted') {
          setError('Permiso de orientación denegado')
        }
      } catch (err) {
        setError('Error al solicitar permisos: ' + err.message)
      }
    } else {
      setPermission('granted')
    }
  }

  useEffect(() => {
    if (!open || !userLocation || !destination) return

    // Calcular bearing inicial
    const initialBearing = calculateBearing(
      userLocation.latitude,
      userLocation.longitude,
      destination.lat,
      destination.lng
    )
    setBearing(initialBearing)

    // Calcular distancia
    const dist = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      destination.lat,
      destination.lng
    )
    setDistance(dist)

    // Handler para la orientación del dispositivo
    const handleOrientation = (event) => {
      let alpha = event.alpha // Rotación alrededor del eje Z
      let beta = event.beta   // Rotación alrededor del eje X
      let gamma = event.gamma // Rotación alrededor del eje Y

      if (alpha !== null) {
        // Ajustar para iOS (webkitCompassHeading) si está disponible
        if (event.webkitCompassHeading !== undefined) {
          alpha = event.webkitCompassHeading
        } else {
          // Normalizar para Android
          alpha = 360 - alpha
        }

        // Usar requestAnimationFrame para animación suave
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }

        animationRef.current = requestAnimationFrame(() => {
          setHeading(alpha)
        })
      }
    }

    // Solicitar permisos si es necesario
    if (permission === 'prompt') {
      requestOrientationPermission()
    }

    if (permission === 'granted' || permission === 'prompt') {
      window.addEventListener('deviceorientationabsolute', handleOrientation, true)
      window.addEventListener('deviceorientation', handleOrientation, true)
    }

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true)
      window.removeEventListener('deviceorientation', handleOrientation, true)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [open, userLocation, destination, permission])

  // Calcular el ángulo de la flecha (diferencia entre bearing y heading)
  const arrowAngle = bearing - heading

  const handleClose = () => {
    setError(null)
    setPermission('prompt')
    onClose()
  }

  if (!userLocation || !destination) return null

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          bgcolor: '#000',
          color: '#fff',
          minHeight: isMobile ? '100vh' : '60vh',
          m: isMobile ? 0 : 2,
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        pb: 1,
        fontSize: isMobile ? '1rem' : '1.25rem',
        py: isMobile ? 1.5 : 2,
      }}>
        <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ color: '#fff', fontWeight: 'bold' }}>
          Guía de Navegación
        </Typography>
        <IconButton onClick={handleClose} sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: isMobile ? 2 : 3, 
        py: isMobile ? 2 : 4,
        px: isMobile ? 2 : 3,
      }}>
        {error && (
          <Alert severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        )}

        {permission === 'prompt' && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body1" sx={{ mb: 2, color: '#fff' }}>
              Para usar la brújula digital, necesitamos acceso a los sensores de orientación de tu dispositivo.
            </Typography>
            <Button variant="contained" onClick={requestOrientationPermission}>
              Activar Sensores
            </Button>
          </Box>
        )}

        {permission === 'denied' && (
          <Alert severity="warning" sx={{ width: '100%' }}>
            Los permisos de orientación fueron denegados. Por favor, habilítalos en la configuración de tu navegador.
          </Alert>
        )}

        {permission === 'granted' && (
          <>
            {/* Información del destino */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#aaa', mb: 0.5 }}>
                Destino
              </Typography>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
                {destinationName}
              </Typography>
            </Box>

            {/* Distancia */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h2" sx={{ color: '#4CAF50', fontWeight: 'bold' }}>
                {distance < 1000 ? `${distance}m` : `${(distance / 1000).toFixed(2)}km`}
              </Typography>
              <Typography variant="body2" sx={{ color: '#aaa' }}>
                Distancia aproximada
              </Typography>
            </Box>

            {/* Brújula/Flecha */}
            <Box
              sx={{
                position: 'relative',
                width: isMobile ? 200 : 250,
                height: isMobile ? 200 : 250,
                borderRadius: '50%',
                border: '4px solid #333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#111',
                boxShadow: '0 0 30px rgba(76, 175, 80, 0.3)',
              }}
            >
              {/* Marcas cardinales */}
              <Typography
                sx={{
                  position: 'absolute',
                  top: 10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: '#f44336',
                  fontWeight: 'bold',
                  fontSize: '1.2rem'
                }}
              >
                N
              </Typography>
              <Typography
                sx={{
                  position: 'absolute',
                  bottom: 10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: '#666',
                  fontWeight: 'bold'
                }}
              >
                S
              </Typography>
              <Typography
                sx={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#666',
                  fontWeight: 'bold'
                }}
              >
                O
              </Typography>
              <Typography
                sx={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#666',
                  fontWeight: 'bold'
                }}
              >
                E
              </Typography>

              {/* Flecha direccional */}
              <NavigationIcon
                sx={{
                  fontSize: 120,
                  color: '#4CAF50',
                  transform: `rotate(${arrowAngle}deg)`,
                  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  filter: 'drop-shadow(0 0 10px rgba(76, 175, 80, 0.8))',
                }}
              />
            </Box>

            {/* Información de dirección */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#aaa' }}>
                La flecha verde apunta hacia tu destino
              </Typography>
              <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 1 }}>
                Mueve tu dispositivo para calibrar
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
