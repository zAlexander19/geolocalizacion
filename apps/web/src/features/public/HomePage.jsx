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
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Toolbar,
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
} from '@mui/icons-material'
import api from '../../lib/api'

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
      
      // Filtrar por nombre de sala
      const filtered = rooms.filter(room => 
        room.nombre_sala.toLowerCase().includes(searchQuery.toLowerCase())
      )
      
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
        const { latitude, longitude } = position.coords
        setUserLocation({ latitude, longitude })
        setLocationDialog(false)
        setSnackbar({
          open: true,
          message: '✓ Ubicación activada correctamente',
          severity: 'success'
        })
        console.log('Ubicación del usuario:', { latitude, longitude })
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

  const searchOptions = [
    { id: 'edificio', label: 'Edificio', icon: <BuildingIcon /> },
    { id: 'sala', label: 'Sala', icon: <RoomIcon /> },
    { id: 'facultad', label: 'Facultad', icon: <SchoolIcon /> },
    { id: 'baño', label: 'Baño', icon: <BathroomIcon /> }
  ]

  const handleSearch = () => {
    if (activeTab === 1 && searchQuery.trim()) { // Solo salas por ahora
      setSearchTriggered(true)
      console.log(`Buscando sala: ${searchQuery}`)
    } else {
      setSnackbar({
        open: true,
        message: 'Por favor ingresa un nombre de sala',
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
              <Button
                size="small"
                startIcon={<MyLocationIcon />}
                sx={{ color: 'success.main', textTransform: 'none' }}
              >
                Ubicación activada
              </Button>
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

        {/* Search Results Section */}
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

                        {/* Tipo de sala */}
                        <Chip 
                          label={room.tipo_sala || 'Sin tipo'}
                          size="small"
                          color="primary"
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

                        {/* Botón Ver más */}
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={() => {
                            setSelectedRoom(room)
                            setRoomDetailOpen(true)
                          }}
                          sx={{ mt: 2 }}
                        >
                          Ver más
                        </Button>
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
                    <Chip label={selectedRoom.tipo_sala || 'Sin tipo'} size="small" color="primary" variant="outlined" />
                    <Chip label={selectedRoom.disponibilidad} size="small" color={selectedRoom.disponibilidad === 'Disponible' ? 'success' : 'default'} />
                    <Chip label={selectedRoom.estado ? 'Activa' : 'Inactiva'} size="small" color={selectedRoom.estado ? 'success' : 'error'} />
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
                onClick={() => {
                  // Abrir en Google Maps con las coordenadas de la sala
                  const url = `https://www.google.com/maps?q=${selectedRoom.cord_latitud},${selectedRoom.cord_longitud}`
                  window.open(url, '_blank')
                }}
              >
                Mostrar en el mapa
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
    </Box>
  )
}
