import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { getFullImageUrl } from '../../../utils/imageUrl'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material'
import { Search as SearchIcon, Map as MapIcon } from '@mui/icons-material'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../../../lib/api'

// Fix for default marker icons in Leaflet with Vite
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: iconShadow,
})

// Custom building icon
const buildingIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
      <path fill="#1976d2" d="M12 3L2 8v13h20V8l-10-5zm0 2.2L19 9v10h-3v-6h-8v6H5V9l7-3.8zM10 15v4h4v-4h-4z"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

// Component to handle map center and zoom changes
function MapUpdater({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom())
    }
  }, [center, zoom, map])
  return null
}

// Component for building marker with auto-open popup
function BuildingMarker({ building, isSelected, onSelect }) {
  const markerRef = L.useRef(null)

  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup()
    }
  }, [isSelected])

  return (
    <Marker
      ref={markerRef}
      position={[building.cord_latitud, building.cord_longitud]}
      icon={buildingIcon}
      eventHandlers={{
        click: () => onSelect(building),
      }}
    >
      <Popup>
        <Box sx={{ minWidth: 200 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            {building.nombre_edificio}
          </Typography>
          {building.acronimo && (
            <Chip
              label={building.acronimo}
              size="small"
              color="primary"
              sx={{ mb: 1 }}
            />
          )}
          {building.created_from_osm && (
            <Chip
              label="OSM"
              size="small"
              color="success"
              sx={{ mb: 1, ml: 1 }}
            />
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            <strong>Lat:</strong> {building.cord_latitud.toFixed(6)}
            <br />
            <strong>Lon:</strong> {building.cord_longitud.toFixed(6)}
          </Typography>
          {building.direccion && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <strong>Dirección:</strong> {building.direccion}
            </Typography>
          )}
          {building.disponibilidad && (
            <Chip
              label={building.disponibilidad}
              size="small"
              color={building.disponibilidad === 'Disponible' ? 'success' : 'default'}
              sx={{ mt: 1 }}
            />
          )}
        </Box>
      </Popup>
    </Marker>
  )
}

export default function MapViewPage() {
  const [searchParams] = useSearchParams()
  const buildingIdParam = searchParams.get('buildingId')
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [selectedBuilding, setSelectedBuilding] = useState(null)
  const [showOnlyOSM, setShowOnlyOSM] = useState(false)
  const [mapCenter, setMapCenter] = useState([-20.2430, -70.1410]) // Centro del campus UNAP
  const [mapZoom, setMapZoom] = useState(16)

  // Fetch buildings
  const { data: buildings, isLoading } = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => {
      const res = await api.get('/buildings')
      return res.data.data
    },
  })

  // Effect to handle building selection from URL parameter
  useEffect(() => {
    if (buildingIdParam && buildings) {
      const building = buildings.find(b => b.id_edificio === parseInt(buildingIdParam))
      if (building && building.cord_latitud && building.cord_longitud) {
        setSelectedBuilding(building)
        setMapCenter([building.cord_latitud, building.cord_longitud])
        setMapZoom(18) // Zoom más cercano cuando se selecciona un edificio específico
      }
    }
  }, [buildingIdParam, buildings])

  // Filter buildings
  const filteredBuildings = (buildings || []).filter((building) => {
    const matchesSearch = 
      building.nombre_edificio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      building.acronimo?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesOSMFilter = showOnlyOSM ? building.created_from_osm : true
    
    return matchesSearch && matchesOSMFilter
  })

  const handleBuildingClick = (building) => {
    setSelectedBuilding(building)
    setMapCenter([building.cord_latitud, building.cord_longitud])
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  const osmBuildingsCount = buildings?.filter(b => b.created_from_osm).length || 0

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <MapIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Mapa del Campus
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visualiza todos los edificios en el mapa interactivo
          </Typography>
        </Box>
      </Box>

      {/* Alert when building is selected from URL */}
      {buildingIdParam && selectedBuilding && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>📍 Edificio seleccionado:</strong> {selectedBuilding.nombre_edificio}
            {selectedBuilding.acronimo && ` (${selectedBuilding.acronimo})`}
          </Typography>
        </Alert>
      )}

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Chip
          label={`${filteredBuildings.length} Edificios`}
          color="primary"
          variant="outlined"
        />
        <Chip
          label={`${osmBuildingsCount} desde OSM`}
          color="success"
          variant="outlined"
        />
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Buscar edificio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1, minWidth: 250 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showOnlyOSM}
                  onChange={(e) => setShowOnlyOSM(e.target.checked)}
                />
              }
              label="Solo edificios OSM"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Map Container */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ height: '600px', width: '100%' }}>
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <MapUpdater center={mapCenter} zoom={mapZoom} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredBuildings.map((building) => {
                if (!building.cord_latitud || !building.cord_longitud) return null
                
                return (
                  <BuildingMarker
                    key={building.id_edificio}
                    building={building}
                    isSelected={selectedBuilding?.id_edificio === building.id_edificio}
                    onSelect={handleBuildingClick}
                  />
                )
              })}
            </MapContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Selected Building Info */}
      {selectedBuilding && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Edificio Seleccionado
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {selectedBuilding.imagen && (
                <Box
                  component="img"
                  src={
                    selectedBuilding.imagen.startsWith('http')
                      ? selectedBuilding.imagen
                      : getFullImageUrl(selectedBuilding.imagen)
                  }
                  alt={selectedBuilding.nombre_edificio}
                  sx={{
                    width: 200,
                    height: 150,
                    objectFit: 'cover',
                    borderRadius: 1,
                  }}
                />
              )}
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">{selectedBuilding.nombre_edificio}</Typography>
                {selectedBuilding.acronimo && (
                  <Typography variant="body2" color="text.secondary">
                    Acrónimo: {selectedBuilding.acronimo}
                  </Typography>
                )}
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {selectedBuilding.created_from_osm && (
                    <Chip label="Importado desde OSM" color="success" size="small" />
                  )}
                  <Chip
                    label={selectedBuilding.disponibilidad || 'N/A'}
                    color={
                      selectedBuilding.disponibilidad === 'Disponible' ? 'success' : 'default'
                    }
                    size="small"
                  />
                  <Chip
                    label={selectedBuilding.estado ? 'Activo' : 'Inactivo'}
                    color={selectedBuilding.estado ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  <strong>Coordenadas:</strong>
                  <br />
                  Latitud: {selectedBuilding.cord_latitud}
                  <br />
                  Longitud: {selectedBuilding.cord_longitud}
                </Typography>
                {selectedBuilding.direccion && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    <strong>Dirección:</strong> {selectedBuilding.direccion}
                  </Typography>
                )}
                {selectedBuilding.osm_id && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    <strong>OSM ID:</strong> {selectedBuilding.osm_id}
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>💡 Tip:</strong> Haz clic en cualquier marcador para ver información
          detallada del edificio. Los edificios con etiqueta "OSM" fueron importados desde
          OpenStreetMap.
        </Typography>
      </Alert>
    </Box>
  )
}
