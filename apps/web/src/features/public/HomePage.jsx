import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
} from '@mui/icons-material'

import api from '../../lib/api'

// ✅ IMPORTAR LEAFLET SI ESTÁ INSTALADO, SI NO, COMENTAR
// import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
// import L from 'leaflet'
// import 'leaflet/dist/leaflet.css'
// import 'leaflet-routing-machine'
// import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'

// Componente para manejar la ruta en el mapa - COMENTADO POR AHORA
/*
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
*/

export default function HomePage() {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.down('md'))
  const [activeTab, setActiveTab] = useState(0)
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

  // Query para buscar salas
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search-rooms', searchQuery],
    queryFn: async () => {
      const res = await api.get('/rooms')
      const rooms = res.data.data
      
      const query = searchQuery.toLowerCase().trim()
      
      // Filtrar por nombre O acrónimo automáticamente
      const filtered = rooms.filter(room => {
        const nombre = room.nombre_sala?.toLowerCase() || ''
        const acronimo = room.acronimo?.toLowerCase() || ''
        
        // Busca en ambos campos
        return nombre.includes(query) || acronimo.includes(query)
      })
      
      // Agregar información de edificio y piso
      const enriched = filtered.map(room => {
        const floor = allFloors?.find(f => f.id_piso === room.id_piso)
        const building = buildings?.find(b => b.id_edificio === floor?.id_edificio)
        return {
          ...room,
          floor,
          building,
        }
      })
      
      // Si hay ubicación del usuario, calcular distancia
      if (userLocation && enriched.length > 0) {
        return enriched.map(room => ({
          ...room,
          distance: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            room.cord_latitud,
            room.cord_longitud
          )
        })).sort((a, b) => a.distance - b.distance)
      }
      
      return enriched
    },
    enabled: searchTriggered && searchQuery.length > 0 && activeTab === 1 && !!allFloors, // Solo buscar salas
  })

  // Query para buscar edificios (busca automáticamente por nombre Y acrónimo)
  const { data: buildingSearchResults, isLoading: isSearchingBuildings } = useQuery({
    queryKey: ['search-buildings', searchQuery],
    queryFn: async () => {
      if (!buildings) return []
      
      const query = searchQuery.toLowerCase().trim()
      
      // Filtrar por nombre O acrónimo automáticamente
      const filtered = buildings.filter(building => {
        const nombre = building.nombre_edificio?.toLowerCase() || ''
        const acronimo = building.acronimo?.toLowerCase() || ''
        
        // Busca en ambos campos
        return nombre.includes(query) || acronimo.includes(query)
      })
      
      // Si hay ubicación del usuario, calcular distancia y ordenar
      if (userLocation && filtered.length > 0) {
        return filtered.map(building => ({
          ...building,
          distance: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            building.cord_latitud,
            building.cord_longitud
          )
        })).sort((a, b) => a.distance - b.distance)
      }
      
      return filtered
    },
    enabled: searchTriggered && searchQuery.length > 0 && activeTab === 0 && !!buildings, // Solo buscar edificios
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

  // Query para obtener facultades
  const { data: allFaculties } = useQuery({
    queryKey: ['all-faculties'],
    queryFn: async () => {
      const res = await api.get('/faculties')
      return res.data.data
    },
  })

  // Query para buscar baños
  const { data: bathroomSearchResults, isLoading: isSearchingBathrooms } = useQuery({
    queryKey: ['search-bathrooms', searchQuery],
    queryFn: async () => {
      if (!allBathrooms) return []
      
      const filtered = allBathrooms.filter(bathroom => 
        bathroom.nombre.toLowerCase().includes(searchQuery.toLowerCase())
      )
      
      const enriched = filtered.map(bathroom => {
        const floor = allFloors?.find(f => f.id_piso === bathroom.id_piso)
        const building = buildings?.find(b => b.id_edificio === bathroom.id_edificio)
        return {
          ...bathroom,
          floor,
          building,
        }
      })
      
      if (userLocation && enriched.length > 0) {
        return enriched.map(bathroom => ({
          ...bathroom,
          distance: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            bathroom.cord_latitud,
            bathroom.cord_longitud
          )
        })).sort((a, b) => a.distance - b.distance)
      }
      
      return enriched
    },
    enabled: searchTriggered && searchQuery.length > 0 && activeTab === 3 && !!allBathrooms,
  })

  // Query para buscar facultades
  const { data: facultySearchResults, isLoading: isSearchingFaculties } = useQuery({
    queryKey: ['search-faculties', searchQuery],
    queryFn: async () => {
      if (!allFaculties) return []
      
      const query = searchQuery.toLowerCase().trim()
      
      // Filtrar por nombre O código automáticamente
      const filtered = allFaculties.filter(faculty => {
        const nombre = faculty.nombre_facultad?.toLowerCase() || ''
        const codigo = faculty.codigo_facultad?.toLowerCase() || ''
        
        // Busca en ambos campos
        return nombre.includes(query) || codigo.includes(query)
      })
      
      return filtered
    },
    enabled: searchTriggered && searchQuery.length > 0 && activeTab === 2 && !!allFaculties,
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

  const searchOptions = [
    { id: 'edificio', label: 'Edificio', icon: <BuildingIcon /> },
    { id: 'sala', label: 'Sala', icon: <RoomIcon /> },
    { id: 'facultad', label: 'Facultad', icon: <SchoolIcon /> },
    { id: 'baño', label: 'Baño', icon: <BathroomIcon /> }
  ]

  const handleSearch = () => {
    if (activeTab === 0 && searchQuery.trim()) { // Edificios
      setSearchTriggered(true)
      console.log(`Buscando edificio: ${searchQuery}`)
    } else if (activeTab === 1 && searchQuery.trim()) { // Salas
      setSearchTriggered(true)
      console.log(`Buscando sala: ${searchQuery}`)
    } else if (activeTab === 2 && searchQuery.trim()) { // Facultades
      setSearchTriggered(true)
      console.log(`Buscando facultad: ${searchQuery}`)
    } else if (activeTab === 3 && searchQuery.trim()) { // Baños
      setSearchTriggered(true)
      console.log(`Buscando baño: ${searchQuery}`)
    } else {
      setSnackbar({
        open: true,
        message: 'Por favor ingresa un término de búsqueda',
        severity: 'info'
      })
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4 }}>
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

      {/* Header / Navbar */}
      <AppBar position="static" elevation={1} sx={{ bgcolor: 'white', color: 'text.primary' }}>
        <Toolbar sx={{ 
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 1 : 0,
          py: isMobile ? 1 : 0,
          minHeight: isMobile ? 'auto' : 64,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon color="primary" sx={{ fontSize: isMobile ? 24 : 32 }} />
            <Typography 
              variant={isMobile ? 'body1' : 'h6'} 
              component="h1" 
              sx={{ fontWeight: 'bold', color: 'text.primary' }}
            >
              Geolocalización Campus
            </Typography>
          </Box>

          {/* Search Tabs - Responsive */}
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant={isMobile ? "scrollable" : "standard"}
            scrollButtons={isMobile ? "auto" : false}
            sx={{ 
              '& .MuiTab-root': { 
                minHeight: isMobile ? 40 : 48,
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                minWidth: isMobile ? 60 : 'auto',
                px: isMobile ? 1 : 2,
              },
              bgcolor: 'grey.100',
              borderRadius: 2,
              p: 0.5,
              minWidth: isMobile ? '100%' : 'auto',
            }}
          >
            {searchOptions.map((option) => (
              <Tab
                key={option.id}
                icon={option.icon}
                label={isMobile ? '' : option.label}
                iconPosition="start"
                sx={{
                  textTransform: 'none',
                  fontWeight: 'medium',
                  borderRadius: 1.5,
                  '&.Mui-selected': {
                    bgcolor: 'white',
                    boxShadow: 1
                  }
                }}
              />
            ))}
          </Tabs>

          {/* Location & Login Buttons - Responsive */}
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            alignItems: 'center',
            width: isMobile ? '100%' : 'auto',
            flexDirection: isMobile ? 'column' : 'row',
          }}>
            {userLocation ? (
              <Tooltip title={locationAccuracy ? `Precisión: ${Math.round(locationAccuracy)}m` : 'Ubicación activada'}>
                <Button
                  size={isMobile ? "small" : "medium"}
                  startIcon={<MyLocationIcon />}
                  sx={{ 
                    color: 'success.main', 
                    textTransform: 'none',
                    width: isMobile ? '100%' : 'auto',
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                  }}
                >
                  {isMobile ? 'GPS ✓' : 'Ubicación activada'}
                  {locationAccuracy && locationAccuracy <= 20 && (
                    <Chip 
                      label={`${Math.round(locationAccuracy)}m`}
                      size="small" 
                      color="success" 
                      sx={{ ml: 1, height: isMobile ? 16 : 20 }}
                    />
                  )}
                </Button>
              </Tooltip>
            ) : (
              <Button
                size={isMobile ? "small" : "medium"}
                startIcon={<MyLocationIcon />}
                onClick={handleRetryLocation}
                sx={{ 
                  color: 'warning.main', 
                  textTransform: 'none',
                  width: isMobile ? '100%' : 'auto',
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                }}
              >
                {isMobile ? 'Activar GPS' : 'Activar ubicación'}
              </Button>
            )}

            <Button 
              variant="contained"
              onClick={() => navigate('/login')}
              size={isMobile ? "small" : "medium"}
              sx={{ 
                bgcolor: 'grey.900',
                '&:hover': { bgcolor: 'grey.800' },
                width: isMobile ? '100%' : 'auto',
                textTransform: 'none',
                fontWeight: 'bold',
              }}
            >
              {isMobile ? 'Login' : 'Iniciar Sesión'}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content - Responsive */}
      <Container maxWidth="lg" sx={{ py: isMobile ? 4 : 8 }}>
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: isMobile ? 4 : 8 }}>
          <Typography 
            variant={isMobile ? "h4" : "h3"} 
            component="h2" 
            gutterBottom 
            sx={{ fontWeight: 'bold', mb: 2 }}
          >
            Encuentra lugares en campus
          </Typography>
          <Typography 
            variant={isMobile ? "body2" : "h6"} 
            color="text.secondary" 
            sx={{ mb: 6 }}
          >
            Busca edificios, salas, facultades o baños
          </Typography>

          {/* Search Bar - Responsive */}
          <Box sx={{ maxWidth: isMobile ? '100%' : 800, mx: 'auto', px: isMobile ? 2 : 0 }}>
            <Paper elevation={2} sx={{ 
              p: isMobile ? 1 : 1, 
              display: 'flex', 
              gap: 1,
              flexDirection: isMobile ? 'column' : 'row',
            }}>
              <TextField
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Buscar ${searchOptions[activeTab].label.toLowerCase()}...`}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                size={isMobile ? "small" : "medium"}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { border: 'none' } }}
              />
              <Button 
                variant="contained"
                size={isMobile ? "small" : "large"}
                onClick={handleSearch}
                sx={{ 
                  px: isMobile ? 2 : 4,
                  width: isMobile ? '100%' : 'auto',
                  textTransform: 'none',
                  fontWeight: 'bold',
                }}
                disabled={!searchQuery.trim()}
              >
                {isMobile ? 'Buscar' : 'BUSCAR'}
              </Button>
            </Paper>
          </Box>
        </Box>

        {/* Search Results Section - Edificios */}
        {searchTriggered && activeTab === 0 && (
          <Box sx={{ mb: isMobile ? 4 : 6 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
              Resultados de búsqueda - Edificios
            </Typography>

            {isSearchingBuildings ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : buildingSearchResults?.length > 0 ? (
              <Grid container spacing={3}>
                {buildingSearchResults.map((building) => (
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
                        <CardMedia
                          component="img"
                          height="200"
                          image={building.imagen.startsWith('http') ? building.imagen : `http://localhost:4000${building.imagen}`}
                          alt={building.nombre_edificio}
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

                        {/* Coordenadas */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <LocationIcon color="action" fontSize="small" />
                          <Typography variant="body2" color="text.secondary">
                            <strong>Latitud:</strong> {building.cord_latitud}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <LocationIcon color="action" fontSize="small" />
                          <Typography variant="body2" color="text.secondary">
                            <strong>Longitud:</strong> {building.cord_longitud}
                          </Typography>
                        </Box>

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
            ) : (
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <SearchIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No se encontraron edificios
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Intenta con otro nombre o acrónimo, o verifica la ortografía
                </Typography>
              </Paper>
            )}
          </Box>
        )}

        {/* Search Results Section - Salas */}
        {searchTriggered && activeTab === 1 && (
          <Box sx={{ mb: isMobile ? 4 : 6 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
              Resultados de búsqueda
            </Typography>

            {isSearching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : searchResults?.length > 0 ? (
              <Grid container spacing={3}>
                {searchResults.map((room) => (
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
                        <CardMedia
                          component="img"
                          height="200"
                          image={room.imagen.startsWith('http') ? room.imagen : `http://localhost:4000${room.imagen}`}
                          alt={room.nombre_sala}
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
                          <ImageIcon sx={{ fontSize: 80, color: 'grey.400' }} />
                        </Box>
                      )}

                      <CardContent sx={{ flexGrow: 1 }}>
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
            ) : (
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <SearchIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No se encontraron salas
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Intenta con otro nombre o verifica la ortografía
                </Typography>
              </Paper>
            )}
          </Box>
        )}

        {/* Search Results Section - Facultades */}
        {searchTriggered && activeTab === 2 && (
          <Box sx={{ mb: isMobile ? 4 : 6 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
              Resultados de búsqueda - Facultades
            </Typography>

            {isSearchingFaculties ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : facultySearchResults?.length > 0 ? (
              <Grid container spacing={3}>
                {facultySearchResults.map((faculty) => {
                  // Get the associated building
                  const associatedBuilding = faculty.id_edificio
                    ? (buildings || []).find(b => Number(b.id_edificio) === Number(faculty.id_edificio))
                    : null

                  return (
                    <Grid item xs={12} key={faculty.codigo_facultad}>
                      <Card 
                        sx={{ 
                          boxShadow: 2,
                          borderRadius: 2,
                          transition: 'all 0.3s',
                          '&:hover': {
                            boxShadow: 6,
                            transform: 'translateY(-4px)'
                          }
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          {/* Faculty info: Logo left, Description right */}
                          <Grid container spacing={3} sx={{ mb: 3 }}>
                            {/* Logo on the left */}
                            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {faculty.logo ? (
                                <Box
                                  component="img"
                                  src={faculty.logo.startsWith('http') ? faculty.logo : `http://localhost:4000${faculty.logo}`}
                                  alt={faculty.nombre_facultad}
                                  sx={{
                                    maxWidth: '100%',
                                    maxHeight: 200,
                                    objectFit: 'contain',
                                    borderRadius: 1,
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: 150,
                                    height: 150,
                                    bgcolor: 'grey.200',
                                    borderRadius: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Typography variant="body2" color="text.secondary">
                                    Sin logo
                                  </Typography>
                                </Box>
                              )}
                            </Grid>

                            {/* Description on the right */}
                            <Grid item xs={12} sm={9}>
                              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                                {faculty.nombre_facultad}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Código: {faculty.codigo_facultad}
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
                                {faculty.descripcion || 'Sin descripción'}
                              </Typography>
                            </Grid>
                          </Grid>

                          {/* Associated building(s) below */}
                          {associatedBuilding && (
                            <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 3 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
                                Edificio Asociado
                              </Typography>
                              <Card sx={{ maxWidth: 300, bgcolor: 'grey.50' }}>
                                <CardMedia
                                  component="img"
                                  height="140"
                                  image={
                                    associatedBuilding.imagen && !/via\.placeholder\.com/.test(associatedBuilding.imagen)
                                      ? associatedBuilding.imagen.startsWith('http')
                                        ? associatedBuilding.imagen
                                        : `http://localhost:4000${associatedBuilding.imagen}`
                                      : 'https://via.placeholder.com/300x200?text=Sin+imagen'
                                  }
                                  alt={associatedBuilding.nombre_edificio}
                                />
                                <CardContent>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                    {associatedBuilding.nombre_edificio}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {associatedBuilding.acronimo || 'Sin acrónimo'}
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            ) : (
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <SearchIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No se encontraron facultades
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Intenta con otro nombre o código, o verifica la ortografía
                </Typography>
              </Paper>
            )}
          </Box>
        )}

        {/* Search Results Section - Baños */}
        {searchTriggered && activeTab === 3 && (
          <Box sx={{ mb: isMobile ? 4 : 6 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
              Resultados de búsqueda - Baños
            </Typography>

            {isSearchingBathrooms ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : bathroomSearchResults?.length > 0 ? (
              <Grid container spacing={3}>
                {bathroomSearchResults.map((bathroom) => (
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
                        <CardMedia
                          component="img"
                          height="200"
                          image={bathroom.imagen.startsWith('http') ? bathroom.imagen : `http://localhost:4000${bathroom.imagen}`}
                          alt={bathroom.nombre}
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
                          <BathroomIcon sx={{ fontSize: 80, color: 'grey.400' }} />
                        </Box>
                      )}

                      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
            ) : (
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <SearchIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No se encontraron baños
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Intenta con otro nombre o verifica la ortografía
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
              <Grid container spacing={isMobile ? 1 : 3}>
                {/* Columna izquierda: imágenes (Sala, Piso, Edificio) */}
                <Grid item xs={12} md={6}>
                  {/* Sala - Imagen grande */}
                  {selectedRoom.imagen && !/via\.placeholder\.com/.test(selectedRoom.imagen) ? (
                    <Box
                      component="img"
                      src={selectedRoom.imagen.startsWith('http') ? selectedRoom.imagen : `http://localhost:4000${selectedRoom.imagen}`}
                      alt={selectedRoom.nombre_sala}
                      sx={{
                        width: '100%',
                        maxHeight: 300,
                        objectFit: 'cover',
                        borderRadius: 2,
                        mb: 2
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
                        borderRadius: 2,
                        mb: 2
                      }}
                    >
                      <ImageIcon sx={{ fontSize: 80, color: 'grey.400' }} />
                    </Box>
                  )}

                  {/* Piso - Imagen */}
                  {selectedRoom.floor && (
                    <>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Piso</Typography>
                      {selectedRoom.floor.imagen && !/via\.placeholder\.com/.test(selectedRoom.floor.imagen) ? (
                        <Box
                          component="img"
                          src={selectedRoom.floor.imagen.startsWith('http') ? selectedRoom.floor.imagen : `http://localhost:4000${selectedRoom.floor.imagen}`}
                          alt={selectedRoom.floor.nombre_piso}
                          sx={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 2, mb: 2 }}
                        />
                      ) : (
                        <Box sx={{ width: '100%', height: 140, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, mb: 2 }}>
                          <LocationIcon sx={{ fontSize: 60, color: 'grey.400' }} />
                        </Box>
                      )}
                    </>
                  )}

                  {/* Edificio - Imagen */}
                  {selectedRoom.building && (
                    <>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Edificio</Typography>
                      {selectedRoom.building.imagen && !/via\.placeholder\.com/.test(selectedRoom.building.imagen) ? (
                        <Box
                          component="img"
                          src={selectedRoom.building.imagen.startsWith('http') ? selectedRoom.building.imagen : `http://localhost:4000${selectedRoom.building.imagen}`}
                          alt={selectedRoom.building.nombre_edificio}
                          sx={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 2 }}
                        />
                      ) : (
                        <Box sx={{ width: '100%', height: 140, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2 }}>
                          <BuildingIcon sx={{ fontSize: 60, color: 'grey.400' }} />
                        </Box>
                      )}
                    </>
                  )}
                </Grid>

                {/* Columna derecha: info Sala > Piso > Edificio */}
                <Grid item xs={12} md={6}>
                  {/* Sala */}
                  <Typography variant="overline" color="text.secondary">Sala</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>{selectedRoom.nombre_sala}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {selectedRoom.acronimo && (
                      <Chip label={selectedRoom.acronimo} size="small" color="primary" variant="outlined" />
                    )}
                    <Chip label={selectedRoom.tipo_sala || 'Sin tipo'} size="small" color="secondary" variant="outlined" />
                    <Chip
                      label={selectedRoom.estado ? 'Activa' : 'Inactiva'}
                      color={selectedRoom.estado ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PeopleIcon color="action" fontSize="small" />
                    <Typography variant="body2"><strong>Capacidad:</strong> {selectedRoom.capacidad} personas</Typography>
                  </Box>
                  {selectedRoom.distance !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, mb: 3 }}>
                      <WalkIcon color="primary" fontSize="small" />
                      <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                        A {selectedRoom.distance < 1000 ? `${selectedRoom.distance} metros` : `${(selectedRoom.distance / 1000).toFixed(2)} km`} de ti
                      </Typography>
                    </Box>
                  )}

                  {/* Piso */}
                  {selectedRoom.floor && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="overline" color="text.secondary">Piso</Typography>
                      <Typography variant="body2">{selectedRoom.floor.nombre_piso}{selectedRoom.floor.numero_piso != null ? ` • N° ${selectedRoom.floor.numero_piso}` : ''}</Typography>
                    </Box>
                  )}

                  {/* Edificio */}
                  {selectedRoom.building && (
                    <Box>
                      <Typography variant="overline" color="text.secondary">Edificio</Typography>
                      <Typography variant="body2">{selectedRoom.building.nombre_edificio}{selectedRoom.building.acronimo ? ` (${selectedRoom.building.acronimo})` : ''}</Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>
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
                onClick={() => setMapOpen(true)}
                fullWidth={isMobile}
              >
                Mostrar mapa
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

              {/* Mapa - USAR GOOGLE MAPS EN VEZ DE LEAFLET */}
              <Box sx={{ 
                flexGrow: 1, 
                position: 'relative', 
                borderRadius: 2, 
                overflow: 'hidden',
                minHeight: isMobile ? 300 : 'auto',
              }}>
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${userLocation.latitude},${userLocation.longitude}&destination=${routeDestination.lat},${routeDestination.lng}&mode=walking`}
                  title="Mapa de ruta"
                />
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
          setFloorRoomCarousels({})
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        {selectedBuilding && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                  {selectedBuilding.nombre_edificio}
                  {selectedBuilding.acronimo && (
                    <Chip 
                      label={selectedBuilding.acronimo} 
                      color="primary" 
                      size="small" 
                      sx={{ ml: 2 }}
                    />
                  )}
                </Typography>
                <IconButton onClick={() => setBuildingDetailOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              {/* Imagen del edificio - Mitad superior */}
              <Box sx={{ mb: 3 }}>
                {selectedBuilding.imagen && !/via\.placeholder\.com/.test(selectedBuilding.imagen) ? (
                  <Box
                    component="img"
                    src={selectedBuilding.imagen.startsWith('http') ? selectedBuilding.imagen : `http://localhost:4000${selectedBuilding.imagen}`}
                    alt={selectedBuilding.nombre_edificio}
                    sx={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: '40vh',
                      objectFit: 'cover',
                      borderRadius: 2,
                      boxShadow: 3
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
                    <BuildingIcon sx={{ fontSize: 120, color: 'grey.400' }} />
                  </Box>
                )}
                
                {/* Información del edificio */}
                <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Ubicación:</strong> Lat: {selectedBuilding.cord_latitud}, Lon: {selectedBuilding.cord_longitud}
                  </Typography>
                </Box>
              </Box>

              {/* Pisos y Salas - Mitad inferior */}
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Pisos y Salas
              </Typography>

              {buildingFloors && buildingFloors.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {buildingFloors.map((floor) => {
                    const rooms = getRoomsForFloor(floor.id_piso)
                    const carouselIndex = floorRoomCarousels[floor.id_piso] || 0
                    const visibleRooms = rooms.slice(carouselIndex, carouselIndex + 3)
                    
                    return (
                      <Paper key={floor.id_piso} elevation={2} sx={{ p: 2 }}>
                        {/* Nombre del piso con botón para ver foto */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {floor.nombre_piso}
                            {floor.numero_piso != null && ` - Piso ${floor.numero_piso}`}
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ImageIcon />}
                            onClick={() => {
                              setSelectedFloorImage(floor)
                              setFloorImageOpen(true)
                            }}
                          >
                            Ver foto del piso
                          </Button>
                        </Box>

                        <Divider sx={{ mb: 2 }} />

                        {/* Salas del piso con carrusel */}
                        {rooms.length > 0 ? (
                          <Box sx={{ position: 'relative' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {/* Botón anterior */}
                              <IconButton
                                size="small"
                                onClick={() => handleCarouselChange(floor.id_piso, 'prev')}
                                disabled={carouselIndex === 0}
                                sx={{ 
                                  bgcolor: 'background.paper',
                                  boxShadow: 1,
                                  '&:hover': { bgcolor: 'grey.100' }
                                }}
                              >
                                <ChevronLeftIcon />
                              </IconButton>

                              {/* Grid de salas visibles */}
                              <Grid container spacing={2} sx={{ flex:  1 }}>
                                {visibleRooms.map((room) => (
                                  <Grid item xs={4} key={room.id_sala}>
                                    <Tooltip title={room.nombre_sala} arrow placement="top">
                                      <Box
                                        sx={{
                                          position: 'relative',
                                          paddingTop: '100%',
                                          borderRadius: 1,
                                          overflow: 'hidden',
                                          cursor: 'pointer',
                                          transition: 'all 0.3s',
                                          '&:hover': {
                                                                                       transform: 'scale(1.05)',
                                            boxShadow: 4,
                                            '& .room-name-overlay': {
                                              opacity: 1
                                            }
                                          }
                                        }}
                                      >
                                        {room.imagen && !/via\.placeholder\.com/.test(room.imagen) ? (
                                          <Box
                                            component="img"
                                            src={room.imagen.startsWith('http') ? room.imagen : `http://localhost:4000${room.imagen}`}
                                            alt={room.nombre_sala}
                                            sx={{
                                              position: 'absolute',
                                              top: 0,
                                              left: 0,
                                              width: '100%',
                                              height: '100%',
                                              objectFit: 'cover'
                                            }}
                                          />
                                        ) : (
                                          <Box
                                            sx={{
                                              position: 'absolute',
                                              top: 0,
                                              left: 0,
                                              width: '100%',
                                              height: '100%',
                                              bgcolor: 'grey.200',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center'
                                            }}
                                          >
                                            <RoomIcon sx={{ fontSize: 40, color: 'grey.400' }} />
                                          </Box>
                                        )}
                                        
                                        {/* Overlay con nombre de sala */}
                                        <Box
                                          className="room-name-overlay"
                                          sx={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            bgcolor: 'rgba(0, 0, 0, 0.7)',
                                            color: 'white',
                                            p: 1,
                                            opacity: 0,
                                            transition: 'opacity 0.3s'
                                          }}
                                        >
                                          <Typography 
                                            variant="caption" 
                                            sx={{ 
                                              fontWeight: 'bold',
                                              display: 'block',
                                              textAlign: 'center',
                                              fontSize: '0.7rem'
                                            }}
                                          >
                                            {room.nombre_sala}
                                          </Typography>
                                        </Box>
                                      </Box>
                                    </Tooltip>
                                  </Grid>
                                ))}

                                {/* Espacios vacíos si hay menos de 3 salas */}
                                {visibleRooms.length < 3 && Array.from({ length: 3 - visibleRooms.length }).map((_, idx) => (
                                  <Grid item xs={4} key={`empty-${idx}`}>
                                    <Box
                                      sx={{
                                        paddingTop: '100%',
                                        bgcolor: 'grey.100',
                                        borderRadius: 1,
                                        border: '2px dashed',
                                        borderColor: 'grey.300'
                                      }}
                                    />
                                  </Grid>
                                ))}
                              </Grid>

                              {/* Botón siguiente */}
                              <IconButton
                                size="small"
                                onClick={() => handleCarouselChange(floor.id_piso, 'next')}
                                disabled={carouselIndex >= rooms.length - 3}
                                sx={{ 
                                  bgcolor: 'background.paper',
                                  boxShadow: 1,
                                  '&:hover': { bgcolor: 'grey.100' }
                                }}
                              >
                                <ChevronRightIcon />
                              </IconButton>
                            </Box>

                            {/* Indicador de cantidad de salas */}
                            <Typography 
                              variant="caption" 
                              color="text.secondary" 
                              sx={{ display: 'block', textAlign: 'center', mt: 1 }}
                            >
                              {rooms.length} {rooms.length === 1 ? 'sala' : 'salas'} en este piso
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                            No hay salas registradas en este piso
                          </Typography>
                        )}
                      </Paper>
                    )
                  })}
                </Box>
              ) : (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    No hay pisos registrados para este edificio
                  </Typography>
                </Paper>
              )}
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
              <Button onClick={() => setBuildingDetailOpen(false)}>Cerrar</Button>
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
                        Math.pow((selectedBuilding.cord_latitud - userLocation.latitude) * 111320, 2) +
                        Math.pow((selectedBuilding.cord_longitud - userLocation.longitude) * 111320 * Math.cos(userLocation.latitude * Math.PI / 180), 2)
                      )
                    ) : undefined
                  
                  setRouteDestination({
                    lat: selectedBuilding.cord_latitud,
                    lng: selectedBuilding.cord_longitud
                  })
                  setRouteDestinationName(selectedBuilding.nombre_edificio)
                  setRouteDestinationData({
                    type: 'building',
                    name: selectedBuilding.nombre_edificio,
                    acronym: selectedBuilding.acronimo,
                    image: selectedBuilding.imagen,
                    distance: distance,
                    latitude: selectedBuilding.cord_latitud,
                    longitude: selectedBuilding.cord_longitud
                  })
                  setRouteMapOpen(true)
                  setBuildingDetailOpen(false)
                }}
                sx={{ textTransform: 'none', fontWeight: 'bold' }}
              >
                Ver Ruta
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PeopleIcon color="action" fontSize="small" />
                      <Typography variant="body2" color="text.secondary">
                        Capacidad: {routeDestinationData.capacity} personas
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Mapa - USAR GOOGLE MAPS EN VEZ DE LEAFLET */}
              <Box sx={{ 
                flexGrow: 1, 
                position: 'relative', 
                borderRadius: 2, 
                overflow: 'hidden',
                minHeight: isMobile ? 300 : 'auto',
              }}>
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${userLocation.latitude},${userLocation.longitude}&destination=${routeDestination.lat},${routeDestination.lng}&mode=walking`}
                  title="Mapa de ruta"
                />
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
    </Box>
  )
}
