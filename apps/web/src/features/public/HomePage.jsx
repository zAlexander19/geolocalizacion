import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  Search as SearchIcon,
  Business as BuildingIcon,
  MeetingRoom as RoomIcon,
  School as SchoolIcon,
  Wc as BathroomIcon,
  LocationOn as LocationIcon,
  MyLocation as MyLocationIcon,
  People as PeopleIcon,
  DirectionsWalk as WalkIcon,
  Image as ImageIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
  Navigation as NavigationIcon,
} from '@mui/icons-material'

import api from '../../lib/api'
import BuildingDetailsModal from '../../components/BuildingDetailsModal'
import SearchBar from '../../components/SearchBar'
import CompassGuide from '../../components/CompassGuide'

// Fix para los iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Componente para manejar la ruta en el mapa con Leaflet Routing Machine
function RouteComponent({ start, end, waypoints = [] }) {
  const map = useMap()

  useEffect(() => {
    if (!map || !start || !end) return

    // Crear array de waypoints: inicio -> puntos intermedios -> destino
    const allWaypoints = [
      L.latLng(start[0], start[1]),

      ...waypoints.map(wp => L.latLng(wp[0], wp[1])),

      L.latLng(end[0], end[1])
    ]

    // Crear el control de rutas
    const routingControl = L.Routing.control({
      waypoints: allWaypoints,
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: 'foot' // Rutas a pie
      }),
      lineOptions: {
        styles: [{ color: '#6FA1EC', weight: 4 }]
      },
      show: false, // Ocultar el panel de instrucciones
      addWaypoints: false,
      routeWhileDragging: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      createMarker: function() { return null; } // No crear marcadores adicionales
    }).addTo(map)

    // Cleanup
    return () => {
      if (map && routingControl) {
        map.removeControl(routingControl)
      }
    }
  }, [map, start, end, waypoints])

  return null
}

export default function HomePage() {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  
  const [searchType, setSearchType] = useState('todo')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchTriggered, setSearchTriggered] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [locationDialog, setLocationDialog] = useState(true)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' })
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [roomDetailOpen, setRoomDetailOpen] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState(null)
  const [buildingDetailOpen, setBuildingDetailOpen] = useState(false)
  const [selectedBathroom, setSelectedBathroom] = useState(null)
  const [bathroomDetailOpen, setBathroomDetailOpen] = useState(false)
  const [routeMapOpen, setRouteMapOpen] = useState(false)
  const [routeDestination, setRouteDestination] = useState(null)
  const [routeDestinationName, setRouteDestinationName] = useState('')
  const [routeDestinationData, setRouteDestinationData] = useState(null)
  const [routeWaypoints, setRouteWaypoints] = useState([])
  const [locationAccuracy, setLocationAccuracy] = useState(null)
  const [selectedFaculty, setSelectedFaculty] = useState(null)
  const [facultyDetailOpen, setFacultyDetailOpen] = useState(false)
  const [compassGuideOpen, setCompassGuideOpen] = useState(false)

  // Query para obtener edificios
  const { data: buildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => {
      const res = await api.get('/buildings')
      return res.data.data
    },
  })

  // Query para obtener pisos
  const { data: allFloors } = useQuery({
    queryKey: ['all-floors'],
    queryFn: async () => {
      if (!buildings) return []
      const floorsPromises = buildings.map(b => 
        api.get(`/buildings/${b.id_edificio}/floors`)
      )
      const floorsResponses = await Promise.all(floorsPromises)
      return floorsResponses.flatMap(res => res.data.data)
    },
    enabled: !!buildings,
  })

  // Query para buscar según el tipo seleccionado
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search', searchType, searchQuery],
    queryFn: async () => {
      const query = searchQuery.toLowerCase().trim()
      let allResults = []

      // Si es "todo" Y hay búsqueda, buscar en todos los tipos
      if (searchType === 'todo' && query) {
        // Buscar en edificios
        const buildingsRes = await api.get('/buildings')
        const buildings = buildingsRes.data.data
        const buildingsFiltered = buildings.filter(item => {
          const nombre = item.nombre_edificio?.toLowerCase() || ''
          const acronimo = item.acronimo?.toLowerCase() || ''
          return nombre.includes(query) || acronimo.includes(query)
        }).map(item => ({ ...item, resultType: 'edificio' }))

        // Buscar en salas
        const roomsRes = await api.get('/rooms')
        const rooms = roomsRes.data.data
        const roomsFiltered = rooms.filter(item => {
          const nombre = item.nombre_sala?.toLowerCase() || ''
          const acronimo = item.acronimo?.toLowerCase() || ''
          return nombre.includes(query) || acronimo.includes(query)
        }).map(room => {
          const floor = allFloors?.find(f => f.id_piso === room.id_piso)
          const building = buildings?.find(b => b.id_edificio === floor?.id_edificio)
          return { ...room, floor, building, resultType: 'sala' }
        })

        // Buscar en baños
        const bathroomsRes = await api.get('/bathrooms')
        const bathrooms = bathroomsRes.data.data
        const bathroomsFiltered = bathrooms.filter(item => {
          const nombre = item.nombre?.toLowerCase() || ''
          return nombre.includes(query)
        }).map(bathroom => {
          const floor = allFloors?.find(f => f.id_piso === bathroom.id_piso)
          const building = buildings?.find(b => b.id_edificio === bathroom.id_edificio)
          return { ...bathroom, floor, building, resultType: 'bano' }
        })

        // Buscar en facultades
        const facultiesRes = await api.get('/faculties')
        const faculties = facultiesRes.data.data
        const facultiesFiltered = faculties.filter(item => {
          const nombre = item.nombre_facultad?.toLowerCase() || ''
          const codigo = item.codigo_facultad?.toLowerCase() || ''
          return nombre.includes(query) || codigo.includes(query)
        }).map(item => ({ ...item, resultType: 'facultad' }))

        // Combinar todos los resultados
        allResults = [
          ...buildingsFiltered,
          ...roomsFiltered,
          ...bathroomsFiltered,
          ...facultiesFiltered
        ]

        // Si hay ubicación, calcular distancia y ordenar
        if (userLocation && allResults.length > 0) {
          allResults = allResults.map(item => {
            let lat, lng
            
            if (item.resultType === 'edificio') {
              lat = item.cord_latitud
              lng = item.cord_longitud
            } else if (item.resultType === 'sala') {
              lat = item.cord_latitud
              lng = item.cord_longitud
            } else if (item.resultType === 'bano') {
              lat = item.cord_latitud
              lng = item.cord_longitud
            } else {
              // Facultades no tienen distancia
              return { ...item, distance: null }
            }
            
            return {
              ...item,
              distance: calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                lat,
                lng
              )
            }
          }).sort((a, b) => {
            // Ordenar por distancia, pero poner facultades al final
            if (a.distance === null) return 1
            if (b.distance === null) return -1
            return a.distance - b.distance
          })
        }

        return allResults
      }

      // Si es "todo" sin búsqueda, no mostrar nada
      if (searchType === 'todo' && !query) {
        return []
      }

      // Búsqueda por tipo específico
      let endpoint = ''
      let data = []

      // Determinar el endpoint según el tipo
      switch (searchType) {
        case 'edificio':
          endpoint = '/buildings'
          break
        case 'sala':
          endpoint = '/rooms'
          break
        case 'bano':
          endpoint = '/bathrooms'
          break
        case 'facultad':
          endpoint = '/faculties'
          break
        default:
          return []
      }

      // Obtener los datos
      const res = await api.get(endpoint)
      data = res.data.data

      // Filtrar según el tipo
      let filtered = []
      
      if (searchType === 'edificio') {
        // Si no hay query, mostrar todos
        if (!query) {
          filtered = data.map(item => ({ ...item, resultType: 'edificio' }))
        } else {
          filtered = data.filter(item => {
            const nombre = item.nombre_edificio?.toLowerCase() || ''
            const acronimo = item.acronimo?.toLowerCase() || ''
            return nombre.includes(query) || acronimo.includes(query)
          }).map(item => ({ ...item, resultType: 'edificio' }))
        }
        
        // Ordenar alfabéticamente por nombre
        filtered = filtered.sort((a, b) => {
          const nombreA = a.nombre_edificio?.toLowerCase() || ''
          const nombreB = b.nombre_edificio?.toLowerCase() || ''
          return nombreA.localeCompare(nombreB)
        })
      } else if (searchType === 'sala') {
        // Si no hay query, mostrar todos
        if (!query) {
          filtered = data
        } else {
          filtered = data.filter(item => {
            const nombre = item.nombre_sala?.toLowerCase() || ''
            const acronimo = item.acronimo?.toLowerCase() || ''
            return nombre.includes(query) || acronimo.includes(query)
          })
        }
        
        // Agregar información de edificio y piso para salas
        filtered = filtered.map(room => {
          const floor = allFloors?.find(f => f.id_piso === room.id_piso)
          const building = buildings?.find(b => b.id_edificio === floor?.id_edificio)
          return { ...room, floor, building, resultType: 'sala' }
        })
        
        // Ordenar alfabéticamente por nombre
        filtered = filtered.sort((a, b) => {
          const nombreA = a.nombre_sala?.toLowerCase() || ''
          const nombreB = b.nombre_sala?.toLowerCase() || ''
          return nombreA.localeCompare(nombreB)
        })
      } else if (searchType === 'bano') {
        // Si no hay query, mostrar todos
        if (!query) {
          filtered = data
        } else {
          filtered = data.filter(item => {
            const nombre = item.nombre?.toLowerCase() || ''
            return nombre.includes(query)
          })
        }
        
        // Agregar información de edificio y piso para baños
        filtered = filtered.map(bathroom => {
          const floor = allFloors?.find(f => f.id_piso === bathroom.id_piso)
          const building = buildings?.find(b => b.id_edificio === bathroom.id_edificio)
          return { ...bathroom, floor, building, resultType: 'bano' }
        })
        
        // Ordenar alfabéticamente por nombre
        filtered = filtered.sort((a, b) => {
          const nombreA = a.nombre?.toLowerCase() || ''
          const nombreB = b.nombre?.toLowerCase() || ''
          return nombreA.localeCompare(nombreB)
        })
      } else if (searchType === 'facultad') {
        // Si no hay query, mostrar todos
        if (!query) {
          filtered = data.map(item => ({ ...item, resultType: 'facultad' }))
        } else {
          filtered = data.filter(item => {
            const nombre = item.nombre_facultad?.toLowerCase() || ''
            const codigo = item.codigo_facultad?.toLowerCase() || ''
            return nombre.includes(query) || codigo.includes(query)
          }).map(item => ({ ...item, resultType: 'facultad' }))
        }
        
        // Ordenar alfabéticamente por nombre
        filtered = filtered.sort((a, b) => {
          const nombreA = a.nombre_facultad?.toLowerCase() || ''
          const nombreB = b.nombre_facultad?.toLowerCase() || ''
          return nombreA.localeCompare(nombreB)
        })
      }

      // Si hay ubicación del usuario Y hay búsqueda, calcular distancia y ordenar
      if (userLocation && filtered.length > 0 && searchType !== 'facultad' && query) {
        return filtered.map(item => {
          let lat, lng
          
          if (searchType === 'edificio') {
            lat = item.cord_latitud
            lng = item.cord_longitud
          } else if (searchType === 'sala') {
            lat = item.cord_latitud
            lng = item.cord_longitud
          } else if (searchType === 'bano') {
            lat = item.cord_latitud
            lng = item.cord_longitud
          }
          
          return {
            ...item,
            distance: calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              lat,
              lng
            )
          }
        }).sort((a, b) => a.distance - b.distance)
      }

      return filtered
    },
    enabled: searchTriggered,
  })

  // Query para obtener todas las salas
  const { data: allRooms } = useQuery({
    queryKey: ['all-rooms'],
    queryFn: async () => {
      const res = await api.get('/rooms')
      return res.data.data
    },
  })

  // Query para obtener todos los baños
  const { data: allBathrooms } = useQuery({
    queryKey: ['all-bathrooms'],
    queryFn: async () => {
      const res = await api.get('/bathrooms')
      return res.data.data
    },
  })

  // Query para obtener todas las facultades
  const { data: allFaculties } = useQuery({
    queryKey: ['all-faculties'],
    queryFn: async () => {
      const res = await api.get('/faculties')
      return res.data.data
    },
  })

  // Función para calcular distancia usando fórmula Haversine
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c * 1000 // Convertir a metros
    return Math.round(distance)
  }

  // Solicitar ubicación al cargar la página
  useEffect(() => {
    setLocationDialog(true)
  }, [])

  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Tu navegador no soporta geolocalización')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, timestamp } = position.coords
        
        // ✅ VALIDACIÓN: Precisión debe ser < 50 metros
        if (accuracy > 50) {
          setSnackbar({
            open: true,
            message: `⚠️ Precisión baja (${Math.round(accuracy)}m). Intenta en exterior.`,
            severity: 'warning'
          })
          // Pero aun así guardar la ubicación
        }

        // ✅ VALIDACIÓN: Verificar que las coordenadas sean válidas
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          setLocationError('Coordenadas inválidas')
          return
        }

        setUserLocation({ 
          latitude, 
          longitude,
          timestamp,  // Útil para saber si es "fresca"
          accuracy 
        })
        setLocationAccuracy(accuracy)
        setLocationDialog(false)
        setLocationError(null)
        setSnackbar({
          open: true,
          message: `✓ Ubicación activada (precisión: ${Math.round(accuracy)}m)`,
          severity: 'success'
        })
      },
      (error) => {
        clearTimeout(timeoutId)
        let errorMessage = 'No se pudo obtener tu ubicación'
        
        console.error('Error code:', error.code)
        
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = 'Permiso denegado'
            break
          case 2: // POSITION_UNAVAILABLE
            errorMessage = 'GPS no disponible'
            break
          case 3: // TIMEOUT
            errorMessage = 'Tiempo de espera agotado'
            break
          default:
            errorMessage = `Error: ${error.message}`
        }
        
        setLocationError(errorMessage)
        setLocationDialog(true)
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: 'error'
        })
        console.error('Error de geolocalización:', error)
      },
      {
        enableHighAccuracy: true,  // ✅ Usa GPS en lugar de solo WiFi
        timeout: 10000,
        maximumAge: 0  // ✅ No usar caché
      }
    )
  }

  const handleRetryLocation = () => {
    setLocationError(null)
    setTimeout(() => {
      requestUserLocation()
    }, 500)
  }

  // Función para generar URL de Google Maps embed
  const getGoogleMapsEmbedUrl = () => {
    if (!selectedRoom) return ''

    if (!userLocation) {
      // Solo mostrar el destino
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${selectedRoom.cord_latitud},${selectedRoom.cord_longitud}&zoom=17`
    }

    // Mostrar ruta desde origen a destino
    const origin = `${userLocation.latitude},${userLocation.longitude}`
    const destination = `${selectedRoom.cord_latitud},${selectedRoom.cord_longitud}`
    return `https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${origin}&destination=${destination}&mode=walking`
  }

  const handleSearch = (searchData) => {
    setSearchType(searchData.type)
    setSearchQuery(searchData.query)
    setSearchTriggered(true)
    
    // Si es tipo específico sin query, mostrar todos en orden alfabético
    if (searchData.type !== 'todo' && !searchData.query.trim()) {
      console.log(`Mostrando todos los ${searchData.type} en orden alfabético`)
    } else if (searchData.query.trim()) {
      console.log(`Buscando ${searchData.type}: ${searchData.query}`)
    }
  }

  return (
    <>
      {/* Background con degradado UNAP (azul marino) y patrón */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(ellipse at 20% 30%, rgba(22, 78, 133, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, rgba(13, 51, 90, 0.3) 0%, transparent 50%),
            linear-gradient(135deg, #0a2540 0%, #0d335a 25%, #164e85 50%, #1a5a9e 75%, #0d335a 100%)
          `,
          backgroundSize: '100% 100%, 100% 100%, cover',
          backgroundAttachment: 'fixed', // Efecto parallax
          zIndex: -2,
        }}
      >
        {/* Patrón de puntos decorativo */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
              radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            backgroundPosition: '0 0, 25px 25px',
            opacity: 0.4,
          }}
        />
      </Box>
      
      {/* Overlay adicional con difuminado sutil */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, rgba(10, 37, 64, 0.4) 0%, rgba(13, 51, 90, 0.6) 50%, rgba(10, 37, 64, 0.7) 100%)',
          backdropFilter: 'blur(2px)',
          zIndex: -1,
        }}
      />
      {/* Diálogo de solicitud de ubicación - SIMPLIFICADO */}
      <Dialog
        open={locationDialog}
        onClose={() => {}}
        disableEscapeKeyDown
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            m: isMobile ? 2 : 3,
            borderRadius: isMobile ? 2 : 3,
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MyLocationIcon color="primary" />
          Activar Ubicación
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Necesitamos acceso a tu ubicación para encontrar lugares cercanos.
          </DialogContentText>
          
          {locationError && (
            <Alert severity="error" sx={{ my: 2 }}>
              {locationError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2 }}>
          <Button
            onClick={handleRetryLocation}
            variant="contained"
            fullWidth
            startIcon={<MyLocationIcon />}
          >
            Solicitar Ubicación
          </Button>
          <Button 
            onClick={() => setLocationDialog(false)} 
            fullWidth
            variant="outlined"
          >
            Continuar sin ubicación
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Header / Navbar con efecto glassmorphism */}
      <AppBar 
        position="sticky" 
        elevation={0} 
        sx={{ 
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(24px) saturate(200%)',
          WebkitBackdropFilter: 'blur(24px) saturate(200%)',
          boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.4)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <Toolbar sx={{ 
          justifyContent: 'space-between',
          gap: isMobile ? 1 : 0,
          py: isMobile ? 1.5 : 1,
          minHeight: isMobile ? 'auto' : 70,
          px: isMobile ? 2 : 4,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LocationIcon 
              sx={{ 
                fontSize: isMobile ? 28 : 36,
                color: 'white',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }} 
            />
            <Typography 
              variant={isMobile ? 'body1' : 'h6'} 
              component="h1" 
              sx={{ 
                fontWeight: 800, 
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                letterSpacing: '-0.5px',
              }}
            >
              {isMobile ? 'Campus UNAP' : 'Geolocalización Campus UNAP'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: isMobile ? 0.5 : 2, alignItems: 'center' }}>
            {/* Botón de estado de ubicación */}
            {userLocation ? (
              <Tooltip title={locationAccuracy ? `Precisión: ${Math.round(locationAccuracy)}m` : 'Ubicación activada'}>
                <Button
                  size="small"
                  startIcon={!isMobile && <MyLocationIcon />}
                  sx={{ 
                    color: 'white',
                    background: 'rgba(16, 185, 129, 0.2)',
                    textTransform: 'none',
                    fontSize: isMobile ? '0.7rem' : '0.875rem',
                    minWidth: isMobile ? 'auto' : 'auto',
                    px: isMobile ? 1 : 2,
                    fontWeight: 600,
                    borderRadius: 2,
                    '&:hover': {
                      background: 'rgba(16, 185, 129, 0.3)',
                    }
                  }}
                >
                  {isMobile ? <MyLocationIcon sx={{ fontSize: 18 }} /> : 'GPS Activo'}
                  {locationAccuracy && locationAccuracy <= 20 && !isMobile && (
                    <Chip 
                      label={`${Math.round(locationAccuracy)}m`}
                      size="small" 
                      sx={{ 
                        ml: 1, 
                        height: 22,
                        background: '#10b981',
                        color: 'white',
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Button>
              </Tooltip>
            ) : (
              <Button
                size="small"
                startIcon={!isMobile && <MyLocationIcon />}
                onClick={handleRetryLocation}
                sx={{ 
                  color: 'white',
                  background: 'rgba(245, 158, 11, 0.2)',
                  textTransform: 'none',
                  fontSize: isMobile ? '0.7rem' : '0.875rem',
                  minWidth: isMobile ? 'auto' : 'auto',
                  px: isMobile ? 1 : 2,
                  fontWeight: 600,
                  borderRadius: 2,
                  '&:hover': {
                    background: 'rgba(245, 158, 11, 0.3)',
                  }
                }}
              >
                {isMobile ? <MyLocationIcon sx={{ fontSize: 18 }} /> : 'Activar GPS'}
              </Button>
            )}

            <Button 
              variant="contained"
              onClick={() => navigate('/login')}
              size="small"
              sx={{ 
                background: 'linear-gradient(135deg, #0d335a 0%, #164e85 100%)',
                boxShadow: '0 4px 15px 0 rgba(13, 51, 90, 0.3)',
                color: 'white',
                '&:hover': { 
                  background: 'linear-gradient(135deg, #164e85 0%, #0d335a 100%)',
                  boxShadow: '0 6px 20px 0 rgba(13, 51, 90, 0.4)',
                  transform: 'translateY(-2px)',
                },
                textTransform: 'none',
                fontWeight: 700,
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                px: isMobile ? 2 : 3,
                py: isMobile ? 0.75 : 1,
                minWidth: isMobile ? 'auto' : 'auto',
                borderRadius: 2,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Login
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content - Con efectos 3D y glassmorphism */}
      <Container maxWidth="lg" sx={{ py: isMobile ? 4 : 8, position: 'relative', zIndex: 1 }}>
        {/* Hero Section con efecto 3D */}
        <Box sx={{ 
          textAlign: 'center', 
          mb: isMobile ? 4 : 8,
          animation: 'fadeInUp 0.8s ease-out',
          '@keyframes fadeInUp': {
            '0%': {
              opacity: 0,
              transform: 'translateY(30px)',
            },
            '100%': {
              opacity: 1,
              transform: 'translateY(0)',
            },
          },
        }}>
          {/* Logo UNAP */}
          <Box
            sx={{
              mb: 4,
              display: 'flex',
              justifyContent: 'center',
              animation: 'fadeInUp 0.6s ease-out',
            }}
          >
            <Box
              sx={{
                width: isMobile ? 120 : 180,
                height: 'auto',
                filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4))',
                '& img': {
                  width: '100%',
                  height: 'auto',
                }
              }}
            >
              <Box
                component="img"
                src="/unap-logo.svg"
                alt="UNAP Logo"
                sx={{
                  width: '100%',
                  height: 'auto',
                  filter: 'brightness(0) invert(1)', // Convertir a blanco
                }}
              />
            </Box>
          </Box>

          <Typography 
            variant={isMobile ? "h4" : "h2"} 
            component="h2" 
            gutterBottom 
            sx={{ 
              fontWeight: 900, 
              mb: 2,
              color: 'white',
              textShadow: '0 4px 20px rgba(0,0,0,0.3), 0 0 40px rgba(255,255,255,0.1)',
              letterSpacing: '-1px',
              lineHeight: 1.2,
            }}
          >
            Encuentra lugares en el Campus
          </Typography>
          <Typography 
            variant={isMobile ? "body1" : "h5"} 
            sx={{ 
              mb: 6,
              color: 'rgba(255, 255, 255, 0.95)',
              textShadow: '0 2px 10px rgba(0,0,0,0.2)',
              fontWeight: 500,
              maxWidth: 700,
              mx: 'auto',
            }}
          >
            Busca edificios, salas, facultades o baños
          </Typography>

          {/* Search Bar con efecto glassmorphism mejorado */}
          <Box sx={{ 
            maxWidth: 900, 
            mx: 'auto',
            '& > *': {
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(20px) saturate(180%)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px 0 rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2)',
              },
              '& .MuiInputAdornment-root svg': {
                color: 'white !important',
              }
            }
          }}>
            <SearchBar onSearch={handleSearch} initialType="todo" />
          </Box>
        </Box>

        {/* Search Results Section - Con efectos glassmorphism */}
        {searchTriggered && (
          <Box sx={{ 
            mb: 6,
            animation: 'fadeIn 0.5s ease-out',
            '@keyframes fadeIn': {
              '0%': { opacity: 0 },
              '100%': { opacity: 1 },
            },
          }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 800, 
                mb: 3,
                color: 'white',
                textShadow: '0 2px 15px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              {searchQuery ? 'Resultados de búsqueda' : (searchType === 'edificio' ? 'Todos los Edificios' : searchType === 'sala' ? 'Todas las Salas' : searchType === 'bano' ? 'Todos los Baños' : searchType === 'facultad' ? 'Todas las Facultades' : 'Resultados')}
              {searchQuery && searchType !== 'todo' && ` - ${searchType === 'edificio' ? 'Edificios' : searchType === 'sala' ? 'Salas' : searchType === 'bano' ? 'Baños' : 'Facultades'}`}
            </Typography>

            {isSearching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : searchResults?.length > 0 ? (
              <Box>
                {/* Edificios */}
                {searchResults.filter(r => searchType === 'edificio' || (searchType === 'todo' && r.resultType === 'edificio')).length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    {searchType === 'todo' && (
                      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, display: 'flex', alignItems: 'center', gap: 1, color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                        <BuildingIcon sx={{ color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                        Edificios
                      </Typography>
                    )}
                    <Grid container spacing={3}>
                      {/* Resultados para EDIFICIOS */}
                      {searchResults.filter(r => searchType === 'edificio' || (searchType === 'todo' && r.resultType === 'edificio')).map((building) => (
                  <Grid item xs={12} md={6} lg={4} key={building.id_edificio}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.3s',
                        '&:hover': {
                          boxShadow: 6,
                          transform: 'translateY(-4px)'
                        }
                      }}
                    >
                      {/* Imagen del edificio */}
                      {building.imagen && !/via\.placeholder\.com/.test(building.imagen) ? (
                        <Box sx={{ position: 'relative' }}>
                          <CardMedia
                            component="img"
                            height="200"
                            image={building.imagen.startsWith('http') ? building.imagen : `http://localhost:4000${building.imagen}`}
                            alt={building.nombre_edificio}
                            sx={{ objectFit: 'cover' }}
                          />
                          {building.disponibilidad === 'En mantenimiento' && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 10,
                                left: 0,
                                right: 0,
                                bgcolor: 'error.main',
                                color: 'white',
                                py: 1,
                                px: 2,
                                fontWeight: 'bold',
                                textAlign: 'center',
                                transform: 'rotate(-5deg)',
                                boxShadow: 3,
                                zIndex: 1
                              }}
                            >
                              ⚠️ EN MANTENIMIENTO
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            height: 200,
                            bgcolor: 'grey.200',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <BuildingIcon sx={{ fontSize: 80, color: 'grey.400' }} />
                        </Box>
                      )}

                      <CardContent sx={{ flexGrow: 1 }}>
                        {/* Tipo de resultado (solo cuando es búsqueda "todo") */}
                        {searchType === 'todo' && (
                          <Chip 
                            icon={<BuildingIcon />}
                            label="Edificio"
                            size="small"
                            color="primary"
                            sx={{ mb: 1 }}
                          />
                        )}
                        
                        {/* Nombre del edificio */}
                        <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
                          {building.nombre_edificio}
                        </Typography>

                        {/* Acrónimo */}
                        {building.acronimo && (
                          <Chip 
                            label={building.acronimo}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ mb: 2 }}
                          />
                        )}

                        {/* Estado y Disponibilidad */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Chip
                            label={building.disponibilidad}
                            size="small"
                            color={building.disponibilidad === 'Disponible' ? 'success' : 'default'}
                          />
                          <Chip
                            label={building.estado ? 'Activo' : 'Inactivo'}
                            size="small"
                            color={building.estado ? 'success' : 'error'}
                          />
                        </Box>

                        {/* Distancia */}
                        {building.distance !== undefined && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, mb: 2 }}>
                            <WalkIcon color="primary" fontSize="small" />
                            <Typography variant="body1" color="primary" sx={{ fontWeight: 'bold' }}>
                              A {building.distance < 1000 
                                ? `${building.distance} metros` 
                                : `${(building.distance / 1000).toFixed(2)} km`} de ti
                            </Typography>
                          </Box>
                        )}

                        {/* Botones de acción */}
                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                          <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<LocationIcon />}
                            onClick={() => {
                              if (!userLocation) {
                                setSnackbar({
                                  open: true,
                                  message: 'Por favor, activa tu ubicación para ver la ruta',
                                  severity: 'warning'
                                })
                                return
                              }
                              setRouteDestination({
                                lat: building.cord_latitud,
                                lng: building.cord_longitud
                              })
                              setRouteDestinationName(building.nombre_edificio)
                              setRouteDestinationData({
                                type: 'building',
                                name: building.nombre_edificio,
                                acronym: building.acronimo,
                                image: building.imagen,
                                distance: building.distance,
                                latitude: building.cord_latitud,
                                longitude: building.cord_longitud
                              })
                              setRouteWaypoints([]) // Sin waypoints para edificios
                              setRouteMapOpen(true)
                            }}
                          >
                            Ver Ruta
                          </Button>
                          <Button
                            fullWidth
                            variant="contained"
                            onClick={() => {
                              setSelectedBuilding(building)
                              setBuildingDetailOpen(true)
                              setFloorRoomCarousels({})
                            }}
                          >
                            Ver más
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                    </Grid>
                  </Box>
                )}

                {/* Salas */}
                {searchResults.filter(r => searchType === 'sala' || (searchType === 'todo' && r.resultType === 'sala')).length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    {searchType === 'todo' && (
                      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, display: 'flex', alignItems: 'center', gap: 1, color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                        <ImageIcon sx={{ color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                        Salas
                      </Typography>
                    )}
                    <Grid container spacing={3}>
                      {/* Resultados para SALAS */}
                      {searchResults.filter(r => searchType === 'sala' || (searchType === 'todo' && r.resultType === 'sala')).map((room) => (
                  <Grid item xs={12} md={6} lg={4} key={room.id_sala}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.3s',
                        '&:hover': {
                          boxShadow: 6,
                          transform: 'translateY(-4px)'
                        }
                      }}
                    >
                      {/* Imagen de la sala */}
                      {room.imagen && !/via\.placeholder\.com/.test(room.imagen) ? (
                        <Box sx={{ position: 'relative' }}>
                          <CardMedia
                            component="img"
                            height="200"
                            image={room.imagen.startsWith('http') ? room.imagen : `http://localhost:4000${room.imagen}`}
                            alt={room.nombre_sala}
                            sx={{ objectFit: 'cover' }}
                          />
                          {room.disponibilidad === 'En mantenimiento' && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 10,
                                left: 0,
                                right: 0,
                                bgcolor: 'error.main',
                                color: 'white',
                                py: 1,
                                px: 2,
                                fontWeight: 'bold',
                                textAlign: 'center',
                                transform: 'rotate(-5deg)',
                                boxShadow: 3,
                                zIndex: 1
                              }}
                            >
                              ⚠️ EN MANTENIMIENTO
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            height: 200,
                            bgcolor: 'grey.200',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <ImageIcon sx={{ fontSize: 80, color: 'grey.400' }} />
                        </Box>
                      )}

                      <CardContent sx={{ flexGrow: 1 }}>
                        {/* Tipo de resultado (solo cuando es búsqueda "todo") */}
                        {searchType === 'todo' && (
                          <Chip 
                            icon={<RoomIcon />}
                            label="Sala"
                            size="small"
                            color="secondary"
                            sx={{ mb: 1 }}
                          />
                        )}
                        
                        {/* Nombre de la sala */}
                        <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
                          {room.nombre_sala}
                        </Typography>

                        {/* Acrónimo */}
                        {room.acronimo && (
                          <Chip 
                            label={room.acronimo}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ mr: 1, mb: 2 }}
                          />
                        )}

                        {/* Tipo de sala */}
                        <Chip 
                          label={room.tipo_sala || 'Sin tipo'}
                          size="small"
                          color="secondary"
                          variant="outlined"
                          sx={{ mb: 2 }}
                        />

                        {/* Edificio */}
                        {room.building && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <BuildingIcon color="action" fontSize="small" />
                            <Typography variant="body2" color="text.secondary">
                              <strong>Edificio:</strong> {room.building.nombre_edificio}
                            </Typography>
                          </Box>
                        )}

                        {/* Piso */}
                        {room.floor && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <RoomIcon color="action" fontSize="small" />
                            <Typography variant="body2" color="text.secondary">
                              <strong>Piso:</strong> {room.floor.nombre_piso}
                            </Typography>
                          </Box>
                        )}

                        {/* Capacidad */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <PeopleIcon color="action" fontSize="small" />
                          <Typography variant="body2" color="text.secondary">
                            <strong>Capacidad:</strong> {room.capacidad} personas
                          </Typography>
                        </Box>

                        {/* Disponibilidad */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Chip
                            label={room.disponibilidad}
                            size="small"
                            color={room.disponibilidad === 'Disponible' ? 'success' : 'default'}
                          />
                          <Chip
                            label={room.estado ? 'Activa' : 'Inactiva'}
                            size="small"
                            color={room.estado ? 'success' : 'error'}
                          />
                        </Box>

                        {/* Distancia */}
                        {room.distance !== undefined && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, mb: 2 }}>
                            <WalkIcon color="primary" fontSize="small" />
                            <Typography variant="body1" color="primary" sx={{ fontWeight: 'bold' }}>
                              A {room.distance < 1000 
                                ? `${room.distance} metros` 
                                : `${(room.distance / 1000).toFixed(2)} km`} de ti
                            </Typography>
                          </Box>
                        )}

                        {/* Botones de acción */}
                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                          <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<LocationIcon />}
                            onClick={() => {
                              if (!userLocation) {
                                setSnackbar({
                                  open: true,
                                  message: 'Por favor, activa tu ubicación para ver la ruta',
                                  severity: 'warning'
                                })
                                return
                              }
                              
                              // Si la sala tiene edificio, pasar primero por su entrada
                              const waypoints = []
                              if (room.building && room.building.cord_latitud && room.building.cord_longitud) {
                                waypoints.push([room.building.cord_latitud, room.building.cord_longitud])
                              }
                              
                              setRouteDestination({
                                lat: room.cord_latitud,
                                lng: room.cord_longitud
                              })
                              setRouteDestinationName(`Sala ${room.nombre_sala}`)
                              setRouteDestinationData({
                                type: 'room',
                                name: `Sala ${room.nombre_sala}`,
                                acronym: room.nombre_edificio,
                                image: room.imagen,
                                distance: room.distance,
                                latitude: room.cord_latitud,
                                longitude: room.cord_longitud,
                                capacity: room.capacidad_personas
                              })
                              setRouteWaypoints(waypoints)
                              setRouteMapOpen(true)
                            }}
                          >
                            Ver Ruta
                          </Button>
                          <Button
                            fullWidth
                            variant="contained"
                            onClick={() => {
                              setSelectedRoom(room)
                              setRoomDetailOpen(true)
                            }}
                          >
                            Ver más
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                    </Grid>
                  </Box>
                )}

                {/* Facultades */}
                {searchResults.filter(r => searchType === 'facultad' || (searchType === 'todo' && r.resultType === 'facultad')).length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    {searchType === 'todo' && (
                      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, display: 'flex', alignItems: 'center', gap: 1, color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                        <SchoolIcon sx={{ color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                        Facultades
                      </Typography>
                    )}
                    <Grid container spacing={3}>
                      {/* Resultados para FACULTADES */}
                      {searchResults.filter(r => searchType === 'facultad' || (searchType === 'todo' && r.resultType === 'facultad')).map((faculty) => {
                  const associatedBuilding = faculty.id_edificio
                    ? (buildings || []).find(b => Number(b.id_edificio) === Number(faculty.id_edificio))
                    : null

                  return (
                    <Grid item xs={12} md={6} lg={4} key={faculty.codigo_facultad}>
                      <Card 
                        sx={{ 
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'all 0.3s',
                          '&:hover': {
                            boxShadow: 6,
                            transform: 'translateY(-4px)'
                          }
                        }}
                      >
                        {/* Logo de la facultad */}
                        {faculty.logo && !/via\.placeholder\.com/.test(faculty.logo) ? (
                          <Box
                            sx={{
                              height: 200,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: 'grey.50',
                              p: 2
                            }}
                          >
                            <Box
                              component="img"
                              src={faculty.logo.startsWith('http') ? faculty.logo : `http://localhost:4000${faculty.logo}`}
                              alt={faculty.nombre_facultad}
                              sx={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                              }}
                            />
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              height: 200,
                              bgcolor: 'grey.200',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <SchoolIcon sx={{ fontSize: 80, color: 'grey.400' }} />
                          </Box>
                        )}

                        <CardContent sx={{ flexGrow: 1 }}>
                          {/* Tipo de resultado (solo cuando es búsqueda "todo") */}
                          {searchType === 'todo' && (
                            <Chip 
                              icon={<SchoolIcon />}
                              label="Facultad"
                              size="small"
                              color="info"
                              sx={{ mb: 1 }}
                            />
                          )}
                          
                          {/* Nombre de la facultad */}
                          <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
                            {faculty.nombre_facultad}
                          </Typography>

                          {/* Código */}
                          {faculty.codigo_facultad && (
                            <Chip 
                              label={faculty.codigo_facultad}
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{ mb: 2 }}
                            />
                          )}

                          {/* Descripción breve */}
                          {faculty.descripcion && (
                            <Typography 
                              variant="body2" 
                              color="text.secondary" 
                              sx={{ 
                                mb: 2,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                minHeight: 40
                              }}
                            >
                              {faculty.descripcion}
                            </Typography>
                          )}

                          {/* Edificio asociado (si existe) */}
                          {associatedBuilding && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                              <BuildingIcon color="action" fontSize="small" />
                              <Typography variant="body2" color="text.secondary">
                                <strong>Edificio:</strong> {associatedBuilding.nombre_edificio}
                              </Typography>
                            </Box>
                          )}

                          {/* Botón de acción */}
                          <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                            <Button
                              fullWidth
                              variant="contained"
                              onClick={() => {
                                setSelectedFaculty(faculty)
                                setFacultyDetailOpen(true)
                              }}
                            >
                              Ver más
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                })}
                    </Grid>
                  </Box>
                )}

                {/* Baños */}
                {searchResults.filter(r => searchType === 'bano' || (searchType === 'todo' && r.resultType === 'bano')).length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    {searchType === 'todo' && (
                      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, display: 'flex', alignItems: 'center', gap: 1, color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                        <BathroomIcon sx={{ color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                        Baños
                      </Typography>
                    )}
                    <Grid container spacing={3}>
                      {/* Resultados para BAÑOS */}
                      {searchResults.filter(r => searchType === 'bano' || (searchType === 'todo' && r.resultType === 'bano')).map((bathroom) => (
                  <Grid item xs={12} md={6} lg={4} key={bathroom.id_bano}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.3s',
                        '&:hover': {
                          boxShadow: 6,
                          transform: 'translateY(-4px)'
                        }
                      }}
                    >
                      {/* Imagen del baño */}
                      {bathroom.imagen && !/via\.placeholder\.com/.test(bathroom.imagen) ? (
                        <Box sx={{ position: 'relative' }}>
                          <CardMedia
                            component="img"
                            height="200"
                            image={bathroom.imagen.startsWith('http') ? bathroom.imagen : `http://localhost:4000${bathroom.imagen}`}
                            alt={bathroom.nombre}
                            sx={{ objectFit: 'cover' }}
                          />
                          {bathroom.disponibilidad === 'En mantenimiento' && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 10,
                                left: 0,
                                right: 0,
                                bgcolor: 'error.main',
                                color: 'white',
                                py: 1,
                                px: 2,
                                fontWeight: 'bold',
                                textAlign: 'center',
                                transform: 'rotate(-5deg)',
                                boxShadow: 3,
                                zIndex: 1
                              }}
                            >
                              ⚠️ EN MANTENIMIENTO
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            height: 200,
                            bgcolor: 'grey.200',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <BathroomIcon sx={{ fontSize: 80, color: 'grey.400' }} />
                        </Box>
                      )}

                      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {/* Tipo de resultado (solo cuando es búsqueda "todo") */}
                        {searchType === 'todo' && (
                          <Chip 
                            icon={<BathroomIcon />}
                            label="Baño"
                            size="small"
                            color="warning"
                            sx={{ mb: 0, alignSelf: 'flex-start' }}
                          />
                        )}
                        
                        {/* Nombre */}
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                          {bathroom.nombre || 'Baño sin nombre'}
                        </Typography>

                        {/* Chips: Tipo y Disponibilidad */}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip 
                            label={bathroom.tipo === 'h' ? 'Hombre' : bathroom.tipo === 'm' ? 'Mujer' : 'Mixto'}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Chip
                            label={bathroom.disponibilidad}
                            size="small"
                            color={bathroom.disponibilidad === 'Disponible' ? 'success' : 'default'}
                          />
                        </Box>

                        {/* Edificio */}
                        {bathroom.building && (
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8 }}>
                            <BuildingIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.25, flexShrink: 0 }} />
                            <Typography variant="body2" color="text.secondary">
                              {bathroom.building.nombre_edificio}
                            </Typography>
                          </Box>
                        )}

                        {/* Piso */}
                        {bathroom.floor && (
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8 }}>
                            <RoomIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.25, flexShrink: 0 }} />
                            <Typography variant="body2" color="text.secondary">
                              {bathroom.floor.nombre_piso}
                            </Typography>
                          </Box>
                        )}

                        {/* Capacidad */}
                        {bathroom.capacidad > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8 }}>
                            <PeopleIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.25, flexShrink: 0 }} />
                            <Typography variant="body2" color="text.secondary">
                              {bathroom.capacidad} cubículos
                            </Typography>
                          </Box>
                        )}

                        {/* Acceso discapacidad */}
                        {bathroom.acceso_discapacidad && (
                          <Chip 
                            label="♿ Acceso discapacidad"
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ alignSelf: 'flex-start' }}
                          />
                        )}

                        {/* Distancia */}
                        {bathroom.distance !== undefined && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 1 }}>
                            <WalkIcon sx={{ fontSize: 18, color: 'primary.main', flexShrink: 0 }} />
                            <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                              A {bathroom.distance < 1000 
                                ? `${bathroom.distance} metros` 
                                : `${(bathroom.distance / 1000).toFixed(2)} km`} de ti
                            </Typography>
                          </Box>
                        )}

                        {/* Botones de acción */}
                        <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                          <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<LocationIcon />}
                            onClick={() => {
                              if (!userLocation) {
                                setSnackbar({
                                  open: true,
                                  message: 'Por favor, activa tu ubicación para ver la ruta',
                                  severity: 'warning'
                                })
                                return
                              }
                              
                              // Si el baño tiene edificio, pasar primero por su entrada
                              const waypoints = []
                              if (bathroom.building && bathroom.building.cord_latitud && bathroom.building.cord_longitud) {
                                waypoints.push([bathroom.building.cord_latitud, bathroom.building.cord_longitud])
                              }
                              
                              setRouteDestination({
                                lat: bathroom.cord_latitud,
                                lng: bathroom.cord_longitud
                              })
                              setRouteDestinationName(`Baño en ${bathroom.nombre_edificio}`)
                              setRouteDestinationData({
                                type: 'bathroom',
                                name: `Baño en ${bathroom.nombre_edificio}`,
                                acronym: bathroom.nombre_piso,
                                image: bathroom.imagen,
                                distance: bathroom.distance,
                                latitude: bathroom.cord_latitud,
                                longitude: bathroom.cord_longitud,
                                capacity: bathroom.capacidad_personas
                              })
                              setRouteWaypoints(waypoints)
                              setRouteMapOpen(true)
                            }}
                            sx={{ textTransform: 'none', fontWeight: 'bold' }}
                          >
                            Ver Ruta
                          </Button>
                          <Button
                            fullWidth
                            variant="contained"
                            onClick={() => {
                              setSelectedBathroom(bathroom)
                              setBathroomDetailOpen(true)
                            }}
                            sx={{ textTransform: 'none', fontWeight: 'bold' }}
                          >
                            Ver más
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                    </Grid>
                  </Box>
                )}
              </Box>
            ) : (
              <Paper sx={{ 
                p: 6, 
                textAlign: 'center',
                background: 'rgba(0, 0, 0, 0.7) !important',
                backdropFilter: 'blur(20px) saturate(180%)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <SearchIcon sx={{ fontSize: 64, color: 'rgba(255, 255, 255, 0.4)', mb: 2 }} />
                <Typography variant="h6" sx={{ color: 'white', mb: 1 }} gutterBottom>
                  No se encontraron resultados
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Intenta con otro término de búsqueda o verifica la ortografía
                </Typography>
              </Paper>
            )}
          </Box>
        )}
      </Container>

      {/* Modal de Detalles de la Sala */}
      <Dialog
        open={roomDetailOpen}
        onClose={() => setRoomDetailOpen(false)}
        maxWidth={isMobile ? "xs" : "md"}
        fullWidth
        PaperProps={{
          sx: { 
            m: isMobile ? 2 : 3,
            borderRadius: isMobile ? 2 : 3,
          }
        }}
      >
        {selectedRoom && (
          <>
            <DialogTitle sx={{ 
              pb: 1,
              fontSize: isMobile ? '1rem' : '1.25rem',
            }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                gap: 1,
                flexDirection: isMobile ? 'column' : 'row',
              }}>
                <Typography 
                  variant={isMobile ? "h6" : "h5"} 
                  component="div" 
                  sx={{ fontWeight: 'bold' }}
                >
                  {selectedRoom.nombre_sala}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={selectedRoom.tipo_sala || 'Sin tipo'}
                    color="primary"
                    size="small"
                  />
                  <Chip
                    label={selectedRoom.estado ? 'Activa' : 'Inactiva'}
                    color={selectedRoom.estado ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                {/* Columna izquierda: Imagen de la sala */}
                <Grid item xs={12} md={5}>
                  {selectedRoom.imagen && !/via\.placeholder\.com/.test(selectedRoom.imagen) ? (
                    <Box
                      component="img"
                      src={selectedRoom.imagen.startsWith('http') ? selectedRoom.imagen : `http://localhost:4000${selectedRoom.imagen}`}
                      alt={selectedRoom.nombre_sala}
                      sx={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: 350,
                        objectFit: 'cover',
                        borderRadius: 2,
                        boxShadow: 2
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: '100%',
                        height: 300,
                        bgcolor: 'grey.200',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 2
                      }}
                    >
                      <ImageIcon sx={{ fontSize: 80, color: 'grey.400' }} />
                    </Box>
                  )}
                </Grid>

                {/* Columna derecha: Descripción y datos */}
                <Grid item xs={12} md={7}>
                  {/* Acrónimo y chips */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {selectedRoom.acronimo && (
                      <Chip label={selectedRoom.acronimo} size="small" color="primary" />
                    )}
                    <Chip label={selectedRoom.tipo_sala || 'Sin tipo'} size="small" color="secondary" variant="outlined" />
                  </Box>

                  {/* Descripción */}
                  {selectedRoom.descripcion ? (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Descripción
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                        {selectedRoom.descripcion}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" fontStyle="italic" sx={{ mb: 3 }}>
                      No hay descripción disponible para esta sala
                    </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  {/* Información de la sala */}
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Información
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PeopleIcon color="action" fontSize="small" />
                    <Typography variant="body2"><strong>Capacidad:</strong> {selectedRoom.capacidad} personas</Typography>
                  </Box>

                  {selectedRoom.floor && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LocationIcon color="action" fontSize="small" />
                      <Typography variant="body2">
                        <strong>Piso:</strong> {selectedRoom.floor.nombre_piso}{selectedRoom.floor.numero_piso != null ? ` • N° ${selectedRoom.floor.numero_piso}` : ''}
                      </Typography>
                    </Box>
                  )}

                  {selectedRoom.building && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <BuildingIcon color="action" fontSize="small" />
                      <Typography variant="body2">
                        <strong>Edificio:</strong> {selectedRoom.building.nombre_edificio}{selectedRoom.building.acronimo ? ` (${selectedRoom.building.acronimo})` : ''}
                      </Typography>
                    </Box>
                  )}

                  {selectedRoom.distance !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                      <WalkIcon color="primary" fontSize="small" />
                      <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                        A {selectedRoom.distance < 1000 ? `${selectedRoom.distance} metros` : `${(selectedRoom.distance / 1000).toFixed(2)} km`} de ti
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>

              {/* Sección de imágenes del Piso y Edificio */}
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Piso y Edificio
                </Typography>
                <Grid container spacing={2}>
                  {/* Piso */}
                  {selectedRoom.floor && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Piso</Typography>
                      {selectedRoom.floor.imagen && !/via\.placeholder\.com/.test(selectedRoom.floor.imagen) ? (
                        <Box
                          component="img"
                          src={selectedRoom.floor.imagen.startsWith('http') ? selectedRoom.floor.imagen : `http://localhost:4000${selectedRoom.floor.imagen}`}
                          alt={selectedRoom.floor.nombre_piso}
                          sx={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 2 }}
                        />
                      ) : (
                        <Box sx={{ width: '100%', height: 200, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2 }}>
                          <LocationIcon sx={{ fontSize: 60, color: 'grey.400' }} />
                        </Box>
                      )}
                    </Grid>
                  )}

                  {/* Edificio */}
                  {selectedRoom.building && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Edificio</Typography>
                      {selectedRoom.building.imagen && !/via\.placeholder\.com/.test(selectedRoom.building.imagen) ? (
                        <Box
                          component="img"
                          src={selectedRoom.building.imagen.startsWith('http') ? selectedRoom.building.imagen : `http://localhost:4000${selectedRoom.building.imagen}`}
                          alt={selectedRoom.building.nombre_edificio}
                          sx={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 2 }}
                        />
                      ) : (
                        <Box sx={{ width: '100%', height: 200, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2 }}>
                          <BuildingIcon sx={{ fontSize: 60, color: 'grey.400' }} />
                        </Box>
                      )}
                    </Grid>
                  )}
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: isMobile ? 1 : 2, gap: 1, flexDirection: isMobile ? 'column' : 'row' }}>
              <Button
                variant="outlined"
                onClick={() => setRoomDetailOpen(false)}
                fullWidth={isMobile}
              >
                Cerrar
              </Button>
              <Button
                variant="contained"
                startIcon={<LocationIcon />}
                onClick={() => {
                  if (!userLocation) {
                    setSnackbar({
                      open: true,
                      message: 'Por favor, activa tu ubicación para ver la ruta',
                      severity: 'warning'
                    })
                    return
                  }

                  // Calcular distancia
                  const distance = userLocation ? 
                    Math.round(
                      Math.sqrt(
                        Math.pow((selectedRoom.cord_latitud - userLocation.latitude) * 111320, 2) +
                        Math.pow((selectedRoom.cord_longitud - userLocation.longitude) * 111320 * Math.cos(userLocation.latitude * Math.PI / 180), 2)
                      )
                    ) : undefined

                  setRouteDestination({
                    lat: selectedRoom.cord_latitud,
                    lng: selectedRoom.cord_longitud
                  })
                  setRouteDestinationName(`Sala ${selectedRoom.nombre_sala}`)
                  setRouteDestinationData({
                    type: 'room',
                    name: `Sala ${selectedRoom.nombre_sala}`,
                    acronym: selectedRoom.acronimo,
                    image: selectedRoom.imagen,
                    distance: distance,
                    latitude: selectedRoom.cord_latitud,
                    longitude: selectedRoom.cord_longitud,
                    building: selectedRoom.building?.nombre_edificio,
                    floor: selectedRoom.floor?.nombre_piso
                  })
                  setRouteWaypoints([])
                  setRouteMapOpen(true)
                  setRoomDetailOpen(false)
                }}
              >
                Ver Ruta
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Modal de Detalle del Baño */}
      <Dialog
        open={bathroomDetailOpen}
        onClose={() => {
          setBathroomDetailOpen(false)
          setSelectedBathroom(null)
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        {selectedBathroom && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                  {selectedBathroom.nombre || 'Baño sin nombre'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    label={selectedBathroom.tipo === 'h' ? 'Hombre' : selectedBathroom.tipo === 'm' ? 'Mujer' : 'Mixto'}
                    color="primary"
                    size="small"
                  />
                  <Chip
                    label={selectedBathroom.estado ? 'Activo' : 'Inactivo'}
                    color={selectedBathroom.estado ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                {/* Columna izquierda: Imagen del baño */}
                <Grid item xs={12} md={5}>
                  {selectedBathroom.imagen && !/via\.placeholder\.com/.test(selectedBathroom.imagen) ? (
                    <Box
                      component="img"
                      src={selectedBathroom.imagen.startsWith('http') ? selectedBathroom.imagen : `http://localhost:4000${selectedBathroom.imagen}`}
                      alt={selectedBathroom.nombre}
                      sx={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: 350,
                        objectFit: 'cover',
                        borderRadius: 2,
                        boxShadow: 2
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: '100%',
                        height: 300,
                        bgcolor: 'grey.200',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 2
                      }}
                    >
                      <BathroomIcon sx={{ fontSize: 80, color: 'grey.400' }} />
                    </Box>
                  )}
                </Grid>

                {/* Columna derecha: Descripción y datos */}
                <Grid item xs={12} md={7}>
                  {/* Chips de información */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip label={selectedBathroom.tipo === 'h' ? 'Hombre' : selectedBathroom.tipo === 'm' ? 'Mujer' : 'Mixto'} size="small" color="primary" variant="outlined" />
                    <Chip
                      label={selectedBathroom.disponibilidad}
                      size="small"
                      color={selectedBathroom.disponibilidad === 'Disponible' ? 'success' : 'default'}
                    />
                    {selectedBathroom.acceso_discapacidad && (
                      <Chip label="♿ Acceso discapacidad" size="small" color="success" variant="outlined" />
                    )}
                  </Box>

                  {/* Descripción */}
                  {selectedBathroom.descripcion ? (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Descripción
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                        {selectedBathroom.descripcion}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" fontStyle="italic" sx={{ mb: 3 }}>
                      No hay descripción disponible para este baño
                    </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  {/* Información del baño */}
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Información
                  </Typography>
                  
                  {selectedBathroom.capacidad > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PeopleIcon color="action" fontSize="small" />
                      <Typography variant="body2"><strong>Capacidad:</strong> {selectedBathroom.capacidad} cubículos</Typography>
                    </Box>
                  )}

                  {selectedBathroom.floor && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LocationIcon color="action" fontSize="small" />
                      <Typography variant="body2">
                        <strong>Piso:</strong> {selectedBathroom.floor.nombre_piso}{selectedBathroom.floor.numero_piso != null ? ` • N° ${selectedBathroom.floor.numero_piso}` : ''}
                      </Typography>
                    </Box>
                  )}

                  {selectedBathroom.building && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <BuildingIcon color="action" fontSize="small" />
                      <Typography variant="body2">
                        <strong>Edificio:</strong> {selectedBathroom.building.nombre_edificio}{selectedBathroom.building.acronimo ? ` (${selectedBathroom.building.acronimo})` : ''}
                      </Typography>
                    </Box>
                  )}

                  {selectedBathroom.distance !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                      <WalkIcon color="primary" fontSize="small" />
                      <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                        A {selectedBathroom.distance < 1000 ? `${selectedBathroom.distance} metros` : `${(selectedBathroom.distance / 1000).toFixed(2)} km`} de ti
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>

              {/* Sección de imágenes del Piso y Edificio */}
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Piso y Edificio
                </Typography>
                <Grid container spacing={2}>
                  {/* Piso */}
                  {selectedBathroom.floor && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Piso</Typography>
                      {selectedBathroom.floor.imagen && !/via\.placeholder\.com/.test(selectedBathroom.floor.imagen) ? (
                        <Box
                          component="img"
                          src={selectedBathroom.floor.imagen.startsWith('http') ? selectedBathroom.floor.imagen : `http://localhost:4000${selectedBathroom.floor.imagen}`}
                          alt={selectedBathroom.floor.nombre_piso}
                          sx={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 2 }}
                        />
                      ) : (
                        <Box sx={{ width: '100%', height: 200, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2 }}>
                          <LocationIcon sx={{ fontSize: 60, color: 'grey.400' }} />
                        </Box>
                      )}
                    </Grid>
                  )}

                  {/* Edificio */}
                  {selectedBathroom.building && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Edificio</Typography>
                      {selectedBathroom.building.imagen && !/via\.placeholder\.com/.test(selectedBathroom.building.imagen) ? (
                        <Box
                          component="img"
                          src={selectedBathroom.building.imagen.startsWith('http') ? selectedBathroom.building.imagen : `http://localhost:4000${selectedBathroom.building.imagen}`}
                          alt={selectedBathroom.building.nombre_edificio}
                          sx={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 2 }}
                        />
                      ) : (
                        <Box sx={{ width: '100%', height: 200, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2 }}>
                          <BuildingIcon sx={{ fontSize: 60, color: 'grey.400' }} />
                        </Box>
                      )}
                    </Grid>
                  )}
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setBathroomDetailOpen(false)
                  setSelectedBathroom(null)
                }}
              >
                Cerrar
              </Button>
              <Button
                variant="contained"
                startIcon={<LocationIcon />}
                onClick={() => {
                  if (!userLocation) {
                    setSnackbar({
                      open: true,
                      message: 'Por favor, activa tu ubicación para ver la ruta',
                      severity: 'warning'
                    })
                    return
                  }

                  // Calcular distancia
                  const distance = userLocation ? 
                    Math.round(
                      Math.sqrt(
                        Math.pow((selectedBathroom.cord_latitud - userLocation.latitude) * 111320, 2) +
                        Math.pow((selectedBathroom.cord_longitud - userLocation.longitude) * 111320 * Math.cos(userLocation.latitude * Math.PI / 180), 2)
                      )
                    ) : undefined

                  setRouteDestination({
                    lat: selectedBathroom.cord_latitud,
                    lng: selectedBathroom.cord_longitud
                  })
                  setRouteDestinationName(selectedBathroom.nombre || 'Baño')
                  setRouteDestinationData({
                    type: 'bathroom',
                    name: selectedBathroom.nombre || 'Baño',
                    image: selectedBathroom.imagen,
                    distance: distance,
                    latitude: selectedBathroom.cord_latitud,
                    longitude: selectedBathroom.cord_longitud,
                    building: selectedBathroom.building?.nombre_edificio,
                    floor: selectedBathroom.floor?.nombre_piso,
                    tipo: selectedBathroom.tipo
                  })
                  setRouteWaypoints([])
                  setRouteMapOpen(true)
                  setBathroomDetailOpen(false)
                }}
              >
                Ver Ruta
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Popup del mapa con Google Maps */}
      <Dialog
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        maxWidth={isMobile ? "xs" : "lg"}
        fullWidth
        PaperProps={{
          sx: { 
            height: isMobile ? '95vh' : '85vh',
            m: isMobile ? 1 : 3,
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontSize: isMobile ? '0.875rem' : '1rem',
          }}>
            <Typography variant={isMobile ? "body1" : "h6"}>
              {isMobile ? 'Ruta' : `Ruta a ${routeDestinationName}`}
            </Typography>
            <IconButton onClick={() => setRouteMapOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ 
          p: isMobile ? 1 : 2, 
          height: '100%', 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 1 : 2 
        }}>
          {routeMapOpen && routeDestination && userLocation && routeDestinationData && (
            <>
              {/* Tarjeta de información - Responsive */}
              <Card sx={{ 
                width: isMobile ? '100%' : 300, 
                flexShrink: 0, 
                display: 'flex', 
                flexDirection: 'column',
                maxHeight: isMobile ? 200 : 'auto',
                overflow: isMobile ? 'auto' : 'visible',
              }}>
                {routeDestinationData.image && !/via\.placeholder\.com/.test(routeDestinationData.image) ? (
                  <CardMedia
                    component="img"
                    height="200"
                    image={routeDestinationData.image.startsWith('http') ? routeDestinationData.image : `http://localhost:4000${routeDestinationData.image}`}
                    alt={routeDestinationData.name}
                    sx={{ objectFit: 'cover' }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 200,
                      bgcolor: 'grey.200',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <BuildingIcon sx={{ fontSize: 80, color: 'grey.400' }} />
                  </Box>
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    {routeDestinationData.name}
                  </Typography>
                  
                  {routeDestinationData.acronym && (
                    <Chip
                      label={routeDestinationData.acronym}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                  )}

                  <Divider sx={{ my: 2 }} />

                  {/* Distancia */}
                  {routeDestinationData.distance !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <WalkIcon color="primary" fontSize="small" />
                      <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                        A {routeDestinationData.distance < 1000 
                          ? `${routeDestinationData.distance} metros` 
                          : `${(routeDestinationData.distance / 1000).toFixed(2)} km`} de ti
                      </Typography>
                    </Box>
                  )}

                  {/* Coordenadas */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      <LocationIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                      Lat: {routeDestinationData.latitude}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      <LocationIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                      Lon: {routeDestinationData.longitude}
                    </Typography>
                  </Box>

                  {/* Capacidad si aplica */}
                  {routeDestinationData.capacity && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PeopleIcon color="action" fontSize="small" />
                      <Typography variant="body2" color="text.secondary">
                        Capacidad: {routeDestinationData.capacity} personas
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Mapa con OpenStreetMap y Leaflet Routing */}
              <Box sx={{ 
                flexGrow: 1, 
                position: 'relative', 
                borderRadius: 2, 
                overflow: 'hidden',
                minHeight: isMobile ? 300 : 'auto',
                height: '100%',
              }}>
                <MapContainer
                  center={[userLocation.latitude, userLocation.longitude]}
                  zoom={17}
                  style={{ height: '100%', width: '100%', minHeight: isMobile ? '300px' : '500px' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[userLocation.latitude, userLocation.longitude]}>
                    <Popup>Tu ubicación</Popup>
                  </Marker>
                  <Marker position={[routeDestination.lat, routeDestination.lng]}>
                    <Popup>{routeDestinationName}</Popup>
                  </Marker>
                  <RouteComponent
                    start={[userLocation.latitude, userLocation.longitude]}
                    end={[routeDestination.lat, routeDestination.lng]}
                    waypoints={routeWaypoints}
                  />
                </MapContainer>
              </Box>
            </>
          )}
          {routeMapOpen && (!userLocation || !routeDestination) && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
              <Typography variant="body1" color="text.secondary">
                {!userLocation ? 'No se pudo obtener tu ubicación' : 'No se pudo obtener el destino'}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Detalle del Edificio - Optimizado */}
      <BuildingDetailsModal
        building={selectedBuilding}
        open={buildingDetailOpen}
        onClose={() => {
          setBuildingDetailOpen(false)
          setSelectedBuilding(null)
        }}
        isPublic={true}
        onViewRoute={(destination) => {
          setRouteDestination({
            lat: destination.latitude,
            lng: destination.longitude
          })
          setRouteDestinationName(destination.name)
          setRouteDestinationData(destination)
          setRouteWaypoints([])
          setRouteMapOpen(true)
          setBuildingDetailOpen(false)
        }}
        onRoomClick={(room) => {
          setSelectedRoom(room)
          setRoomDetailOpen(true)
          setBuildingDetailOpen(false)
        }}
      />

      {/* Modal de Mapa con Ruta - SIMPLIFICADO SIN LEAFLET */}
      <Dialog
        open={routeMapOpen}
        onClose={() => setRouteMapOpen(false)}
        maxWidth={isMobile ? "xs" : "lg"}
        fullWidth
        PaperProps={{
          sx: { 
            height: isMobile ? '95vh' : '85vh',
            m: isMobile ? 1 : 3,
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontSize: isMobile ? '0.875rem' : '1rem',
          }}>
            <Typography variant={isMobile ? "body1" : "h6"}>
              {isMobile ? 'Ruta' : `Ruta a ${routeDestinationName}`}
            </Typography>
            <IconButton onClick={() => setRouteMapOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ 
          p: isMobile ? 1 : 2, 
          height: '100%', 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 1 : 2 
        }}>
          {routeMapOpen && routeDestination && userLocation && routeDestinationData && (
            <>
              {/* Tarjeta de información - Responsive */}
              <Card sx={{ 
                width: isMobile ? '100%' : 300, 
                flexShrink: 0, 
                display: 'flex', 
                flexDirection: 'column',
                maxHeight: isMobile ? 200 : 'auto',
                overflow: isMobile ? 'auto' : 'visible',
              }}>
                {routeDestinationData.image && !/via\.placeholder\.com/.test(routeDestinationData.image) ? (
                  <CardMedia
                    component="img"
                    height="200"
                    image={routeDestinationData.image.startsWith('http') ? routeDestinationData.image : `http://localhost:4000${routeDestinationData.image}`}
                    alt={routeDestinationData.name}
                    sx={{ objectFit: 'cover' }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 200,
                      bgcolor: 'grey.200',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <BuildingIcon sx={{ fontSize: 80, color: 'grey.400' }} />
                  </Box>
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    {routeDestinationData.name}
                  </Typography>
                  
                  {routeDestinationData.acronym && (
                    <Chip
                      label={routeDestinationData.acronym}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                  )}

                  <Divider sx={{ my: 2 }} />

                  {/* Distancia */}
                  {routeDestinationData.distance !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <WalkIcon color="primary" fontSize="small" />
                      <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                        A {routeDestinationData.distance < 1000 
                          ? `${routeDestinationData.distance} metros` 
                          : `${(routeDestinationData.distance / 1000).toFixed(2)} km`} de ti
                      </Typography>
                    </Box>
                  )}

                  {/* Coordenadas */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      <LocationIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                      Lat: {routeDestinationData.latitude}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      <LocationIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                      Lon: {routeDestinationData.longitude}
                    </Typography>
                  </Box>

                  {/* Capacidad si aplica */}
                  {routeDestinationData.capacity && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <PeopleIcon color="action" fontSize="small" />
                      <Typography variant="body2" color="text.secondary">
                        Capacidad: {routeDestinationData.capacity} personas
                      </Typography>
                    </Box>
                  )}

                  {/* Botón de Guía con Brújula */}
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    startIcon={<NavigationIcon />}
                    onClick={() => setCompassGuideOpen(true)}
                    sx={{ mt: 2 }}
                  >
                    Activar Guía
                  </Button>
                </CardContent>
              </Card>

              {/* Mapa con OpenStreetMap y Leaflet Routing */}
              <Box sx={{ 
                flexGrow: 1, 
                position: 'relative', 
                borderRadius: 2, 
                overflow: 'hidden',
                minHeight: isMobile ? 300 : 'auto',
                height: '100%',
              }}>
                <MapContainer
                  center={[userLocation.latitude, userLocation.longitude]}
                  zoom={17}
                  style={{ height: '100%', width: '100%', minHeight: isMobile ? '300px' : '500px' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[userLocation.latitude, userLocation.longitude]}>
                    <Popup>Tu ubicación</Popup>
                  </Marker>
                  <Marker position={[routeDestination.lat, routeDestination.lng]}>
                    <Popup>{routeDestinationName}</Popup>
                  </Marker>
                  <RouteComponent
                    start={[userLocation.latitude, userLocation.longitude]}
                    end={[routeDestination.lat, routeDestination.lng]}
                    waypoints={routeWaypoints}
                  />
                </MapContainer>
              </Box>
            </>
          )}
          {routeMapOpen && (!userLocation || !routeDestination) && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
              <Typography variant="body1" color="text.secondary">
                {!userLocation ? 'No se pudo obtener tu ubicación' : 'No se pudo obtener el destino'}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Detalles de la Facultad */}
      <Dialog
        open={facultyDetailOpen}
        onClose={() => setFacultyDetailOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        {selectedFaculty && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <SchoolIcon color="info" sx={{ fontSize: 32 }} />
                  <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                    {selectedFaculty.nombre_facultad}
                  </Typography>
                </Box>
                <IconButton onClick={() => setFacultyDetailOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                {/* Logo de la facultad */}
                <Grid item xs={12} md={4}>
                  {selectedFaculty.logo && !/via\.placeholder\.com/.test(selectedFaculty.logo) ? (
                    <Box
                      component="img"
                      src={selectedFaculty.logo.startsWith('http') ? selectedFaculty.logo : `http://localhost:4000${selectedFaculty.logo}`}
                      alt={selectedFaculty.nombre_facultad}
                      sx={{
                        width: '100%',
                        maxHeight: 300,
                        objectFit: 'contain',
                        borderRadius: 2,
                        bgcolor: 'grey.50',
                        p: 2
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: '100%',
                        height: 200,
                        bgcolor: 'grey.200',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 2
                      }}
                    >
                      <SchoolIcon sx={{ fontSize: 80, color: 'grey.400' }} />
                    </Box>
                  )}
                </Grid>

                {/* Información de la facultad */}
                <Grid item xs={12} md={8}>
                  <Typography variant="overline" color="text.secondary">Información</Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">Código</Typography>
                    <Chip 
                      label={selectedFaculty.codigo_facultad}
                      size="small"
                      color="info"
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>

                  {selectedFaculty.descripcion && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Descripción
                      </Typography>
                      <Typography variant="body2" sx={{ lineHeight: 1.8 }}>
                        {selectedFaculty.descripcion}
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Chip
                      label={selectedFaculty.estado !== false ? 'Activa' : 'Inactiva'}
                      size="small"
                      color={selectedFaculty.estado !== false ? 'success' : 'error'}
                    />
                    <Chip
                      label={selectedFaculty.disponibilidad || 'Disponible'}
                      size="small"
                      color={selectedFaculty.disponibilidad === 'Disponible' ? 'success' : 'default'}
                    />
                  </Box>
                </Grid>
              </Grid>

              {/* Edificios asociados */}
              {selectedFaculty.id_edificio && (
                <Box sx={{ mt: 4 }}>
                  <Divider sx={{ mb: 3 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Edificio Asociado
                  </Typography>
                  {(() => {
                    const associatedBuilding = buildings?.find(b => Number(b.id_edificio) === Number(selectedFaculty.id_edificio))
                    
                    if (!associatedBuilding) return (
                      <Typography variant="body2" color="text.secondary">
                        No se encontró información del edificio
                      </Typography>
                    )

                    return (
                      <Card variant="outlined">
                        <Grid container>
                          <Grid item xs={12} sm={4}>
                            {associatedBuilding.imagen && !/via\.placeholder\.com/.test(associatedBuilding.imagen) ? (
                              <CardMedia
                                component="img"
                                height="200"
                                image={associatedBuilding.imagen.startsWith('http') ? associatedBuilding.imagen : `http://localhost:4000${associatedBuilding.imagen}`}
                                alt={associatedBuilding.nombre_edificio}
                                sx={{ objectFit: 'cover' }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  height: 200,
                                  bgcolor: 'grey.200',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <BuildingIcon sx={{ fontSize: 60, color: 'grey.400' }} />
                              </Box>
                            )}
                          </Grid>
                          <Grid item xs={12} sm={8}>
                            <CardContent>
                              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                {associatedBuilding.nombre_edificio}
                              </Typography>
                              
                              {associatedBuilding.acronimo && (
                                <Chip 
                                  label={associatedBuilding.acronimo}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ mb: 2 }}
                                />
                              )}

                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <LocationIcon color="action" fontSize="small" />
                                <Typography variant="body2" color="text.secondary">
                                  Lat: {associatedBuilding.cord_latitud}, Lon: {associatedBuilding.cord_longitud}
                                </Typography>
                              </Box>

                              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                <Chip
                                  label={associatedBuilding.disponibilidad}
                                  size="small"
                                  color={associatedBuilding.disponibilidad === 'Disponible' ? 'success' : 'default'}
                                />
                                <Chip
                                  label={associatedBuilding.estado ? 'Activo' : 'Inactivo'}
                                  size="small"
                                  color={associatedBuilding.estado ? 'success' : 'error'}
                                />
                              </Box>

                              {associatedBuilding.distance !== undefined && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                                  <WalkIcon color="primary" fontSize="small" />
                                  <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                                    A {associatedBuilding.distance < 1000 
                                      ? `${associatedBuilding.distance} metros` 
                                      : `${(associatedBuilding.distance / 1000).toFixed(2)} km`} de ti
                                  </Typography>
                                </Box>
                              )}

                              <Button
                                variant="outlined"
                                startIcon={<BuildingIcon />}
                                size="small"
                                onClick={() => {
                                  setSelectedBuilding(associatedBuilding)
                                  setBuildingDetailOpen(true)
                                  setFacultyDetailOpen(false)
                                }}
                                sx={{ mt: 2 }}
                              >
                                Ver detalles del edificio
                              </Button>
                            </CardContent>
                          </Grid>
                        </Grid>
                      </Card>
                    )
                  })()}
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2, gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => setFacultyDetailOpen(false)}
              >
                Cerrar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          bgcolor: 'white',
          borderTop: 1,
          borderColor: 'divider',
          py: 3,
          mt: 8
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © 2025 Sistema de Geolocalización Campus. Todos los derechos reservados.
          </Typography>
        </Container>
      </Box>

      {/* Compass Guide Modal */}
      <CompassGuide
        open={compassGuideOpen}
        onClose={() => setCompassGuideOpen(false)}
        userLocation={userLocation}
        destination={routeDestination}
        destinationName={routeDestinationName}
      />
    </>
  )
}
