import { useState, useEffect, useRef } from 'react'
import { getFullImageUrl } from '../utils/imageUrl'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Alert,
  useMediaQuery,
  useTheme,
  Card,
  CardMedia,
} from '@mui/material'
import {
  Close as CloseIcon,
  Navigation as NavigationIcon,
  Business as BuildingIcon,
  MeetingRoom as RoomIcon,
} from '@mui/icons-material'

export default function CompassGuide({ 
  open, 
  onClose, 
  userLocation, 
  destination, 
  destinationName, 
  destinationImage, 
  destinationType,
  variant = 'dialog',
  placement = 'map',
  // New props for route integration
  routeDistance = null, // External distance (from OSRM) in meters
  routeNextPoint = null // External target point {lat, lng} for arrow direction
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [bearing, setBearing] = useState(0) // Dirección hacia el destino
  const [distance, setDistance] = useState(0)
  const [error, setError] = useState(null)
  const [hasArrived, setHasArrived] = useState(false)
  const [showFollowHint, setShowFollowHint] = useState(false)
  const watchIdRef = useRef(null)

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

  // Efecto para rastrear ubicación en tiempo real
  useEffect(() => {
    if (!open || !destination) return

    // Distancia umbral para considerar que has llegado (10 metros)
    const ARRIVAL_THRESHOLD = 10

    // Función para actualizar posición
    const updatePosition = (position) => {
      const currentLat = position.coords.latitude
      const currentLng = position.coords.longitude

      // Usar el siguiente punto de ruta si existe para la dirección de la flecha
      const targetLat = routeNextPoint ? routeNextPoint.lat : destination.lat
      const targetLng = routeNextPoint ? routeNextPoint.lng : destination.lng

      // Calcular bearing
      const newBearing = calculateBearing(
        currentLat,
        currentLng,
        targetLat,
        targetLng
      )
      setBearing(newBearing)

      // Calcular distancia (usar la de OSRM si está disponible)
      let dist
      if (routeDistance !== null && routeDistance !== undefined) {
        dist = Math.round(routeDistance)
      } else {
        dist = calculateDistance(
          currentLat,
          currentLng,
          destination.lat,
          destination.lng
        )
      }
      setDistance(dist)

      // Verificar si ha llegado al destino
      if (dist <= ARRIVAL_THRESHOLD && !hasArrived) {
        setHasArrived(true)
      } else if (dist > ARRIVAL_THRESHOLD && hasArrived) {
        setHasArrived(false)
      }
    }

    const handleError = (error) => {
      console.error('Error al obtener ubicación:', error)
      setError('No se pudo obtener tu ubicación en tiempo real')
    }

    // Iniciar seguimiento de ubicación
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        updatePosition,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      )
    }

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [open, destination, hasArrived, routeDistance, routeNextPoint])

  useEffect(() => {
    // Actualizar distancia si cambia desde props
    if (routeDistance !== null && routeDistance !== undefined) {
      setDistance(Math.round(routeDistance))
    }
  }, [routeDistance])

  useEffect(() => {
    if (!open) return

    setShowFollowHint(true)
    const timeoutId = window.setTimeout(() => {
      setShowFollowHint(false)
    }, 4500) // Changed to 4.5 seconds for better read time

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [open])

  useEffect(() => {
    if (!open || !userLocation || !destination) return

    const targetLat = routeNextPoint ? routeNextPoint.lat : destination.lat
    const targetLng = routeNextPoint ? routeNextPoint.lng : destination.lng

    // Calcular bearing inicial
    const initialBearing = calculateBearing(
      userLocation.latitude,
      userLocation.longitude,
      targetLat,
      targetLng
    )
    setBearing(initialBearing)

    // Calcular distancia inicial
    const dist = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      destination.lat,
      destination.lng
    )
    setDistance(dist)
  }, [open, userLocation, destination, routeNextPoint])

  // Calcular el ángulo de la flecha siguiendo la dirección de la ruta
  const arrowAngle = bearing

  const handleClose = () => {
    setError(null)
    setHasArrived(false)
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
    onClose()
  }

  if (!userLocation || !destination) return null

  if (variant === 'overlay') {
    return (
      <>
        {/* Hint Card (Tarjeta Emergente) */}
        {(!isMobile || showFollowHint) && (
          <Box
            sx={{
              position: 'absolute',
              top: { xs: '50%', sm: 'auto' }, // Centered vertically on mobile photo
              bottom: { xs: 'auto', sm: 134 }, // Above the compass ball on desktop (32 + 86 + 16)
              left: '50%', 
              transform: { xs: 'translate(-50%, -50%)', sm: 'translateX(-50%)' },
              zIndex: 9999,
              display: 'flex',
              pointerEvents: 'auto'
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.5,
                pr: 3,
                borderRadius: 4,
                bgcolor: 'rgba(15, 23, 42, 0.95)', // Dark navy background
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
                cursor: 'pointer',
                animation: 'floatCard 3s ease-in-out infinite',
                '@keyframes floatCard': {
                  '0%, 100%': { transform: { xs: 'translate(-50%, -50%)', sm: 'translateY(0)' } },
                  '50%': { transform: { xs: 'translate(-50%, calc(-50% - 6px))', sm: 'translateY(-6px)' } }
                }
              }}
            >
              {/* Thumbnail Image */}
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  overflow: 'hidden',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  position: 'relative'
                }}
              >
                {destinationImage ? (
                  <Box
                    component="img"
                    src={getFullImageUrl(destinationImage)}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BuildingIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
                  </Box>
                )}
                {/* Subtle inner shadow overlay on image */}
                <Box sx={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)', borderRadius: 2 }} />
              </Box>

              {/* Text Content */}
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#60A5FA', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    ¡Sigue la flecha!
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '0.85rem', color: '#E2E8F0', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Avanza hacia tu destino
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        {/* Compass Ball */}
        <Box
          sx={{
            position: { xs: 'fixed', sm: 'absolute' },
            bottom: { xs: 40, sm: 32 }, // map bottom for mobile (fixed to dialog), card bottom for desktop (absolute)
            left: { xs: 20, sm: '50%' }, // Bottom-left on mobile, center on desktop
            transform: { xs: 'none', sm: 'translateX(-50%)' },
            zIndex: 9999, // ensures it's above map controls
            display: 'flex',
            pointerEvents: 'auto',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              width: 86,
              height: 86,
              borderRadius: '50%',
              bgcolor: 'rgba(15, 23, 42, 0.4)', // highly translucent
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 2px 20px rgba(255,255,255,0.05)',
              '&::after': { // subtle top highlight
                content: '""',
                position: 'absolute',
                top: 0,
                left: '10%',
                right: '10%',
                height: '30%',
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)',
                borderRadius: '50%',
                pointerEvents: 'none'
              }
            }}
          >
            <NavigationIcon
              sx={{
                fontSize: 56,
                color: hasArrived ? '#FFD700' : '#4ade80', // Vibrant green
                transform: `rotate(${arrowAngle}deg)`,
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: `drop-shadow(0 0 12px ${hasArrived ? 'rgba(255, 215, 0, 0.8)' : 'rgba(74, 222, 128, 0.8)'})`,
            }}
          />
        </Box>
      </Box>
      </>
    )
  }

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

        <>
            {/* Alerta de llegada al destino */}
            {hasArrived && (
              <Alert 
                severity="success" 
                sx={{ 
                  width: '100%', 
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  '& .MuiAlert-icon': {
                    fontSize: isMobile ? '1.5rem' : '2rem'
                  }
                }}
              >
                🎉 ¡Has llegado a tu destino!
              </Alert>
            )}

            {/* Imagen del destino */}
            {destinationImage && !/via\.placeholder\.com/.test(destinationImage) ? (
              <Card sx={{ width: '100%', maxWidth: 300, mb: 2 }}>
                <CardMedia
                  component="img"
                  height="200"
                  image={getFullImageUrl(destinationImage)}
                  alt={destinationName}
                  sx={{ objectFit: 'cover' }}
                />
              </Card>
            ) : (
              <Box
                sx={{
                  width: '100%',
                  maxWidth: 300,
                  height: 200,
                  bgcolor: '#222',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                  mb: 2,
                }}
              >
                {destinationType === 'building' ? (
                  <BuildingIcon sx={{ fontSize: 80, color: '#444' }} />
                ) : (
                  <RoomIcon sx={{ fontSize: 80, color: '#444' }} />
                )}
              </Box>
            )}

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
              <Typography 
                variant="h2" 
                sx={{ 
                  color: hasArrived ? '#FFD700' : '#4CAF50', 
                  fontWeight: 'bold',
                  transition: 'color 0.3s ease'
                }}
              >
                {distance < 1000 ? `${distance}m` : `${(distance / 1000).toFixed(2)}km`}
              </Typography>
              <Typography variant="body2" sx={{ color: '#aaa' }}>
                {hasArrived ? '¡Destino alcanzado!' : 'Distancia aproximada'}
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
            </Box>
        </>
      </DialogContent>
    </Dialog>
  )
}
