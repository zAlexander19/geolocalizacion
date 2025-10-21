import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
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
} from '@mui/material'
import {
  Search as SearchIcon,
  Business as BuildingIcon,
  MeetingRoom as RoomIcon,
  School as SchoolIcon,
  Wc as BathroomIcon,
  LocationOn as LocationIcon,
  MyLocation as MyLocationIcon,
} from '@mui/icons-material'

export default function HomePage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [locationDialog, setLocationDialog] = useState(true)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' })

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
    console.log(`Buscando ${searchOptions[activeTab].id}: ${searchQuery}`)
    // Aquí implementarás la lógica de búsqueda
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
              >
                Buscar
              </Button>
            </Paper>
          </Box>
        </Box>

        {/* Info Cards */}
        <Grid container spacing={3} sx={{ mt: 8 }}>
          {searchOptions.map((option, index) => (
            <Grid item xs={12} sm={6} md={3} key={option.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  border: 2,
                  borderColor: activeTab === index ? 'primary.main' : 'grey.200',
                  '&:hover': {
                    boxShadow: 4,
                    borderColor: activeTab === index ? 'primary.main' : 'grey.300',
                  }
                }}
                onClick={() => setActiveTab(index)}
              >
                <CardContent>
                  <Box sx={{ fontSize: 48, mb: 2 }}>
                    {option.icon}
                  </Box>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Buscar {option.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {option.id === 'edificio' && 'Localiza edificios y obtén información detallada'}
                    {option.id === 'sala' && 'Encuentra salas de clases y espacios disponibles'}
                    {option.id === 'facultad' && 'Descubre las diferentes facultades del campus'}
                    {option.id === 'baño' && 'Ubica los baños más cercanos a tu posición'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Stats Section */}
        <Paper elevation={1} sx={{ mt: 8, p: 4 }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                50+
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Edificios registrados
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                200+
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Salas disponibles
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                24/7
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Servicio disponible
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Container>

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
