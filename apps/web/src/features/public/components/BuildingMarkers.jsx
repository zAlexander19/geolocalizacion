import React, { memo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Box, Button, Chip, Typography } from '@mui/material';
import { Business as BuildingIcon } from '@mui/icons-material';
import { getFullImageUrl } from '../../../../utils/imageUrl';

// Define the icon outside the component to keep it static
const createBuildingIcon = () => L.divIcon({
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
  iconAnchor: [16, 32],
  popupAnchor: [0, -34]
});

const buildingIcon = createBuildingIcon();

const BuildingMarkers = memo(({ 
  buildings, 
  sharedResourceType, 
  sharedResourceId, 
  onMarkerClick 
}) => {
  return (
    <>
      {buildings.map((building) => {
        if (!building.cord_latitud || !building.cord_longitud) return null;
        
        // Si estamos en vista compartida y este no es el edificio compartido, no renderizar
        if (sharedResourceType === 'building' && String(building.id_edificio) !== String(sharedResourceId)) {
          return null;
        }
        
        return (
          <Marker
            key={building.id_edificio}
            position={[building.cord_latitud, building.cord_longitud]}
            icon={buildingIcon}
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
                    onClick={() => onMarkerClick(building)}
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
    </>
  );
});

BuildingMarkers.displayName = 'BuildingMarkers';

export default BuildingMarkers;
