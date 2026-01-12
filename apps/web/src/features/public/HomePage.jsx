import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import { getFullImageUrl } from '../../utils/imageUrl'
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
  Info as InfoIcon,
  Map as MapIcon,
  Stairs as StairsIcon,
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
  const [fullImageOpen, setFullImageOpen] = useState(false)
  const [fullImageSrc, setFullImageSrc] = useState('')
  const [fullImageAlt, setFullImageAlt] = useState('')

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
          return (nombre.includes(query) || acronimo.includes(query)) && item.estado
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
          return nombre.includes(query) && item.estado
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
          filtered = data.filter(item => item.estado)
        } else {
          filtered = data.filter(item => {
            const nombre = item.nombre_sala?.toLowerCase() || ''
            const acronimo = item.acronimo?.toLowerCase() || ''
            return (nombre.includes(query) || acronimo.includes(query)) && item.estado
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
          filtered = data.filter(item => item.estado)
        } else {
          filtered = data.filter(item => {
            const nombre = item.nombre?.toLowerCase() || ''
            return nombre.includes(query) && item.estado
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

  // Función para registrar búsquedas en estadísticas
  const logSearch = async (resultType, resultId, resultName) => {
    try {
      await api.post('/statistics/log', {
        searchType: searchType,
        searchQuery: searchQuery,
        resultType: resultType,
        resultId: resultId,
        resultName: resultName,
        userLocation: userLocation ? {
          lat: userLocation.latitude,
          lng: userLocation.longitude
        } : null
      })
    } catch (error) {
      console.error('Error al registrar búsqueda:', error)
      // No mostrar error al usuario, es transparente
    }
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

      {/* Header / Navbar con Diseño Personalizado Mobile-First */}
      <AppBar 
        position="fixed" 
        elevation={0} 
        sx={{ 
          background: 'rgba(12, 36, 68, 0.7)', // Azul institucional translúcido
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          height: { xs: 60, md: 70 },
          justifyContent: 'center',
          left: 0,
          right: 0,
          top: 0,
          zIndex: (theme) => theme.zIndex.drawer + 1, 
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)' 
        }}
      >
        <Toolbar sx={{ 
          justifyContent: 'space-between',
          px: { xs: 2, md: 3 }, // Padding lateral
          minHeight: '100% !important' // Forzar altura del toolbar
        }}>
          {/* Elemento Izquierdo (Branding) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Ícono Cuadrado Blanco */}
            <Box sx={{ 
              width: { xs: 36, md: 40 }, 
              height: { xs: 36, md: 40 }, 
              bgcolor: 'white', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'scale(1.05)' }
            }}>
              <LocationIcon sx={{ color: '#040b14', fontSize: { xs: 20, md: 24 } }} />
            </Box>
            
            {/* Texto Branding */}
            <Typography 
              variant="h6" 
              component="h1" 
              sx={{ 
                fontFamily: '"Poppins", "Inter", sans-serif',
                fontWeight: 700, 
                color: 'white',
                fontSize: { xs: '1.1rem', md: '1.25rem' },
                letterSpacing: '0.5px'
              }}
            >
              Geo-Campus
            </Typography>
          </Box>

          {/* Elemento Derecho (Acciones) */}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            {/* Botón GPS (Icono Cuadrado) */}
            <Tooltip title={userLocation ? `GPS Activo (${Math.round(locationAccuracy || 0)}m)` : 'Activar GPS'}>
               <IconButton
                 onClick={!userLocation ? handleRetryLocation : undefined}
                 sx={{ 
                   bgcolor: userLocation ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)', // Verde sutil si está activo, sino oscuro translúcido
                   color: userLocation ? '#10b981' : 'white',
                   borderRadius: '8px', 
                   width: { xs: 36, md: 40 }, 
                   height: { xs: 36, md: 40 },
                   border: '1px solid rgba(255,255,255,0.1)',
                   transition: 'all 0.2s',
                   '&:hover': { 
                      bgcolor: userLocation ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                      transform: 'translateY(-1px)'
                   }
                 }}
               >
                 {userLocation ? <MyLocationIcon sx={{ fontSize: 20 }} /> : <LocationIcon sx={{ fontSize: 20 }} />}
               </IconButton>
            </Tooltip>

            {/* Botón Login */}
            <Button 
              variant="contained"
              onClick={() => navigate('/login')}
              sx={{ 
                bgcolor: '#007bff', // Azul eléctrico brillante
                color: 'white',
                borderRadius: '20px', // Bordes redondeados estilo 'pill'
                textTransform: 'none',
                fontWeight: 600,
                fontFamily: '"Poppins", sans-serif',
                px: { xs: 2.5, md: 3 },
                height: { xs: 36, md: 40 },
                boxShadow: '0 4px 14px rgba(0, 123, 255, 0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                '&:hover': { 
                  bgcolor: '#0069d9',
                  boxShadow: '0 6px 20px rgba(0, 123, 255, 0.5)',
                  transform: 'translateY(-1px)',
                }
              }}
            >
              Login
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content - Con efectos 3D y glassmorphism */}
      <Container maxWidth="lg" sx={{ py: isMobile ? 4 : 8, pt: { xs: 12, md: 16 }, position: 'relative', zIndex: 1 }}>
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
          <Box sx={{ maxWidth: 900, mx: 'auto', px: 2, position: 'relative', zIndex: 10 }}>
            <SearchBar onSearch={handleSearch} initialType="todo" />
          </Box>
        </Box>

        {/* Mapa de Edificios - Visible solo cuando el tipo es 'todo' y no hay búsqueda activa */}
        {!searchQuery && searchType === 'todo' && (
          buildings && buildings.length > 0 ? (
          <Box sx={{ 
            mb: 6,
            animation: 'fadeIn 0.8s ease-out',
            '@keyframes fadeIn': {
              '0%': { opacity: 0 },
              '100%': { opacity: 1 },
            },
          }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 'bold', 
                mb: 3, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                color: 'white', 
                textShadow: '0 2px 10px rgba(0,0,0,0.3)' 
              }}
            >
              <BuildingIcon sx={{ color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
              Mapa de Edificios del Campus
            </Typography>



            <Paper 
              elevation={6} 
              sx={{ 
                height: isMobile ? 400 : 600, 
                overflow: 'hidden',
                borderRadius: 3,
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <MapContainer
                center={buildings[0]?.cord_latitud && buildings[0]?.cord_longitud ? [buildings[0].cord_latitud, buildings[0].cord_longitud] : userLocation ? [userLocation.latitude, userLocation.longitude] : [-20.241, -70.141]}
                zoom={18}
                maxZoom={19}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Marcador de ubicación del usuario */}
                {userLocation && (
                  <Marker 
                    position={[userLocation.latitude, userLocation.longitude]}
                    icon={L.icon({
                      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                      iconSize: [25, 41],
                      iconAnchor: [12, 41],
                      popupAnchor: [1, -34],
                      shadowSize: [41, 41]
                    })}
                  >
                    <Popup>
                      <strong>Tu ubicación</strong>
                    </Popup>
                  </Marker>
                )}

                {/* Marcadores para cada edificio */}
                {buildings.map((building) => {
                  if (!building.cord_latitud || !building.cord_longitud) return null
                  
                  return (
                    <Marker
                      key={building.id_edificio}
                      position={[building.cord_latitud, building.cord_longitud]}
                      icon={L.divIcon({
                        className: 'custom-marker-building',
                        html: `
                          <div class="marker-content">
                            <div class="marker-icon">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
                              </svg>
                            </div>
                          </div>
                        `,
                        iconSize: [32, 32],
                        iconAnchor: [16, 32], // Ajustado para el nuevo tamaño
                        popupAnchor: [0, -34]
                      })}
                    >
                      <Popup 
                        maxWidth={300} 
                        minWidth={260}
                        className="custom-popup-building"
                        closeButton={true}
                      >
                        <Box 
                          sx={{ 
                            minWidth: 260,
                            height: 200, // Altura fija para la imagen
                            margin: '-14px', // Compensar padding default de Leaflet
                            position: 'relative',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            bgcolor: '#0f172a',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}
                        >
                          {/* 1. Imagen de Fondo */}
                          {building.imagen && !/via\.placeholder\.com/.test(building.imagen) ? (
                            <Box
                              component="img"
                              src={getFullImageUrl(building.imagen)}
                              alt={building.nombre_edificio}
                              sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                filter: 'brightness(0.85)' // Un poco más oscuro para que el texto resalte
                              }}
                            />
                          ) : (
                            <Box 
                              sx={{ 
                                width: '100%', 
                                height: '100%', 
                                bgcolor: '#1e293b', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center' 
                              }}
                            >
                              <BuildingIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.2)' }} />
                            </Box>
                          )}

                          {/* 2. Gradiente Oscuro para legibilidad */}
                          <Box sx={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.6) 100%)',
                            pointerEvents: 'none'
                          }} />

                          {/* 3. Contenido Superior (Título) */}
                          <Box sx={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            right: 0, 
                            p: 2,
                            pr: 4 // Espacio para la X de cerrar
                          }}>
                            <Typography 
                              variant="subtitle1" 
                              sx={{ 
                                color: 'white', 
                                fontWeight: 800, 
                                lineHeight: 1.2,
                                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                                mb: 0.5
                              }}
                            >
                              {building.nombre_edificio}
                            </Typography>
                            
                            {building.acronimo && (
                              <Chip 
                                label={building.acronimo}
                                size="small"
                                sx={{ 
                                  height: 20,
                                  fontSize: '0.7rem',
                                  bgcolor: 'primary.main',
                                  color: 'white',
                                  fontWeight: 700,
                                  border: 'none',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                }}
                              />
                            )}
                          </Box>

                          {/* Mantenimiento Strip */}
                          {building.disponibilidad === 'En mantenimiento' && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '-10%',
                                width: '120%',
                                transform: 'translateY(-50%) rotate(-10deg)',
                                background: 'repeating-linear-gradient(45deg, #d32f2f, #d32f2f 10px, #b71c1c 10px, #b71c1c 20px)',
                                color: 'white',
                                py: '8px',
                                textAlign: 'center',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                letterSpacing: '1.5px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                zIndex: 10,
                                borderTop: '2px solid rgba(255,255,255,0.9)',
                                borderBottom: '2px solid rgba(255,255,255,0.9)',
                                textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                              }}
                            >
                              EN MANTENIMIENTO
                            </Box>
                          )}

                          {/* 4. Botón Inferior (Glassmorphism) */}
                          <Box sx={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                            <Button
                              size="small"
                              variant="contained"
                              fullWidth
                              onClick={() => {
                                logSearch('edificio', building.id_edificio, building.nombre_edificio)
                                setSelectedBuilding(building)
                                setBuildingDetailOpen(true)
                              }}
                              sx={{
                                backdropFilter: 'blur(12px)',
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                color: 'white',
                                fontWeight: 700,
                                textTransform: 'none',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                                '&:hover': {
                                  background: 'rgba(255, 255, 255, 0.3)',
                                  transform: 'translateY(-2px)'
                                },
                                transition: 'all 0.2s'
                              }}
                            >
                              Ver más
                            </Button>
                          </Box>
                        </Box>
                      </Popup>
                    </Marker>
                  )
                })}
              </MapContainer>
            </Paper>
          </Box>
          ) : (
            <Box sx={{ 
              textAlign: 'center', 
              py: 4,
              color: 'white'
            }}>
              <CircularProgress sx={{ color: 'white' }} />
              <Typography variant="body1" sx={{ mt: 2, color: 'rgba(255,255,255,0.8)' }}>
                Cargando mapa de edificios...
              </Typography>
            </Box>
          )
        )}

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
            {(searchResults?.length > 0 || searchQuery) && (
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
            )}

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
                    <Box sx={{
                      position: 'relative',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      '&:hover': {
                        transform: 'translateY(-4px)'
                      },
                      transition: 'all 0.3s ease-in-out'
                    }}>
                       {/* Contenedor de Imagen y Contenido */}
                       <Box sx={{ 
                         position: 'relative', 
                         borderRadius: 4, 
                         overflow: 'hidden', 
                         height: 320, // Aumentado un poco para dar espacio
                         boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
                         bgcolor: 'grey.900'
                       }}>
                         {/* Imagen */}
                         {building.imagen && !/via\.placeholder\.com/.test(building.imagen) ? (
                            <CardMedia
                              component="img"
                              image={getFullImageUrl(building.imagen)}
                              alt={building.nombre_edificio}
                              sx={{ 
                                height: '100%', 
                                width: '100%',
                                objectFit: 'cover',
                                transition: 'transform 0.5s ease',
                                '&:hover': {
                                  transform: 'scale(1.05)'
                                }
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                height: '100%',
                                width: '100%',
                                bgcolor: '#1e293b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column',
                                gap: 2
                              }}
                            >
                              <BuildingIcon sx={{ fontSize: 60, color: 'rgba(255,255,255,0.2)' }} />
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                                Sin imagen disponible
                              </Typography>
                            </Box>
                          )}

                          {/* Gradient Overlays para legibilidad */}
                          <Box sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '50%',
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
                            zIndex: 1
                          }} />
                          <Box sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '40%',
                            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
                            zIndex: 1
                          }} />

                          {/* Título dentro de la tarjeta, arriba */}
                          <Typography 
                             variant="h6" 
                             sx={{ 
                               position: 'absolute',
                               top: 20,
                               left: 20,
                               right: 20,
                               fontWeight: 800, 
                               color: 'white', 
                               fontFamily: "Inter, Roboto, sans-serif",
                               textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                               fontSize: '1.25rem',
                               letterSpacing: 0.5,
                               zIndex: 2,
                               lineHeight: 1.2
                             }}
                           >
                             {building.nombre_edificio}
                           </Typography>

                          {/* Mantenimiento Badge Ribbon */}
                          {building.disponibilidad === 'En mantenimiento' && (
                             <Box
                               sx={{
                                 position: 'absolute',
                                 top: '22%',
                                 left: '50%',
                                 width: '150%',
                                 transform: 'translate(-50%, -50%) rotate(-10deg)',
                                 background: 'linear-gradient(90deg, rgba(220,38,38,0.95) 0%, rgba(185,28,28,0.95) 100%)',
                                 color: 'white',
                                 py: 1,
                                 textAlign: 'center',
                                 fontWeight: 900,
                                 fontSize: '1rem',
                                 letterSpacing: 4,
                                 textTransform: 'uppercase',
                                 zIndex: 10,
                                 boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                 borderTop: '2px solid rgba(255,255,255,0.3)',
                                 borderBottom: '2px solid rgba(255,255,255,0.3)',
                               }}
                             >
                               EN MANTENIMIENTO
                             </Box>
                          )}

                          {/* Botones Flotantes (Sin fondo difuminado) */}
                          <Box sx={{
                            position: 'absolute',
                            bottom: 20,
                            left: 20,
                            right: 20,
                            display: 'flex',
                            gap: 1.5,
                            alignItems: 'center',
                            zIndex: 2
                          }}>
                            {/* Ver Ruta */}
                            <Button
                              fullWidth
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
                              sx={{
                                borderRadius: 2,
                                background: 'linear-gradient(135deg, #0288d1 0%, #1565c0 100%)',
                                color: 'white',
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                height: 44,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                '&:hover': {
                                  background: 'linear-gradient(135deg, #0277bd 0%, #0d47a1 100%)',
                                }
                              }}
                            >
                              VER RUTA
                            </Button>

                             {/* Ver Más */}
                             <Button
                               fullWidth
                               variant="contained"
                               onClick={() => {
                                  logSearch('edificio', building.id_edificio, building.nombre_edificio)
                                  setSelectedBuilding(building)
                                  setBuildingDetailOpen(true)
                                  setFloorRoomCarousels({})
                               }}
                               sx={{
                                 borderRadius: 2,
                                 background: 'rgba(255,255,255,0.2)', // Más visible sobre oscuro
                                 color: 'white',
                                 textTransform: 'none',
                                 fontWeight: 700,
                                 fontSize: '0.875rem',
                                 height: 44,
                                 border: '1px solid rgba(255,255,255,0.4)',
                                 backdropFilter: 'blur(4px)',
                                 '&:hover': {
                                   background: 'rgba(255,255,255,0.3)',
                                 }
                               }}
                             >
                               VER MÁS
                             </Button>
                          </Box>

                       </Box>
                    </Box>
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
                        height: 320,
                        borderRadius: 4,
                        overflow: 'hidden',
                        position: 'relative',
                        transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                        cursor: 'default', // Changed from pointer since we have specific buttons
                        background: '#0a1929', 
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                          '& .room-details-overlay': {
                            opacity: 1,
                            transform: 'translateY(0)',
                          },
                          '& .room-title-overlay': {
                            opacity: 0, 
                          }
                        }
                      }}
                    >
                      <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
                        {/* Imagen de fondo */}
                        {room.imagen && !/via\.placeholder\.com/.test(room.imagen) ? (
                            <CardMedia
                                component="img"
                                image={getFullImageUrl(room.imagen)}
                                alt={room.nombre_sala}
                                sx={{ 
                                    height: '100%', 
                                    width: '100%', 
                                    objectFit: 'cover',
                                }}
                            />
                        ) : (
                            <Box
                                sx={{
                                    height: '100%',
                                    width: '100%',
                                    bgcolor: 'grey.800',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <ImageIcon sx={{ fontSize: 80, color: 'grey.600' }} />
                            </Box>
                        )}

                        {/* Gradientes */}
                        <Box sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '50%',
                          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
                          zIndex: 1
                        }} />
                        <Box sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '40%',
                          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
                          zIndex: 1
                        }} />

                        {/* Cinta de Mantenimiento */}
                        {room.disponibilidad === 'En mantenimiento' && (
                             <Box
                               sx={{
                                 position: 'absolute',
                                 top: '22%',
                                 left: '50%',
                                 width: '150%',
                                 transform: 'translate(-50%, -50%) rotate(-10deg)',
                                 background: 'linear-gradient(90deg, rgba(220,38,38,0.95) 0%, rgba(185,28,28,0.95) 100%)',
                                 color: 'white',
                                 py: 1,
                                 textAlign: 'center',
                                 fontWeight: 900,
                                 fontSize: '1rem',
                                 letterSpacing: 4,
                                 textTransform: 'uppercase',
                                 zIndex: 10,
                                 boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                 borderTop: '2px solid rgba(255,255,255,0.3)',
                                 borderBottom: '2px solid rgba(255,255,255,0.3)',
                               }}
                             >
                               EN MANTENIMIENTO
                             </Box>
                        )}

                        {/* Title Overlay (Visible por defecto, desaparece en hover) */}
                         <Box 
                           className="room-title-overlay"
                           sx={{ 
                             position: 'absolute',
                             top: 20,
                             left: 20,
                             right: 20,
                             zIndex: 2,
                             transition: 'opacity 0.3s ease-in-out',
                           }}
                         >
                            {/* Tags/Chips Pequeños */}
                            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                {room.acronimo && (
                                    <Box sx={{ 
                                        borderRadius: '50px', 
                                        border: '1px solid rgba(13, 71, 161, 0.8)', 
                                        px: 1.5,
                                        py: 0.2,
                                        color: '#42a5f5', 
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        backdropFilter: 'blur(4px)',
                                        bgcolor: 'rgba(13, 71, 161, 0.2)'
                                    }}>
                                        {room.acronimo}
                                    </Box>
                                )}
                                {room.tipo_sala && (
                                    <Box sx={{ 
                                        borderRadius: '50px', 
                                        border: '1px solid rgba(171, 71, 188, 0.8)', 
                                        px: 1.5,
                                        py: 0.2,
                                        color: '#e1bee7', 
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        backdropFilter: 'blur(4px)',
                                        bgcolor: 'rgba(171, 71, 188, 0.2)'
                                    }}>
                                        {room.tipo_sala}
                                    </Box>
                                )}
                            </Box>

                           <Typography 
                             variant="h4" 
                             sx={{ 
                               fontWeight: 900, 
                               color: 'white', 
                               textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                               fontSize: '2rem',
                               lineHeight: 1
                             }}
                           >
                             {room.nombre_sala}
                           </Typography>
                         </Box>

                        {/* Detalles Overlay (Visible en Hover, Fondo Oscuro) */}
                        <Box
                            className="room-details-overlay"
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                bgcolor: 'rgba(0, 5, 16, 0.85)', 
                                backdropFilter: 'blur(8px)',
                                opacity: 0,
                                transform: 'translateY(20px)',
                                transition: 'all 0.3s ease-in-out',
                                zIndex: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                p: 3,
                            }}
                        >
                             {/* Chips Superiores (Duplicados para visualización en hover) */}
                            <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
                                {room.acronimo && (
                                    <Box sx={{ 
                                        borderRadius: '50px', 
                                        border: '1px solid #1565c0', 
                                        px: 2,
                                        py: 0.4,
                                        color: '#42a5f5', 
                                        fontSize: '0.9rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {room.acronimo}
                                    </Box>
                                )}
                                {room.tipo_sala && (
                                    <Box sx={{ 
                                        borderRadius: '50px', 
                                        border: '1px solid #7b1fa2', 
                                        px: 2,
                                        py: 0.4,
                                        color: '#e1bee7', 
                                        fontSize: '0.9rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {room.tipo_sala}
                                    </Box>
                                )}
                            </Box>

                            {/* Lista de Detalles */}
                            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <BuildingIcon sx={{ fontSize: 22, color: 'rgba(255,255,255,0.7)' }} />
                                    <Typography variant="body1" sx={{ color: 'white', fontSize: '1rem' }}>
                                        <span style={{ fontWeight: 800, marginRight: 6 }}>Edificio:</span> {room.building?.nombre_edificio || "N/A"}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <RoomIcon sx={{ fontSize: 22, color: 'rgba(255,255,255,0.7)' }} />
                                    <Typography variant="body1" sx={{ color: 'white', fontSize: '1rem' }}>
                                        <span style={{ fontWeight: 800, marginRight: 6 }}>Piso:</span> {room.floor?.nombre_piso || "N/A"}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <PeopleIcon sx={{ fontSize: 22, color: 'rgba(255,255,255,0.7)' }} />
                                    <Typography variant="body1" sx={{ color: 'white', fontSize: '1rem' }}>
                                        <span style={{ fontWeight: 800, marginRight: 6 }}>Capacidad:</span> {room.capacidad} personas
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>

                        {/* Botones de acción (Siempre Visibles, encima de todo) */}
                        <Box sx={{ 
                            position: 'absolute',
                            bottom: 20,
                            left: 20,
                            right: 20,
                            display: 'flex',
                            gap: 1.5,
                            zIndex: 10 // Encima del overlay
                        }}>
                              <Button
                                fullWidth
                                variant="contained"
                                startIcon={<LocationIcon />}
                                onClick={(e) => {
                                  e.stopPropagation(); // Evitar click en card si hubiera
                                  if (!userLocation) {
                                    setSnackbar({
                                      open: true,
                                      message: 'Por favor, activa tu ubicación para ver la ruta',
                                      severity: 'warning'
                                    })
                                    return
                                  }
                                  
                                  let routeDestLat, routeDestLng, compassDestLat, compassDestLng
                                  
                                  if (room.building && room.building.cord_latitud && room.building.cord_longitud) {
                                    routeDestLat = room.building.cord_latitud
                                    routeDestLng = room.building.cord_longitud
                                    compassDestLat = room.cord_latitud
                                    compassDestLng = room.cord_longitud
                                  } else {
                                    routeDestLat = room.cord_latitud
                                    routeDestLng = room.cord_longitud
                                    compassDestLat = room.cord_latitud
                                    compassDestLng = room.cord_longitud
                                  }
                                  
                                  setRouteDestination({
                                    lat: routeDestLat,
                                    lng: routeDestLng
                                  })
                                  setRouteDestinationName(`Sala ${room.nombre_sala}`)
                                  setRouteDestinationData({
                                    type: 'room',
                                    name: `Sala ${room.nombre_sala}`,
                                    acronym: room.nombre_edificio,
                                    image: room.imagen,
                                    distance: room.distance,
                                    latitude: compassDestLat,
                                    longitude: compassDestLng,
                                    capacity: room.capacidad_personas
                                  })
                                  setRouteWaypoints([])
                                  setRouteMapOpen(true)
                                }}
                                sx={{
                                   borderRadius: 2,
                                   background: 'linear-gradient(135deg, #0288d1 0%, #1565c0 100%)', 
                                   textTransform: 'none',
                                   fontWeight: 'bold',
                                   boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                   '&:hover': {
                                      background: 'linear-gradient(135deg, #0277bd 0%, #0d47a1 100%)',
                                   }
                                }}
                              >
                                VER RUTA
                              </Button>
                              <Button
                                fullWidth
                                variant="contained"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  logSearch('sala', room.id_sala, room.nombre_sala)
                                  setSelectedRoom(room)
                                  setRoomDetailOpen(true)
                                }}
                                sx={{
                                   borderRadius: 2,
                                   background: 'rgba(255,255,255,0.2)', // Estilo "Building"
                                   backdropFilter: 'blur(4px)',
                                   border: '1px solid rgba(255,255,255,0.4)',
                                   color: 'white',
                                   textTransform: 'none',
                                   fontWeight: 'bold',
                                   '&:hover': { background: 'rgba(255,255,255,0.3)' }
                                }}
                              >
                                VER MÁS
                              </Button>
                         </Box>

                      </Box>
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
                  const associatedBuildings = faculty.edificios && faculty.edificios.length > 0
                    ? faculty.edificios
                    : (faculty.id_edificio 
                        ? [(buildings || []).find(b => Number(b.id_edificio) === Number(faculty.id_edificio))].filter(Boolean)
                        : [])

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
                              src={getFullImageUrl(faculty.logo)}
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

                          {/* Edificios asociados */}
                          {associatedBuildings.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <BuildingIcon fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                                <Typography variant="body2" color="text.secondary">
                                  <strong>{associatedBuildings.length > 1 ? 'Edificios:' : 'Edificio:'}</strong>
                                </Typography>
                              </Box>
                              <Box sx={{ pl: 3.5 }}>
                                {associatedBuildings.map((b, idx) => (
                                  <Typography key={idx} variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                                    {b.nombre_edificio}
                                  </Typography>
                                ))}
                              </Box>
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

                    {/* Mapa con todos los baños cuando el filtro es 'bano' - PRIMERO */}
                    {searchType === 'bano' && (
                      <Box sx={{ mb: 4 }}>
                        <Typography 
                          variant="h5" 
                          sx={{ 
                            fontWeight: 'bold', 
                            mb: 3, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            color: 'white', 
                            textShadow: '0 2px 10px rgba(0,0,0,0.3)' 
                          }}
                        >
                          <LocationIcon sx={{ color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                          Mapa de Baños
                        </Typography>

                        <Paper 
                          elevation={6} 
                          sx={{ 
                            height: isMobile ? 400 : 600, 
                            overflow: 'hidden',
                            borderRadius: 3,
                            background: 'rgba(0, 0, 0, 0.7)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            position: 'relative' // Necesario para posicionar la leyenda absoluta
                          }}
                        >
                          <MapContainer
                            center={(() => {
                              const bathrooms = searchResults.filter(r => r.resultType === 'bano');
                              if (bathrooms.length > 0 && bathrooms[0].cord_latitud && bathrooms[0].cord_longitud) {
                                return [bathrooms[0].cord_latitud, bathrooms[0].cord_longitud];
                              }
                              return userLocation ? [userLocation.latitude, userLocation.longitude] : [-20.241, -70.141];
                            })()}
                            zoom={18}
                            maxZoom={19}
                            style={{ height: '100%', width: '100%' }}
                          >
                            <TileLayer
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            
                            {/* Marcador de ubicación del usuario */}
                            {userLocation && (
                              <Marker 
                                position={[userLocation.latitude, userLocation.longitude]}
                                icon={L.icon({
                                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                                  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                                  iconSize: [25, 41],
                                  iconAnchor: [12, 41],
                                  popupAnchor: [1, -34],
                                  shadowSize: [41, 41]
                                })}
                              >
                                <Popup>
                                  <strong>Tu ubicación</strong>
                                </Popup>
                              </Marker>
                            )}

                            {/* Marcadores para cada baño */}
                            {searchResults.filter(r => r.resultType === 'bano').map((bathroom) => {
                              if (!bathroom.cord_latitud || !bathroom.cord_longitud) return null
                              
                              // Color y clase del marcador según el tipo de baño
                              let markerClass = 'bathroom-mixed'
                              let markerIconPath = 'M5.5 22v-7.5H4V9c0-1.1.9-2 2-2h3c1.1 0 2 .9 2 2v5.5H9.5V22h-4zM18 22v-6h3l-2.54-7.63C18.18 7.55 17.42 7 16.56 7h-.12c-.86 0-1.63.55-1.9 1.37L12 16h3v6h3zM7.5 6c1.11 0 2-.89 2-2s-.89-2-2-2-2 .89-2 2 .89 2 2 2zm9 0c1.11 0 2-.89 2-2s-.89-2-2-2-2 .89-2 2 .89 2 2 2z'
                              
                              if (bathroom.tipo === 'h') {
                                markerClass = 'bathroom-men'
                                markerIconPath = 'M14 6V4h-4v2h4zM4 8v11h16V8H4zm14 9H6V10h12v7z' /* Icono simple Hombres */
                                markerIconPath = 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' /* Person Icon */
                              }
                              if (bathroom.tipo === 'm') {
                                markerClass = 'bathroom-women'
                                markerIconPath = 'M13.94 8.31C13.62 7.52 12.85 7 12 7s-1.62.52-1.94 1.31L7 16h3v6h4v-6h3l-3.06-7.69zM12 6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z' /* Woman Icon */
                              }
                              
                              return (
                                <Marker
                                  key={bathroom.id_bano}
                                  position={[bathroom.cord_latitud, bathroom.cord_longitud]}
                                  icon={L.divIcon({
                                    className: 'custom-marker-bathroom',
                                    html: `
                                      <div class="marker-content ${markerClass}">
                                        <div class="marker-icon">
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="${markerIconPath}"/>
                                          </svg>
                                        </div>
                                      </div>
                                    `,
                                    iconSize: [32, 32],
                                    iconAnchor: [16, 32],
                                    popupAnchor: [0, -34]
                                  })}
                                >
                                  <Popup 
                                    maxWidth={240} 
                                    minWidth={240}
                                    className="custom-popup-bathroom compact-popup"
                                    closeButton={false}
                                  >
                                    <Box 
                                      sx={{ 
                                        width: 240, 
                                        height: 280, 
                                        position: 'relative',
                                        borderRadius: 3,
                                        overflow: 'hidden',
                                        margin: '-14px -20px -14px -20px',
                                        cursor: 'pointer',
                                        bgcolor: '#000',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                        transition: 'transform 0.2s',
                                        '&:hover': {
                                            transform: 'scale(1.02)'
                                        }
                                      }}
                                      onClick={() => {
                                        logSearch('bano', bathroom.id_bano, bathroom.nombre)
                                        setSelectedBathroom(bathroom)
                                        setBathroomDetailOpen(true)
                                      }}
                                    >
                                      {/* 1. IMAGEN DE FONDO COMPLETA */}
                                      {bathroom.imagen && !/via\.placeholder\.com/.test(bathroom.imagen) ? (
                                        <Box
                                            component="img"
                                            src={getFullImageUrl(bathroom.imagen)}
                                            alt={bathroom.nombre || 'Baño'}
                                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                      ) : (
                                        <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#1e293b' }}>
                                            <BathroomIcon sx={{ fontSize: 60, color: '#334155' }} />
                                        </Box>
                                      )}
                                      
                                      {/* 2. GRADIENTE OVERLAY */}
                                      <Box sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.6) 50%, rgba(15, 23, 42, 0.2) 100%)',
                                        zIndex: 1
                                      }} />

                                      {/* Badge Mantenimiento */}
                                      {bathroom.disponibilidad === 'En mantenimiento' && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 15,
                                                right: -32,
                                                bgcolor: '#ef4444',
                                                color: 'white',
                                                py: 0.5,
                                                px: 4,
                                                fontWeight: 800,
                                                textAlign: 'center',
                                                fontSize: '0.65rem',
                                                transform: 'rotate(45deg)',
                                                boxShadow: 2,
                                                zIndex: 10,
                                                letterSpacing: 1
                                            }}
                                        >
                                            MANT
                                        </Box>
                                      )}

                                      {/* 3. CONTENIDO SUPERPUESTO */}
                                      <Box sx={{ 
                                          position: 'absolute', 
                                          bottom: 0, 
                                          left: 0, 
                                          right: 0, 
                                          p: 2, 
                                          zIndex: 2,
                                          display: 'flex',
                                          flexDirection: 'column'
                                      }}>
                                          {/* Tag Tipo */}
                                          <Box sx={{ display: 'flex', mb: 1 }}>
                                              <Box sx={{ 
                                                  bgcolor: bathroom.tipo === 'h' ? '#3b82f6' : bathroom.tipo === 'm' ? '#ec4899' : '#a855f7', 
                                                  color: 'white',
                                                  px: 1, py: 0.25, 
                                                  borderRadius: 1, 
                                                  fontSize: '0.65rem', 
                                                  fontWeight: 800,
                                                  textTransform: 'uppercase',
                                                  letterSpacing: 0.5,
                                                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                              }}>
                                                  {bathroom.tipo === 'h' ? 'Hombres' : bathroom.tipo === 'm' ? 'Mujeres' : 'Mixto'}
                                              </Box>
                                          </Box>

                                          {/* Título Principal */}
                                          <Typography variant="h6" sx={{ 
                                              fontWeight: 800, 
                                              color: 'white', 
                                              fontSize: '1.1rem', 
                                              lineHeight: 1.2, 
                                              mb: 1.5,
                                              textShadow: '0 2px 4px rgba(0,0,0,0.5)' 
                                          }}>
                                              {bathroom.nombre || 'Baño'}
                                          </Typography>

                                          {/* Metadatos Compactos */}
                                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                                              {/* Edificio */}
                                              {bathroom.building && (
                                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                      <BuildingIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                                                      <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.8rem' }}>
                                                          {bathroom.building.nombre_edificio}
                                                      </Typography>
                                                  </Box>
                                              )}
                                              
                                              {/* Piso y Capacidad */}
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                  {bathroom.floor && (
                                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                                          <StairsIcon sx={{ fontSize: 14, color: '#64748b' }} /> 
                                                          <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.75rem' }}>
                                                              {bathroom.floor.nombre_piso}
                                                          </Typography>
                                                      </Box>
                                                  )}
                                                  {bathroom.capacidad > 0 && (
                                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                                          <PeopleIcon sx={{ fontSize: 14, color: '#64748b' }} />
                                                          <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.75rem' }}>
                                                              {bathroom.capacidad}
                                                          </Typography>
                                                      </Box>
                                                  )}
                                              </Box>
                                          </Box>
                                          
                                          {/* Botón "Ver más" estilo Edificio */}
                                          <Button
                                              fullWidth
                                              size="small"
                                              sx={{
                                                  mt: 2,
                                                  bgcolor: 'rgba(0, 0, 0, 0.6)', 
                                                  backdropFilter: 'blur(4px)',
                                                  border: '1px solid rgba(255, 255, 255, 0.3)',
                                                  color: 'white',
                                                  textTransform: 'none',
                                                  fontWeight: 'bold',
                                                  borderRadius: 1.5,
                                                  boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                                                  '&:hover': {
                                                      bgcolor: 'rgba(0, 0, 0, 0.8)',
                                                      borderColor: 'white'
                                                  }
                                              }}
                                          >
                                              Ver más
                                          </Button>
                                      </Box>
                                    </Box>
                                  </Popup>
                                </Marker>
                              )
                            })}
                          </MapContainer>

                          {/* Leyenda Flotante Superpuesta */}
                          <Box sx={{ 
                              position: 'absolute', 
                              top: 20, 
                              right: 20, 
                              zIndex: 1000, // Leaflet tiene z-index altos, aseguramos que esté encima
                              bgcolor: 'rgba(0, 5, 16, 0.85)',
                              backdropFilter: 'blur(12px)',
                              borderRadius: 2,
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              p: 1.5,
                              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                              display: 'flex',
                              flexDirection: 'column'
                          }}>
                              <Typography variant="caption" sx={{ color: 'grey.400', fontWeight: 'bold', letterSpacing: '1px', mb: 1, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                                  REFERENCIA
                              </Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Box sx={{ width: 8, height: 8, bgcolor: 'green', borderRadius: '50%', boxShadow: '0 0 8px rgba(0,255,0,0.6)' }} />
                                  <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>Hombres</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Box sx={{ width: 8, height: 8, bgcolor: '#ee82ee', borderRadius: '50%', boxShadow: '0 0 8px rgba(238,130,238,0.6)' }} />
                                  <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>Mujeres</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Box sx={{ width: 8, height: 8, bgcolor: 'red', borderRadius: '50%', boxShadow: '0 0 8px rgba(255,0,0,0.6)' }} />
                                  <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>Mixto</Typography>
                                </Box>
                                {userLocation && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ width: 8, height: 8, bgcolor: '#2196f3', borderRadius: '50%', boxShadow: '0 0 8px rgba(33,150,243,0.6)' }} />
                                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>Tu ubicación</Typography>
                                  </Box>
                                )}
                              </Box>
                          </Box>
                        </Paper>
                      </Box>
                    )}

                    <Grid container spacing={3}>
                      {/* Resultados para BAÑOS */}
                      {searchResults.filter(r => searchType === 'bano' || (searchType === 'todo' && r.resultType === 'bano')).map((bathroom) => (
                  <Grid item xs={12} md={6} lg={4} key={bathroom.id_bano}>
                    <Card 
                      sx={{ 
                        height: 320,
                        borderRadius: 4,
                        overflow: 'hidden',
                        position: 'relative',
                        transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                        cursor: 'default',
                        background: '#0a1929', 
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                          '& .bathroom-details-overlay': {
                            opacity: 1,
                            transform: 'translateY(0)',
                          },
                          '& .bathroom-title-overlay': {
                            opacity: 0, 
                          }
                        }
                      }}
                    >
                      <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
                        {/* 1. Imagen de fondo */}
                        {bathroom.imagen && !/via\.placeholder\.com/.test(bathroom.imagen) ? (
                            <CardMedia
                                component="img"
                                image={getFullImageUrl(bathroom.imagen)}
                                alt={bathroom.nombre}
                                sx={{ 
                                    height: '100%', 
                                    width: '100%', 
                                    objectFit: 'cover',
                                }}
                            />
                        ) : (
                            <Box
                                sx={{
                                    height: '100%',
                                    width: '100%',
                                    bgcolor: 'grey.800',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <BathroomIcon sx={{ fontSize: 80, color: 'grey.600' }} />
                            </Box>
                        )}

                        {/* 2. Gradientes */}
                        <Box sx={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, height: '50%',
                          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
                          zIndex: 1
                        }} />
                        <Box sx={{
                          position: 'absolute',
                          bottom: 0, left: 0, right: 0, height: '40%',
                          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
                          zIndex: 1
                        }} />

                        {/* 3. Cinta de Mantenimiento */}
                        {bathroom.disponibilidad === 'En mantenimiento' && (
                             <Box
                               sx={{
                                 position: 'absolute',
                                 top: '22%',
                                 left: '50%',
                                 width: '150%',
                                 transform: 'translate(-50%, -50%) rotate(-10deg)',
                                 background: 'linear-gradient(90deg, rgba(220,38,38,0.95) 0%, rgba(185,28,28,0.95) 100%)',
                                 color: 'white',
                                 py: 1,
                                 textAlign: 'center',
                                 fontWeight: 900,
                                 fontSize: '1rem',
                                 letterSpacing: 4,
                                 textTransform: 'uppercase',
                                 zIndex: 10,
                                 boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                 borderTop: '2px solid rgba(255,255,255,0.3)',
                                 borderBottom: '2px solid rgba(255,255,255,0.3)',
                               }}
                             >
                               EN MANTENIMIENTO
                             </Box>
                        )}

                        {/* 4. Title Overlay (Visible por defecto, desaparece en hover) */}
                         <Box 
                           className="bathroom-title-overlay"
                           sx={{ 
                             position: 'absolute',
                             top: 20,
                             left: 20,
                             right: 20,
                             zIndex: 2,
                             transition: 'opacity 0.3s ease-in-out',
                           }}
                         >
                            {/* Tags/Chips Pequeños */}
                            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                                <Box sx={{ 
                                    borderRadius: '50px', 
                                    border: '1px solid rgba(33, 150, 243, 0.8)', 
                                    px: 1.5,
                                    py: 0.2,
                                    color: '#42a5f5', 
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    backdropFilter: 'blur(4px)',
                                    bgcolor: 'rgba(33, 150, 243, 0.2)'
                                }}>
                                    {bathroom.tipo === 'h' ? 'Hombre' : bathroom.tipo === 'm' ? 'Mujer' : 'Mixto'}
                                </Box>
                                {bathroom.acceso_discapacidad && (
                                    <Box sx={{ 
                                        borderRadius: '50px', 
                                        border: '1px solid rgba(102, 187, 106, 0.8)', // Green
                                        px: 1.5,
                                        py: 0.2,
                                        color: '#81c784', 
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        backdropFilter: 'blur(4px)',
                                        bgcolor: 'rgba(102, 187, 106, 0.2)'
                                    }}>
                                        ♿
                                    </Box>
                                )}
                            </Box>

                           <Typography 
                             variant="h4" 
                             sx={{ 
                               fontWeight: 900, 
                               color: 'white', 
                               textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                               fontSize: '2rem',
                               lineHeight: 1
                             }}
                           >
                             {bathroom.nombre || 'Baño'}
                           </Typography>
                         </Box>

                        {/* 5. Detalles Overlay (Visible en Hover, Fondo Oscuro) */}
                        <Box
                            className="bathroom-details-overlay"
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                bgcolor: 'rgba(0, 5, 16, 0.85)', 
                                backdropFilter: 'blur(8px)',
                                opacity: 0,
                                transform: 'translateY(20px)',
                                transition: 'all 0.3s ease-in-out',
                                zIndex: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                p: 3,
                            }}
                        >
                             {/* Chips Superiores (Duplicados) */}
                             <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                                <Box sx={{ 
                                    borderRadius: '50px', 
                                    border: '1px solid rgba(33, 150, 243, 0.8)', 
                                    px: 1.5,
                                    py: 0.2,
                                    color: '#42a5f5', 
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    backdropFilter: 'blur(4px)',
                                    bgcolor: 'rgba(33, 150, 243, 0.2)'
                                }}>
                                    {bathroom.tipo === 'h' ? 'Hombre' : bathroom.tipo === 'm' ? 'Mujer' : 'Mixto'}
                                </Box>
                            </Box>

                            {/* Lista de Detalles */}
                            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <BuildingIcon sx={{ fontSize: 22, color: 'rgba(255,255,255,0.7)' }} />
                                    <Typography variant="body1" sx={{ color: 'white', fontSize: '1rem' }}>
                                        <span style={{ fontWeight: 800, marginRight: 6 }}>Edificio:</span> {bathroom.building?.nombre_edificio || "N/A"}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <RoomIcon sx={{ fontSize: 22, color: 'rgba(255,255,255,0.7)' }} />
                                    <Typography variant="body1" sx={{ color: 'white', fontSize: '1rem' }}>
                                        <span style={{ fontWeight: 800, marginRight: 6 }}>Piso:</span> {bathroom.floor?.nombre_piso || "N/A"}
                                    </Typography>
                                </Box>
                                {bathroom.capacidad > 0 && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <PeopleIcon sx={{ fontSize: 22, color: 'rgba(255,255,255,0.7)' }} />
                                        <Typography variant="body1" sx={{ color: 'white', fontSize: '1rem' }}>
                                            <span style={{ fontWeight: 800, marginRight: 6 }}>Capacidad:</span> {bathroom.capacidad}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>

                        {/* 6. Botones de acción (Siempre Visibles) */}
                        <Box sx={{ 
                            position: 'absolute',
                            bottom: 20,
                            left: 20,
                            right: 20,
                            display: 'flex',
                            gap: 1.5,
                            zIndex: 10 
                        }}>
                              <Button
                                fullWidth
                                variant="contained"
                                startIcon={<LocationIcon />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!userLocation) {
                                    setSnackbar({
                                      open: true,
                                      message: 'Por favor, activa tu ubicación para ver la ruta',
                                      severity: 'warning'
                                    })
                                    return
                                  }
                                  
                                  // Lógica de ruta (adaptada de salas)
                                  let routeDestLat, routeDestLng, compassDestLat, compassDestLng
                                  
                                  if (bathroom.building && bathroom.building.cord_latitud && bathroom.building.cord_longitud) {
                                    routeDestLat = bathroom.building.cord_latitud
                                    routeDestLng = bathroom.building.cord_longitud
                                    compassDestLat = bathroom.cord_latitud
                                    compassDestLng = bathroom.cord_longitud
                                  } else {
                                    routeDestLat = bathroom.cord_latitud
                                    routeDestLng = bathroom.cord_longitud
                                    compassDestLat = bathroom.cord_latitud
                                    compassDestLng = bathroom.cord_longitud
                                  }
                                  
                                  setRouteDestination({
                                    lat: routeDestLat,
                                    lng: routeDestLng
                                  })
                                  setRouteDestinationName(`Baño ${bathroom.nombre || ''}`)
                                  setRouteDestinationData({
                                    type: 'bathroom',
                                    name: bathroom.nombre || 'Baño',
                                    image: bathroom.imagen,
                                    distance: bathroom.distance,
                                    latitude: compassDestLat,
                                    longitude: compassDestLng,
                                    building: bathroom.building?.nombre_edificio,
                                    floor: bathroom.floor?.nombre_piso,
                                    tipo: bathroom.tipo
                                  })
                                  setRouteWaypoints([])
                                  setRouteMapOpen(true)
                                }}
                                sx={{
                                   borderRadius: 2,
                                   background: 'linear-gradient(135deg, #0288d1 0%, #1565c0 100%)', 
                                   textTransform: 'none',
                                   fontWeight: 'bold',
                                   boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                   '&:hover': {
                                      background: 'linear-gradient(135deg, #0277bd 0%, #0d47a1 100%)',
                                   }
                                }}
                              >
                                VER RUTA
                              </Button>
                              <Button
                                fullWidth
                                variant="contained"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  logSearch('bano', bathroom.id_bano, bathroom.nombre)
                                  setSelectedBathroom(bathroom)
                                  setBathroomDetailOpen(true)
                                }}
                                sx={{
                                   borderRadius: 2,
                                   background: 'rgba(255,255,255,0.2)',
                                   backdropFilter: 'blur(4px)',
                                   border: '1px solid rgba(255,255,255,0.4)',
                                   color: 'white',
                                   textTransform: 'none',
                                   fontWeight: 'bold',
                                   '&:hover': { background: 'rgba(255,255,255,0.3)' }
                                }}
                              >
                                VER MÁS
                              </Button>
                         </Box>

                      </Box>
                    </Card>
                  </Grid>
                ))}
                    </Grid>
                  </Box>
                )}
              </Box>
            ) : searchQuery ? (
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
            ) : null}
          </Box>
        )}
      </Container>

      {/* Modal de Detalles de la Sala */}
      <Dialog
        open={roomDetailOpen}
        onClose={() => {
          setRoomDetailOpen(false)
          setSelectedRoom(null)
        }}
        maxWidth={isMobile ? "xs" : "lg"}
        fullWidth
        PaperProps={{
          sx: { 
            m: isMobile ? 2 : 3,
            borderRadius: isMobile ? 2 : 3,
            maxHeight: '90vh',
            overflow: 'hidden'
          }
        }}
      >
        {selectedRoom && (
          <>
            <DialogTitle sx={{ 
              pb: 1.5,
              borderBottom: 1,
              borderColor: 'divider',
              fontSize: isMobile ? '1rem' : '1.25rem',
            }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                gap: 1,
              }}>
                <Box>
                    <Typography 
                      variant={isMobile ? "h6" : "h5"} 
                      component="div" 
                      sx={{ fontWeight: 'bold', lineHeight: 1.2 }}
                    >
                      {selectedRoom.nombre_sala}
                    </Typography>
                    {selectedRoom.acronimo && (
                        <Typography variant="caption" color="text.secondary">
                            {selectedRoom.acronimo}
                        </Typography>
                    )}
                </Box>
                <Chip
                    label={selectedRoom.tipo_sala || 'Aula'}
                    color="primary"
                    variant="outlined"
                    size="small"
                />
              </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
              <Grid container sx={{ height: isMobile ? 'auto' : 500 }}>
                
                {/* COLUMNA IZQUIERDA: IMAGEN */}
                <Grid item xs={12} md={6} sx={{ 
                    bgcolor: 'black', 
                    position: 'relative', 
                    height: isMobile ? 250 : '100%',
                    order: isMobile ? 1 : 1 
                }}>
                    {selectedRoom.imagen && !/via\.placeholder\.com/.test(selectedRoom.imagen) ? (
                        <Box
                        component="img"
                        src={getFullImageUrl(selectedRoom.imagen)}
                        alt={selectedRoom.nombre_sala}
                        sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                            opacity: 0.95
                        }}
                        />
                    ) : (
                        <Box
                        sx={{
                            width: '100%',
                            height: '100%',
                            bgcolor: 'grey.900',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        >
                        <ImageIcon sx={{ fontSize: 60, color: 'grey.700' }} />
                        </Box>
                    )}
                    
                    {/* Overlay solo con nombre si es necesario, pero ya está en título. Quizás capacidad aquí. */}
                    <Box sx={{
                        position: 'absolute',
                        bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                             <PeopleIcon sx={{ color: 'white' }} />
                             <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
                                Aforo: {selectedRoom.capacidad}
                             </Typography>
                        </Box>
                        {selectedRoom.floor && (
                             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocationIcon sx={{ color: 'white' }} />
                                <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
                                   {selectedRoom.floor.nombre_piso}
                                </Typography>
                             </Box>
                        )}
                    </Box>
                </Grid>

                {/* COLUMNA DERECHA: INFO Y DETALLES */}
                <Grid item xs={12} md={6} sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    order: isMobile ? 2 : 2,
                    bgcolor: '#0f172a', /* Dark slate background */
                    color: 'white'
                }}>
                    <Box sx={{ p: 3, overflowY: 'auto', flexGrow: 1 }}>
                        {/* Descripción */}
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontWeight: 'bold', mb: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.75rem' }}>
                                DESCRIPCIÓN
                            </Typography>
                            <Typography variant="body1" sx={{ lineHeight: 1.6, color: '#e2e8f0' }}>
                                {selectedRoom.descripcion || "No hay información adicional disponible para esta sala."}
                            </Typography>
                        </Box>
                        
                        <Divider sx={{ mb: 4, borderColor: 'rgba(255,255,255,0.1)' }} />

                        {/* Ubicación Visual */}
                        <Box>
                            <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontWeight: 'bold', mb: 2, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.75rem' }}>
                                UBICACIÓN EN CAMPUS
                            </Typography>
                            
                            <Grid container spacing={2}>
                                {selectedRoom.floor && (
                                    <Grid item xs={6}>
                                        <Box 
                                            onClick={() => {
                                                if (selectedRoom.floor.imagen) {
                                                    setFullImageSrc(getFullImageUrl(selectedRoom.floor.imagen))
                                                    setFullImageAlt(selectedRoom.floor.nombre_piso)
                                                    setFullImageOpen(true)
                                                }
                                            }}
                                            sx={{ 
                                                cursor: selectedRoom.floor.imagen ? 'pointer' : 'default',
                                                borderRadius: 2, 
                                                border: '1px solid', 
                                                borderColor: 'rgba(255,255,255,0.1)', 
                                                overflow: 'hidden', 
                                                height: 120, 
                                                bgcolor: '#1e293b',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    borderColor: selectedRoom.floor.imagen ? 'white' : 'rgba(255,255,255,0.1)',
                                                    transform: selectedRoom.floor.imagen ? 'translateY(-2px)' : 'none',
                                                    boxShadow: selectedRoom.floor.imagen ? '0 4px 12px rgba(0,0,0,0.5)' : 'none'
                                                }
                                            }}
                                        >
                                            {selectedRoom.floor.imagen ? (
                                                <Box component="img" src={getFullImageUrl(selectedRoom.floor.imagen)} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><LocationIcon sx={{ color: '#475569' }} /></Box>
                                            )}
                                        </Box>
                                        <Typography variant="caption" sx={{ mt: 1, display: 'block', fontWeight: 600, color: '#e2e8f0' }}>
                                            {selectedRoom.floor.nombre_piso}
                                        </Typography>
                                    </Grid>
                                )}
                                {selectedRoom.building && (
                                    <Grid item xs={6}>
                                         <Box 
                                            onClick={() => {
                                                if (selectedRoom.building.imagen) {
                                                    setFullImageSrc(getFullImageUrl(selectedRoom.building.imagen))
                                                    setFullImageAlt(selectedRoom.building.nombre_edificio)
                                                    setFullImageOpen(true)
                                                }
                                            }}
                                            sx={{ 
                                                cursor: selectedRoom.building.imagen ? 'pointer' : 'default',
                                                borderRadius: 2, 
                                                border: '1px solid', 
                                                borderColor: 'rgba(255,255,255,0.1)', 
                                                overflow: 'hidden', 
                                                height: 120, 
                                                bgcolor: '#1e293b',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    borderColor: selectedRoom.building.imagen ? 'white' : 'rgba(255,255,255,0.1)',
                                                    transform: selectedRoom.building.imagen ? 'translateY(-2px)' : 'none',
                                                    boxShadow: selectedRoom.building.imagen ? '0 4px 12px rgba(0,0,0,0.5)' : 'none'
                                                }
                                            }}
                                        >
                                            {selectedRoom.building.imagen ? (
                                                <Box component="img" src={getFullImageUrl(selectedRoom.building.imagen)} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><BuildingIcon sx={{ color: '#475569' }} /></Box>
                                            )}
                                        </Box>
                                        <Typography variant="caption" sx={{ mt: 1, display: 'block', fontWeight: 600, color: '#e2e8f0' }}>
                                            {selectedRoom.building.nombre_edificio}
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    </Box>

                    {/* Botones Fijos Abajo en Columna Derecha */}
                    <Box sx={{ p: 2, borderTop: 1, borderColor: 'rgba(255,255,255,0.15)', bgcolor: '#0f172a' }}>
                         <Grid container spacing={2}>
                            <Grid item xs={4}>
                                <Button
                                    variant="outlined"
                                    onClick={() => setRoomDetailOpen(false)}
                                    title="Cerrar"
                                    fullWidth
                                    size="large"
                                    sx={{ 
                                        color: '#cbd5e1', 
                                        borderColor: 'rgba(255,255,255,0.2)',
                                        '&:hover': { borderColor: 'white', color: 'white', bgcolor: 'rgba(255,255,255,0.05)' } 
                                    }}
                                >
                                    Cerrar
                                </Button>
                            </Grid>
                            <Grid item xs={8}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    size="large"
                                    startIcon={<LocationIcon />}
                                    onClick={() => {
                                      // Lógica de Ruta
                                      if (!userLocation) {
                                        setSnackbar({ open: true, message: 'Activa tu ubicación', severity: 'warning' })
                                        return
                                      }
                                      const distance = Math.round(Math.sqrt(Math.pow((selectedRoom.cord_latitud - userLocation.latitude) * 111320, 2) + Math.pow((selectedRoom.cord_longitud - userLocation.longitude) * 111320 * Math.cos(userLocation.latitude * Math.PI / 180), 2)))
                                      
                                      setRouteDestination({ lat: selectedRoom.cord_latitud, lng: selectedRoom.cord_longitud })
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
                                    sx={{ 
                                        bgcolor: '#2563eb',
                                        '&:hover': { bgcolor: '#1d4ed8' }
                                    }}
                                >
                                    IR AHORA
                                </Button>
                            </Grid>
                         </Grid>
                    </Box>
                </Grid>
              </Grid>
            </DialogContent>
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
        maxWidth={isMobile ? "xs" : "lg"}
        fullWidth
        PaperProps={{
          sx: { 
             maxHeight: '90vh',
             m: isMobile ? 2 : 3,
             borderRadius: isMobile ? 2 : 3,
             overflow: 'hidden'
          }
        }}
      >
        {selectedBathroom && (
          <>
            <DialogTitle sx={{ 
              pb: 1.5,
              borderBottom: 1,
              borderColor: 'divider',
              fontSize: isMobile ? '1rem' : '1.25rem',
            }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                gap: 1,
              }}>
                 <Box>
                    <Typography 
                      variant={isMobile ? "h6" : "h5"} 
                      component="div" 
                      sx={{ fontWeight: 'bold', lineHeight: 1.2 }}
                    >
                        {selectedBathroom.nombre || 'Baño'}
                    </Typography>
                 </Box>
                 <Chip
                    label={selectedBathroom.tipo === 'h' ? 'Hombres' : selectedBathroom.tipo === 'm' ? 'Mujeres' : 'Mixto'}
                    size="small"
                    sx={{ 
                        bgcolor: selectedBathroom.tipo === 'h' ? '#1976d2' : selectedBathroom.tipo === 'm' ? '#e91e63' : '#9c27b0', // Blue/Pink/Purple
                        color: 'white',
                        fontWeight: 'bold'
                    }}
                />
              </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
               <Grid container sx={{ height: isMobile ? 'auto' : 500 }}>
                {/* COLUMNA IZQUIERDA: IMAGEN */}
                <Grid item xs={12} md={6} sx={{ 
                    bgcolor: 'black', 
                    position: 'relative', 
                    height: isMobile ? 250 : '100%',
                    order: isMobile ? 1 : 1 
                }}>
                    {selectedBathroom.imagen && !/via\.placeholder\.com/.test(selectedBathroom.imagen) ? (
                        <Box
                            component="img"
                            src={getFullImageUrl(selectedBathroom.imagen)}
                            alt={selectedBathroom.nombre}
                            sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                                opacity: 0.95
                            }}
                        />
                    ) : (
                        <Box
                            sx={{
                                width: '100%',
                                height: '100%',
                                bgcolor: '#0a1929',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <BathroomIcon sx={{ fontSize: 80, color: 'rgba(255,255,255,0.2)' }} />
                        </Box>
                    )}
                    
                    {/* Overlay inferior con info rápida */}
                    <Box sx={{
                        position: 'absolute',
                        bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                    }}>
                        {selectedBathroom.capacidad > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PeopleIcon sx={{ color: 'white' }} />
                                <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
                                    {selectedBathroom.capacidad} cubículos
                                </Typography>
                            </Box>
                        )}
                        {selectedBathroom.acceso_discapacidad && (
                            <Chip 
                                icon={<Box component="span" sx={{ fontSize: '1rem', mr: -0.5 }}>♿</Box>} 
                                label="Accesible" 
                                size="small" 
                                color="success"
                                sx={{ color: 'white', fontWeight: 'bold', height: 24 }}
                            />
                        )}
                        {selectedBathroom.disponibilidad === 'En mantenimiento' && (
                             <Chip label="Mantenimiento" color="error" size="small" sx={{ height: 24 }} />
                        )}
                    </Box>
                </Grid>

                {/* COLUMNA DERECHA: INFO Y DETALLES */}
                <Grid item xs={12} md={6} sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    order: isMobile ? 2 : 2,
                    bgcolor: '#0f172a', /* Dark slate background */
                    color: 'white'
                }}>
                     <Box sx={{ p: 3, overflowY: 'auto', flexGrow: 1 }}>
                        {/* Descripción */}
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontWeight: 'bold', mb: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.75rem' }}>
                                DESCRIPCIÓN
                            </Typography>
                            <Typography variant="body1" sx={{ lineHeight: 1.6, color: '#e2e8f0' }}>
                                {selectedBathroom.descripcion || "No hay información adicional disponible para este baño."}
                            </Typography>
                        </Box>

                        <Divider sx={{ mb: 4, borderColor: 'rgba(255,255,255,0.1)' }} />

                        {/* Ubicación Visual */}
                        <Box>
                            <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontWeight: 'bold', mb: 2, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.75rem' }}>
                                UBICACIÓN EN CAMPUS
                            </Typography>
                            
                             <Grid container spacing={2}>
                                {selectedBathroom.floor && (
                                    <Grid item xs={6}>
                                        <Box 
                                            onClick={() => {
                                                if (selectedBathroom.floor.imagen) {
                                                    setFullImageSrc(getFullImageUrl(selectedBathroom.floor.imagen))
                                                    setFullImageAlt(selectedBathroom.floor.nombre_piso)
                                                    setFullImageOpen(true)
                                                }
                                            }}
                                            sx={{ 
                                                cursor: selectedBathroom.floor.imagen ? 'pointer' : 'default',
                                                borderRadius: 2, 
                                                border: '1px solid', 
                                                borderColor: 'rgba(255,255,255,0.1)', 
                                                overflow: 'hidden', 
                                                height: 120, 
                                                bgcolor: '#1e293b',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    borderColor: selectedBathroom.floor.imagen ? 'white' : 'rgba(255,255,255,0.1)',
                                                    transform: selectedBathroom.floor.imagen ? 'translateY(-2px)' : 'none',
                                                    boxShadow: selectedBathroom.floor.imagen ? '0 4px 12px rgba(0,0,0,0.5)' : 'none'
                                                }
                                            }}
                                        >
                                            {selectedBathroom.floor.imagen ? (
                                                <Box component="img" src={getFullImageUrl(selectedBathroom.floor.imagen)} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><LocationIcon sx={{ color: '#475569' }} /></Box>
                                            )}
                                        </Box>
                                        <Typography variant="caption" sx={{ mt: 1, display: 'block', fontWeight: 600, color: '#e2e8f0' }}>
                                            {selectedBathroom.floor.nombre_piso}
                                        </Typography>
                                    </Grid>
                                )}
                                {selectedBathroom.building && (
                                    <Grid item xs={6}>
                                         <Box 
                                            onClick={() => {
                                                if (selectedBathroom.building.imagen) {
                                                    setFullImageSrc(getFullImageUrl(selectedBathroom.building.imagen))
                                                    setFullImageAlt(selectedBathroom.building.nombre_edificio)
                                                    setFullImageOpen(true)
                                                }
                                            }}
                                            sx={{ 
                                                cursor: selectedBathroom.building.imagen ? 'pointer' : 'default',
                                                borderRadius: 2, 
                                                border: '1px solid', 
                                                borderColor: 'rgba(255,255,255,0.1)', 
                                                overflow: 'hidden', 
                                                height: 120, 
                                                bgcolor: '#1e293b',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    borderColor: selectedBathroom.building.imagen ? 'white' : 'rgba(255,255,255,0.1)',
                                                    transform: selectedBathroom.building.imagen ? 'translateY(-2px)' : 'none',
                                                    boxShadow: selectedBathroom.building.imagen ? '0 4px 12px rgba(0,0,0,0.5)' : 'none'
                                                }
                                            }}
                                        >
                                            {selectedBathroom.building.imagen ? (
                                                <Box component="img" src={getFullImageUrl(selectedBathroom.building.imagen)} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><BuildingIcon sx={{ color: '#475569' }} /></Box>
                                            )}
                                        </Box>
                                        <Typography variant="caption" sx={{ mt: 1, display: 'block', fontWeight: 600, color: '#e2e8f0' }}>
                                            {selectedBathroom.building.nombre_edificio}
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                     </Box>

                     {/* Botones Fijos Abajo en Columna Derecha */}
                     <Box sx={{ p: 2, borderTop: 1, borderColor: 'rgba(255,255,255,0.15)', bgcolor: '#0f172a' }}>
                        <Grid container spacing={2}>
                            <Grid item xs={4}>
                                <Button
                                    variant="outlined"
                                    onClick={() => {
                                      setBathroomDetailOpen(false)
                                      setSelectedBathroom(null)
                                    }}
                                    fullWidth
                                    size="large"
                                    sx={{ 
                                        color: '#cbd5e1', 
                                        borderColor: 'rgba(255,255,255,0.2)',
                                        '&:hover': { borderColor: 'white', color: 'white', bgcolor: 'rgba(255,255,255,0.05)' } 
                                    }}
                                >
                                    Cerrar
                                </Button>
                            </Grid>
                            <Grid item xs={8}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    size="large"
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
                                    sx={{ 
                                        bgcolor: '#2563eb',
                                        '&:hover': { bgcolor: '#1d4ed8' },
                                        fontWeight: 700
                                    }}
                                >
                                    IR AHORA
                                </Button>
                            </Grid>
                        </Grid>
                     </Box>
                </Grid>
               </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Modal para Imagen Completa (Zoom) */}
      <Dialog
        open={fullImageOpen}
        onClose={() => setFullImageOpen(false)}
        maxWidth="xl"
        PaperProps={{
          sx: { 
            bgcolor: 'transparent', 
            boxShadow: 'none',
            overflow: 'visible',
            m: 0
          }
        }}
      >
        <Box sx={{ position: 'relative', width: 'auto', maxWidth: '90vw', maxHeight: '90vh', outline: 'none' }}>
            <IconButton
                onClick={() => setFullImageOpen(false)}
                sx={{
                    position: 'absolute',
                    top: -20,
                    right: -20,
                    color: 'white',
                    bgcolor: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 10,
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                }}
            >
                <CloseIcon />
            </IconButton>
            
            {fullImageSrc && (
                <Box
                    component="img"
                    src={fullImageSrc}
                    alt={fullImageAlt}
                    onClick={() => setFullImageOpen(false)}
                    sx={{
                        maxWidth: '100%',
                        maxHeight: '90vh',
                        display: 'block',
                        borderRadius: 2,
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        cursor: 'zoom-out'
                    }}
                />
            )}
        </Box>
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
                    image={getFullImageUrl(routeDestinationData.image)}
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
                      <PeopleIcon fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
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
          // Agregar información del edificio y piso a la sala
          const roomWithDetails = {
            ...room,
            building: selectedBuilding,
            floor: allFloors?.find(f => f.id_piso === room.id_piso)
          }
          logSearch('sala', room.id_sala, room.nombre_sala)
          setSelectedRoom(roomWithDetails)
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
              }}>
                {routeDestinationData.image && !/via\.placeholder\.com/.test(routeDestinationData.image) ? (
                  <CardMedia
                    component="img"
                    height={isMobile ? "120" : "200"}
                    image={getFullImageUrl(routeDestinationData.image)}
                    alt={routeDestinationData.name}
                    sx={{ objectFit: 'cover' }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: isMobile ? 120 : 200,
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

                  {/* Capacidad si aplica */}
                  {routeDestinationData.capacity && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <PeopleIcon fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
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
            <DialogTitle sx={{ pb: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <SchoolIcon color="primary" sx={{ fontSize: 36 }} />
                  <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                    {selectedFaculty.nombre_facultad}
                  </Typography>
                </Box>
                <IconButton onClick={() => setFacultyDetailOpen(false)} size="large">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 3, px: 3 }}>
              {/* Logo de la facultad - Centrado */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                {selectedFaculty.logo && !/via\.placeholder\.com/.test(selectedFaculty.logo) ? (
                  <Box
                    component="img"
                    src={getFullImageUrl(selectedFaculty.logo)}
                    alt={selectedFaculty.nombre_facultad}
                    sx={{
                      width: '100%',
                      maxWidth: 400,
                      height: 250,
                      objectFit: 'contain',
                      borderRadius: 2,
                      bgcolor: 'white',
                      border: 1,
                      borderColor: 'divider',
                      p: 3
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      maxWidth: 400,
                      height: 250,
                      bgcolor: 'grey.100',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 2,
                      border: 1,
                      borderColor: 'divider'
                    }}
                  >
                    <SchoolIcon sx={{ fontSize: 100, color: 'grey.400' }} />
                  </Box>
                )}
              </Box>

              {/* Información de la facultad */}
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', mb: 2 }}>
                  INFORMACIÓN
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                    Código
                  </Typography>
                  <Chip 
                    label={selectedFaculty.codigo_facultad}
                    size="medium"
                    color="primary"
                    variant="outlined"
                  />
                </Box>

                {selectedFaculty.descripcion && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                      Descripción
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.primary' }}>
                      {selectedFaculty.descripcion}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip
                    label={selectedFaculty.estado !== false ? 'Activa' : 'Inactiva'}
                    size="small"
                    color={selectedFaculty.estado !== false ? 'success' : 'error'}
                    icon={<SchoolIcon />}
                  />
                </Box>
              </Box>

              {/* Edificios asociados */}
              {(selectedFaculty.edificios?.length > 0 || selectedFaculty.id_edificio) && (
                <Box sx={{ mt: 4 }}>
                  <Divider sx={{ mb: 3 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BuildingIcon color="primary" />
                    {(selectedFaculty.edificios?.length > 1) ? 'Edificios Asociados' : 'Edificio Asociado'}
                  </Typography>
                  {(() => {
                    // Obtener lista de IDs de edificios asociados
                    const associatedBuildingIds = selectedFaculty.edificios && selectedFaculty.edificios.length > 0
                      ? selectedFaculty.edificios.map(b => Number(b.id_edificio))
                      : (selectedFaculty.id_edificio ? [Number(selectedFaculty.id_edificio)] : [])
                    
                    // Buscar los objetos completos de edificios
                    const associatedBuildings = (buildings || []).filter(b => associatedBuildingIds.includes(Number(b.id_edificio)))
                    
                    if (associatedBuildings.length === 0) return (
                      <Alert severity="info">
                        No se encontró información de edificios asociados
                      </Alert>
                    )

                    return (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {associatedBuildings.map((associatedBuilding) => (
                          <Card key={associatedBuilding.id_edificio} variant="outlined" sx={{ overflow: 'hidden', boxShadow: 1 }}>
                            <Grid container>
                              {associatedBuilding.imagen && !/via\.placeholder\.com/.test(associatedBuilding.imagen) ? (
                                <Grid item xs={12} sm={5}>
                                  <CardMedia
                                    component="img"
                                    height="220"
                                    image={getFullImageUrl(associatedBuilding.imagen)}
                                    alt={associatedBuilding.nombre_edificio}
                                    sx={{ objectFit: 'cover', height: '100%', minHeight: 220 }}
                                  />
                                </Grid>
                              ) : (
                                <Grid item xs={12} sm={5}>
                                  <Box
                                    sx={{
                                      height: 220,
                                      bgcolor: 'grey.100',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <BuildingIcon sx={{ fontSize: 80, color: 'grey.400' }} />
                                  </Box>
                                </Grid>
                              )}
                              <Grid item xs={12} sm={7}>
                                <CardContent sx={{ p: 3 }}>
                                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 1.5 }}>
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

                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
                                    <Chip
                                      label={associatedBuilding.estado ? 'Activo' : 'Inactivo'}
                                      size="small"
                                      color={associatedBuilding.estado ? 'success' : 'error'}
                                    />
                                  </Box>

                                  {associatedBuilding.distance !== undefined && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5, p: 1.5, bgcolor: 'primary.50', borderRadius: 1 }}>
                                      <WalkIcon color="primary" fontSize="small" />
                                      <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                                        A {associatedBuilding.distance < 1000 
                                          ? `${associatedBuilding.distance.toFixed(0)} metros` 
                                          : `${(associatedBuilding.distance / 1000).toFixed(2)} km`} de tu ubicación
                                      </Typography>
                                    </Box>
                                  )}

                                  <Button
                                    variant="contained"
                                    startIcon={<BuildingIcon />}
                                    size="medium"
                                    onClick={() => {
                                      setSelectedBuilding(associatedBuilding)
                                      setBuildingDetailOpen(true)
                                      setFacultyDetailOpen(false)
                                    }}
                                    fullWidth
                                  >
                                    Ver detalles del edificio
                                  </Button>
                                </CardContent>
                              </Grid>
                            </Grid>
                          </Card>
                        ))}
                      </Box>
                    )
                  })()}
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2.5, gap: 1, borderTop: 1, borderColor: 'divider' }}>
              <Button
                variant="outlined"
                onClick={() => setFacultyDetailOpen(false)}
                size="large"
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
        destinationImage={routeDestinationData?.image}
        destinationType={routeDestinationData?.type}
      />
    </>
  )
}
