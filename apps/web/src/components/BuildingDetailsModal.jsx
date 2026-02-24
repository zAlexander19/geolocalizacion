import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getFullImageUrl } from '../utils/imageUrl'
import ShareLocationButton from './ShareLocationButton'
import QRCodeButton from './QRCodeButton'
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  Divider,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  People as PeopleIcon,
  MeetingRoom as RoomIcon,
  LocationOn as LocationOnIcon,
} from '@mui/icons-material'
import api from '../lib/api'

export default function BuildingDetailsModal({ building, open, onClose, isPublic = false, onViewRoute, onRoomClick }) {
  const [selectedFloor, setSelectedFloor] = useState(null)
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // Obtener pisos del edificio
  const { data: floors } = useQuery({
    queryKey: ['floors', building?.id_edificio],
    queryFn: async () => {
      if (!building?.id_edificio) return []
      const res = await api.get(`/buildings/${building.id_edificio}/floors`)
      return res.data.data
    },
    enabled: !!building?.id_edificio && open,
  })

  // Obtener salas del piso seleccionado
  const { data: rooms } = useQuery({
    queryKey: ['rooms', selectedFloor?.id_piso],
    queryFn: async () => {
      if (!selectedFloor?.id_piso) return []
      const res = await api.get(`/floors/${selectedFloor.id_piso}/rooms`)
      return res.data.data
    },
    enabled: !!selectedFloor?.id_piso,
  })

  const handleFloorClick = (floor) => {
    setSelectedFloor(floor)
    setCurrentRoomIndex(0) // Resetear al primer sala
  }

  const handleBackToFloors = () => {
    setSelectedFloor(null)
    setCurrentRoomIndex(0)
  }

  const handleNextRoom = () => {
    const roomsPerPage = isMobile ? 1 : 3
    if (rooms && currentRoomIndex < rooms.length - roomsPerPage) {
      setCurrentRoomIndex(currentRoomIndex + 1)
    }
  }

  const handlePrevRoom = () => {
    if (currentRoomIndex > 0) {
      setCurrentRoomIndex(currentRoomIndex - 1)
    }
  }

  const handleClose = () => {
    setSelectedFloor(null)
    setCurrentRoomIndex(0)
    onClose()
  }

  // Determinar cuántas salas mostrar según el dispositivo
  const roomsPerPage = isMobile ? 1 : 3
  
  // Obtener las salas visibles en el carrusel
  const visibleRooms = rooms ? rooms.slice(currentRoomIndex, currentRoomIndex + roomsPerPage) : []
  
  // Calcular la cantidad máxima de posiciones del carrusel
  const maxCarouselPositions = rooms ? Math.max(1, rooms.length - (roomsPerPage - 1)) : 1

  return (
    <Dialog 
      open={open && !!building} 
      onClose={handleClose} 
      maxWidth="md"
      fullWidth
      keepMounted={false}
      PaperProps={{
        sx: {
          borderRadius: 4,
          m: 2,
          width: 'calc(100% - 32px)',
          maxHeight: '85vh',
          boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)',
        }
      }}
    >
      {building && (
        <>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', p: 3, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'sans-serif', lineHeight: 1.2 }}>
          {selectedFloor ? `${selectedFloor.nombre_piso} - ${building.nombre_edificio}` : building.nombre_edificio}
        </Typography>
        <IconButton 
          onClick={handleClose}
          sx={{ 
            color: 'white',
            bgcolor: 'rgba(255,255,255,0.1)', 
            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
            ml: 2,
            mt: -0.5,
            zIndex: 10
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
        {!selectedFloor ? (
          // Vista Moderna de Detalles del Edificio
          <Box>
            {/* Imagen Principal - Full Width */}
            <Box sx={{ width: '100%', height: 280, position: 'relative', bgcolor: 'grey.100' }}>
              {building.imagen && !/via\.placeholder\.com/.test(building.imagen) ? (
                <>
                  <Box
                    component="img"
                    src={getFullImageUrl(building.imagen)}
                    alt={building.nombre_edificio}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                  {building.disponibilidad === 'En mantenimiento' && (
                     <Box
                       sx={{
                         position: 'absolute',
                         top: '15%',
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
                </>
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 1
                  }}
                >
                  <RoomIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                  <Typography variant="body2" color="text.secondary">
                    Sin imagen disponible
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Contenido */}
            <Box sx={{ p: 3 }}>
              {/* Acrónimo y Etiquetas */}
              {building.acronimo && (
                <Chip 
                  label={building.acronimo}
                  color="primary"
                  sx={{ mb: 2, fontWeight: 600 }}
                />
              )}

              {/* Descripción */}
              <Box sx={{ mb: 4 }}>
                {building.descripcion ? (
                  <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8, fontSize: '1.05rem' }}>
                    {building.descripcion}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary" fontStyle="italic">
                    No hay descripción disponible para este edificio.
                  </Typography>
                )}
              </Box>

              {/* Botón Acción Principal */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                {isPublic && onViewRoute && (
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<LocationOnIcon />}
                    onClick={() => {
                      onViewRoute({
                        type: 'building',
                        name: building.nombre_edificio,
                        acronym: building.acronimo,
                        image: building.imagen,
                        distance: building.distance,
                        latitude: building.cord_latitud,
                        longitude: building.cord_longitud
                      })
                    }}
                    sx={{ 
                      flex: 1,
                      py: 1.5,
                      borderRadius: 3,
                      fontWeight: 700,
                      fontSize: '1rem',
                      boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)',
                      textTransform: 'none'
                    }}
                  >
                    Ver Ruta
                  </Button>
                )}
                <ShareLocationButton
                  latitude={building.cord_latitud}
                  longitude={building.cord_longitud}
                  type="building"
                  id={building.id_edificio}
                  name={building.nombre_edificio}
                  size="large"
                  sx={{ flex: 1 }}
                />
                <QRCodeButton
                  latitude={building.cord_latitud}
                  longitude={building.cord_longitud}
                  type="building"
                  id={building.id_edificio}
                  name={building.nombre_edificio}
                  size="large"
                  sx={{ flex: 1 }}
                />
              </Box>

              <Divider sx={{ my: 4 }} />

              {/* Sección Pisos */}
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                  PISOS Y SALAS
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Selecciona un piso para ver sus aulas y laboratorios
                </Typography>

                <List disablePadding>
                  {floors && floors.length > 0 ? (
                    floors.map((floor) => (
                      <ListItem 
                        key={floor.id_piso} 
                        // divider={index !== floors.length - 1}
                        disableGutters
                        sx={{ 
                          py: 2, 
                          px: 3, 
                          mb: 2, 
                          borderRadius: 3, 
                          bgcolor: 'rgba(0, 0, 0, 0.3)', 
                          border: '1px solid',
                          borderColor: 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <ListItemText 
                          primary={floor.nombre_piso}
                          secondary={`Piso ${floor.numero_piso ?? '-'}`}
                          primaryTypographyProps={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}
                        />
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleFloorClick(floor)}
                          sx={{ 
                            borderRadius: 2, 
                            fontWeight: 700,
                            bgcolor: 'white',
                            color: 'primary.dark',
                            '&:hover': {
                              bgcolor: 'grey.200',
                            },
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            minWidth: 100,
                            ml: 2
                          }}
                        >
                          VER PISO
                        </Button>
                      </ListItem>
                    ))
                  ) : (
                    <Box sx={{ py: 3, textAlign: 'center', mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        No hay información de pisos disponible.
                      </Typography>
                    </Box>
                  )}
                </List>
              </Box>
            </Box>
          </Box>
        ) : (
          // Vista de salas del piso (carrusel con 3 salas)
          <Box>
            {/* Botón para regresar */}
            <Box sx={{ px: 3, pt: 3, pb: 1 }}>
              <Button
                variant="text"
                startIcon={<ChevronLeftIcon />}
                onClick={handleBackToFloors}
                sx={{
                  color: 'text.secondary',
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  '&:hover': {
                    bgcolor: 'transparent',
                    color: 'primary.main',
                    transform: 'translateX(-4px)'
                  },
                  transition: 'all 0.2s ease',
                  justifyContent: 'flex-start',
                  p: 0,
                  minWidth: 0
                }}
                disableRipple
              >
                Volver a lista de pisos
              </Button>
            </Box>

            {/* Imagen del piso */}
            <Box sx={{ px: 3, pt: 2, pb: 1 }}>
              {selectedFloor.imagen && !/via\.placeholder\.com/.test(selectedFloor.imagen) ? (
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={getFullImageUrl(selectedFloor.imagen)}
                    alt={selectedFloor.nombre_piso}
                    sx={{
                      width: '100%',
                      height: 160,
                      objectFit: 'cover',
                      borderRadius: 2,
                      boxShadow: 2,
                    }}
                  />
                  {selectedFloor.disponibilidad === 'En mantenimiento' && (
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
                        transform: 'rotate(-3deg)',
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
                    width: '100%',
                    height: 160,
                    bgcolor: 'grey.200',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="h6" color="text.secondary">
                    Foto del piso no disponible
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Contador de salas */}
            {rooms && rooms.filter(r => r.estado).length > 0 && (
              <Box sx={{ px: 3, pb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  Salas
                </Typography>
              </Box>
            )}

            {/* Lista de salas */}
            {rooms && rooms.filter(r => r.estado).length > 0 ? (
              <Box sx={{ px: 3, pb: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {rooms.filter(r => r.estado).map((room) => (
                    <Card 
                      key={room.id_sala} 
                      variant="outlined"
                      sx={{
                        transition: 'all 0.2s',
                        '&:hover': {
                          boxShadow: 3,
                        }
                      }}
                    >
                      <CardContent sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        p: 2, 
                        gap: 2,
                        flexDirection: isMobile ? 'column' : 'row',
                        '&:last-child': { pb: 2 } 
                      }}>
                        <Box sx={{ flex: 1, width: '100%' }}>
                          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            {room.nombre_sala}
                          </Typography>
                          
                          {/* Chips de información */}
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                            {room.acronimo && (
                              <Chip 
                                label={room.acronimo}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                            {room.tipo_sala && (
                              <Chip 
                                label={room.tipo_sala}
                                size="small"
                                color="secondary"
                                variant="outlined"
                              />
                            )}
                            <Chip
                              label={`${room.capacidad} personas`}
                              size="small"
                              icon={<PeopleIcon />}
                              variant="outlined"
                              sx={{
                                bgcolor: 'white',
                                color: 'black'
                              }}
                            />
                          </Box>

                          {/* Estado y Disponibilidad - ELIMINADO */}
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, width: isMobile ? '100%' : 'auto' }}>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => {
                              if (onRoomClick) {
                                onRoomClick(room)
                              }
                            }}
                            sx={{ minWidth: isMobile ? '100%' : 100 }}
                          >
                            Ver más
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No hay salas disponibles en este piso
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
        </>
      )}
    </Dialog>
  )
}
