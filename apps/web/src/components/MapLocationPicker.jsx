import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { Box, Button, TextField, Typography, Paper } from '@mui/material'
import { MyLocation as MyLocationIcon } from '@mui/icons-material'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix para los iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function DraggableMarker({ position, setPosition }) {
  const markerRef = useRef(null)
  
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
    },
  })

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current
      if (marker != null) {
        const newPos = marker.getLatLng()
        setPosition([newPos.lat, newPos.lng])
      }
    },
  }

  return position === null ? null : (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  )
}

export default function MapLocationPicker({ latitude, longitude, onChange }) {
  const [position, setPosition] = useState(
    latitude && longitude ? [latitude, longitude] : [-33.0367, -71.5963] // Default: Valparaíso
  )
  const mapRef = useRef(null)
  const isInitialMount = useRef(true)

  useEffect(() => {
    if (latitude && longitude) {
      setPosition([latitude, longitude])
    }
  }, [latitude, longitude])

  useEffect(() => {
    // No llamar onChange en el montaje inicial
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    
    if (position && onChange) {
      onChange({
        latitude: position[0],
        longitude: position[1],
      })
    }
  }, [position])

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = [pos.coords.latitude, pos.coords.longitude]
          setPosition(newPos)
          if (mapRef.current) {
            mapRef.current.flyTo(newPos, 18)
          }
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error)
          alert('No se pudo obtener tu ubicación actual')
        },
        { enableHighAccuracy: true }
      )
    } else {
      alert('Tu navegador no soporta geolocalización')
    }
  }

  const handleLatitudeChange = (e) => {
    const lat = parseFloat(e.target.value)
    if (!isNaN(lat)) {
      setPosition([lat, position[1]])
    }
  }

  const handleLongitudeChange = (e) => {
    const lng = parseFloat(e.target.value)
    if (!isNaN(lng)) {
      setPosition([position[0], lng])
    }
  }

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Selecciona la ubicación en el mapa
        </Typography>
        
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Haz clic en el mapa o arrastra el marcador para seleccionar la ubicación exacta
        </Typography>

        <Box sx={{ height: 400, width: '100%', borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider', mb: 2 }}>
          <MapContainer
            center={position}
            zoom={18}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <DraggableMarker position={position} setPosition={setPosition} />
          </MapContainer>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Latitud"
            type="number"
            value={position[0]}
            onChange={handleLatitudeChange}
            size="small"
            inputProps={{ step: 0.000001 }}
            sx={{ flex: 1, minWidth: 150 }}
          />
          <TextField
            label="Longitud"
            type="number"
            value={position[1]}
            onChange={handleLongitudeChange}
            size="small"
            inputProps={{ step: 0.000001 }}
            sx={{ flex: 1, minWidth: 150 }}
          />
        </Box>
      </Paper>
    </Box>
  )
}
