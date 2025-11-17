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
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import api from '../../lib/api'
import BuildingDetailsModal from '../../components/BuildingDetailsModal'

// Fix para los iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Componente para manejar la ruta en el mapa
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
    requestUserLocation()
  }, [])

  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Tu navegador no soporta geolocalización')
      setSnackbar({
        open: true,
        message: 'Tu navegador no soporta geolocalización',
        severity: 'error'
      })
      setLocationDialog(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        setUserLocation({ latitude, longitude })
        setLocationAccuracy(accuracy)
        setLocationDialog(false)
        setSnackbar({
          open: true,
          message: `✓ Ubicación activada (precisión: ${Math.round(accuracy)}m)`,
          severity: 'success'
        })
        console.log('Ubicación del usuario:', { latitude, longitude, accuracy: `${Math.round(accuracy)}m` })
      },
      (error) => {
        let errorMessage = 'No se pudo obtener tu ubicación'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Ubicación no disponible'
            break
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado'
            break
        }
        setLocationError(errorMessage)
        setLocationDialog(false)
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: 'warning'
        })
        console.error('Error de geolocalización:', error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const handleRetryLocation = () => {
    setLocationDialog(true)
    setLocationError(null)
    requestUserLocation()
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
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Diálogo de solicitud de ubicación */}
      <Dialog
        open={locationDialog}
        onClose={() => setLocationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MyLocationIcon color="primary" />
          Activar Ubicación
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Para brindarte una mejor experiencia y ayudarte a encontrar los lugares más cercanos,
            necesitamos acceso a tu ubicación.
          </DialogContentText>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
            <Typography variant="body2" color="info.dark">
              <strong>¿Por qué necesitamos tu ubicación?</strong>
              <br />
              • Encontrar edificios y salas cercanas a ti
              <br />
              • Calcular rutas y distancias
              <br />
              • Mostrarte los baños más próximos
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLocationDialog(false)} color="inherit">
            Ahora no
          </Button>
          <Button
            onClick={requestUserLocation}
            variant="contained"
            startIcon={<MyLocationIcon />}
          >
            Activar Ubicación
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
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h6" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
              Geolocalización Campus
            </Typography>
          </Box>

          {/* Search Tabs */}
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ 
              '& .MuiTab-root': { minHeight: 48 },
              bgcolor: 'grey.100',
              borderRadius: 2,
              p: 0.5
            }}
          >
            {searchOptions.map((option, index) => (
              <Tab
                key={option.id}
                icon={option.icon}
                label={option.label}
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

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {/* Botón de estado de ubicación */}
            {userLocation ? (
              <Tooltip title={locationAccuracy ? `Precisión: ${Math.round(locationAccuracy)} metros` : 'Ubicación activada'}>
                <Button
                  size="small"
                  startIcon={<MyLocationIcon />}
                  sx={{ color: 'success.main', textTransform: 'none' }}
                >
                  Ubicación activada
                  {locationAccuracy && locationAccuracy <= 20 && (
                    <Chip 
                      label={`${Math.round(locationAccuracy)}m`}
                      size="small" 
                      color="success" 
                      sx={{ ml: 1, height: 20 }}
                    />
                  )}
                </Button>
              </Tooltip>
            ) : (
              <Button
                size="small"
                startIcon={<MyLocationIcon />}
                onClick={handleRetryLocation}
                sx={{ color: 'warning.main', textTransform: 'none' }}
              >
                Activar ubicación
              </Button>
            )}

            <Button 
              variant="contained"
              onClick={() => navigate('/login')}
              sx={{ 
                bgcolor: 'grey.900',
                '&:hover': { bgcolor: 'grey.800' }
              }}
            >
              Iniciar Sesión
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Encuentra cualquier lugar en el campus
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 6 }}>
            Busca edificios, salas, facultades o baños de forma rápida y sencilla
          </Typography>

          {/* Search Bar */}
          <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            <Paper elevation={2} sx={{ p: 1, display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Buscar ${searchOptions[activeTab].label.toLowerCase()}...`}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
                size="large"
                onClick={handleSearch}
                sx={{ px: 4 }}
                disabled={!searchQuery.trim()}
              >
                Buscar
              </Button>
            </Paper>
          </Box>
        </Box>

        {/* Search Results Section - Edificios */}
        {searchTriggered && activeTab === 0 && (
          <Box sx={{ mb: 6 }}>
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
          <Box sx={{ mb: 6 }}>
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
          <Box sx={{ mb: 6 }}>
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
          <Box sx={{ mb: 6 }}>
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
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        {selectedRoom && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                  {selectedRoom.nombre_sala}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationIcon color="action" fontSize="small" />
                        <Typography variant="body2">{selectedRoom.floor.nombre_piso}{selectedRoom.floor.numero_piso != null ? ` • N° ${selectedRoom.floor.numero_piso}` : ''}</Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Edificio */}
                  {selectedRoom.building && (
                    <Box>
                      <Typography variant="overline" color="text.secondary">Edificio</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BuildingIcon color="action" fontSize="small" />
                        <Typography variant="body2">{selectedRoom.building.nombre_edificio}{selectedRoom.building.acronimo ? ` (${selectedRoom.building.acronimo})` : ''}</Typography>
                      </Box>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2, gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => setRoomDetailOpen(false)}
              >
                Cerrar
              </Button>
              <Button
                variant="contained"
                startIcon={<LocationIcon />}
                onClick={() => setMapOpen(true)}
              >
                Mostrar en el mapa
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Popup del mapa con Google Maps */}
      <Dialog
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon color="primary" />
            <Typography variant="h6">
              Ruta hasta {selectedRoom?.nombre_sala || 'destino'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {!userLocation && (
            <Alert severity="info" sx={{ m: 2 }}>
              Activa tu ubicación para ver la ruta completa desde tu posición actual.
            </Alert>
          )}
          <Box sx={{ width: '100%', height: { xs: 400, md: 600 } }}>
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={getGoogleMapsEmbedUrl()}
              title="Mapa de ruta"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMapOpen(false)}>Cerrar</Button>
        </DialogActions>
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
      />

      {/* Modal de Mapa con Ruta */}
      <Dialog
        open={routeMapOpen}
        onClose={() => setRouteMapOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '85vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Ruta a {routeDestinationName}
            </Typography>
            <IconButton onClick={() => setRouteMapOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 2, height: '100%', display: 'flex', gap: 2 }}>
          {routeMapOpen && routeDestination && userLocation && routeDestinationData && (
            <>
              {/* Tarjeta de información del destino */}
              <Card sx={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
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

              {/* Mapa */}
              <Box sx={{ flexGrow: 1, position: 'relative', borderRadius: 2, overflow: 'hidden' }}>
                <MapContainer
                  center={[userLocation.latitude, userLocation.longitude]}
                  zoom={16}
                  minZoom={15}
                  maxZoom={20}
                  maxBounds={[
                    [-20.2500, -70.1500], // Esquina suroeste
                    [-20.2350, -70.1320]  // Esquina noreste
                  ]}
                  maxBoundsViscosity={1.0}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    maxNativeZoom={18}
                    maxZoom={20}
                  />
                  <RouteComponent 
                    start={[userLocation.latitude, userLocation.longitude]}
                    end={[routeDestination.lat, routeDestination.lng]}
                    waypoints={routeWaypoints}
                  />
                  <Marker position={[userLocation.latitude, userLocation.longitude]}>
                    <Popup>Tu ubicación</Popup>
                  </Marker>
                  <Marker position={[routeDestination.lat, routeDestination.lng]}>
                    <Popup>{routeDestinationName}</Popup>
                  </Marker>
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
    </Box>
  )
}
