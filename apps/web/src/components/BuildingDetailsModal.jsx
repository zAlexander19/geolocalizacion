import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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

export default function BuildingDetailsModal({ building, open, onClose, isPublic = false, onViewRoute }) {
  const [selectedFloor, setSelectedFloor] = useState(null)
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0)

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
    if (rooms && currentRoomIndex < rooms.length - 3) {
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

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null
    if (imageUrl.startsWith('http')) return imageUrl
    return `http://localhost:4000${imageUrl}`
  }

  // Obtener las 3 salas visibles en el carrusel
  const visibleRooms = rooms ? rooms.slice(currentRoomIndex, currentRoomIndex + 3) : []
  
  // Calcular la cantidad máxima de posiciones del carrusel
  const maxCarouselPositions = rooms ? Math.max(1, rooms.length - 2) : 1

  return (
    <Dialog 
      open={open && !!building} 
      onClose={handleClose} 
      maxWidth="lg" 
      fullWidth
      keepMounted={false}
    >
      {building && (
        <>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" fontWeight="bold">
          {selectedFloor ? `${selectedFloor.nombre_piso} - ${building.nombre_edificio}` : building.nombre_edificio}
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <Divider />

      <DialogContent sx={{ p: 0, maxHeight: '75vh', overflowY: 'auto' }}>
        {!selectedFloor ? (
          // Vista de edificio con lista de pisos
          <Box>
            {/* Imagen del edificio a la izquierda y descripción a la derecha */}
            <Box sx={{ px: 3, pt: 2, pb: 2, display: 'flex', gap: 3, alignItems: 'flex-start' }}>
              {/* Imagen */}
              <Box sx={{ flex: '0 0 45%', minWidth: 0 }}>
                {building.imagen && !/via\.placeholder\.com/.test(building.imagen) ? (
                  <Box
                    component="img"
                    src={getImageUrl(building.imagen)}
                    alt={building.nombre_edificio}
                    sx={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: 350,
                      objectFit: 'cover',
                      borderRadius: 2,
                      boxShadow: 2,
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
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="h6" color="text.secondary">
                      Sin imagen
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Descripción y botón */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Acrónimo */}
                {building.acronimo && (
                  <Chip 
                    label={building.acronimo}
                    color="primary"
                    sx={{ alignSelf: 'flex-start' }}
                  />
                )}

                {/* Descripción */}
                {building.descripcion ? (
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Descripción
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {building.descripcion}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" fontStyle="italic">
                    No hay descripción disponible para este edificio
                  </Typography>
                )}

                {/* Botón Ver Ruta */}
                {isPublic && onViewRoute && (
                  <Button
                    variant="contained"
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
                    sx={{ alignSelf: 'flex-start', minWidth: 200 }}
                  >
                    Ver Ruta
                  </Button>
                )}
              </Box>
            </Box>

            {/* Lista de pisos */}
            <Box sx={{ px: 3, pb: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                PISOS Y SALAS
              </Typography>
              
              {floors && floors.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  {floors.map((floor) => (
                    <Card key={floor.id_piso} variant="outlined">
                      <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {floor.nombre_piso}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Número de piso: {floor.numero_piso ?? '-'}
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleFloorClick(floor)}
                          sx={{ minWidth: 100 }}
                        >
                          VER PISO
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  No hay pisos disponibles para este edificio
                </Typography>
              )}
            </Box>
          </Box>
        ) : (
          // Vista de salas del piso (carrusel con 3 salas)
          <Box>
            {/* Botón para regresar */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Button
                variant="text"
                size="small"
                onClick={handleBackToFloors}
              >
                ← Volver a pisos
              </Button>
            </Box>

            {/* Imagen del piso */}
            <Box sx={{ px: 3, pt: 2, pb: 1 }}>
              {selectedFloor.imagen && !/via\.placeholder\.com/.test(selectedFloor.imagen) ? (
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={getImageUrl(selectedFloor.imagen)}
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
            {rooms && rooms.length > 0 && (
              <Box sx={{ px: 3, pb: 2 }}>
                <Typography variant="body2" color="text.secondary" fontWeight="medium">
                  {rooms.length} {rooms.length === 1 ? 'sala' : 'salas'} en este piso
                </Typography>
              </Box>
            )}

            {/* Carrusel de 3 salas */}
            {visibleRooms.length > 0 ? (
              <Box sx={{ position: 'relative', px: 3, pb: 2, overflow: 'hidden' }}>
                {/* Botón anterior - Solo visible si no está en el inicio */}
                {currentRoomIndex > 0 && (
                  <IconButton
                    onClick={handlePrevRoom}
                    sx={{
                      position: 'absolute',
                      left: -20,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      bgcolor: 'white',
                      boxShadow: 3,
                      zIndex: 10,
                      '&:hover': { bgcolor: 'grey.100' },
                    }}
                  >
                    <ChevronLeftIcon fontSize="large" />
                  </IconButton>
                )}

                {/* Contenedor con overflow */}
                <Box sx={{ overflow: 'hidden', position: 'relative', width: '100%' }}>
                  {/* Grid de salas con animación de deslizamiento */}
                  <Box
                    sx={{
                      display: 'flex',
                      transform: `translateX(calc(-${currentRoomIndex} * (33.333% + 10.67px)))`,
                      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                      gap: 2,
                      width: 'fit-content',
                    }}
                  >
                    {rooms && rooms.map((room) => (
                      <Box
                        key={room.id_sala}
                        sx={{
                          minWidth: 'calc(33.333% - 10.67px)',
                          flexShrink: 0,
                        }}
                      >
                        <Card
                          sx={{
                            height: '100%',
                            transition: 'all 0.3s',
                            '&:hover': {
                              transform: 'translateY(-8px)',
                              boxShadow: 6,
                            },
                          }}
                        >
                          {/* Nombre de la sala */}
                          <Box sx={{ p: 1.5, bgcolor: 'grey.100', textAlign: 'center' }}>
                            <Typography variant="subtitle2" fontWeight="bold" noWrap>
                              {room.nombre_sala}
                            </Typography>
                          </Box>

                          {/* Foto de la sala */}
                          {room.imagen && !/via\.placeholder\.com/.test(room.imagen) ? (
                            <Box sx={{ position: 'relative' }}>
                              <CardMedia
                                component="img"
                                height="140"
                                image={getImageUrl(room.imagen)}
                                alt={room.nombre_sala}
                                sx={{ objectFit: 'cover' }}
                              />
                              {room.disponibilidad === 'En mantenimiento' && (
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top: 5,
                                    left: 0,
                                    right: 0,
                                    bgcolor: 'error.main',
                                    color: 'white',
                                    py: 0.5,
                                    px: 1,
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    transform: 'rotate(-3deg)',
                                    boxShadow: 2,
                                    zIndex: 1
                                  }}
                                >
                                  ⚠️ MANTENIMIENTO
                                </Box>
                              )}
                            </Box>
                          ) : (
                            <Box
                              sx={{
                                height: 140,
                                bgcolor: 'grey.200',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <RoomIcon sx={{ fontSize: 50, color: 'grey.400' }} />
                            </Box>
                          )}

                          {/* Etiquetas (chips) */}
                          <CardContent sx={{ pt: 1, pb: 1 }}>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
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
                                label={`${room.capacidad}p`}
                                size="small"
                                icon={<PeopleIcon />}
                                variant="outlined"
                              />
                            </Box>
                            
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, justifyContent: 'center' }}>
                              <Chip
                                label={room.estado ? 'Activa' : 'Inactiva'}
                                size="small"
                                color={room.estado ? 'success' : 'error'}
                              />
                              <Chip
                                label={room.disponibilidad}
                                size="small"
                                color={room.disponibilidad === 'Disponible' ? 'success' : 'default'}
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* Botón siguiente - Solo visible si no está en el final */}
                {currentRoomIndex < rooms.length - 3 && (
                  <IconButton
                    onClick={handleNextRoom}
                    sx={{
                      position: 'absolute',
                      right: -20,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      bgcolor: 'white',
                      boxShadow: 3,
                      zIndex: 10,
                      '&:hover': { bgcolor: 'grey.100' },
                    }}
                  >
                    <ChevronRightIcon fontSize="large" />
                  </IconButton>
                )}

                {/* Indicador de posición - Solo si hay más de 3 salas */}
                {rooms && rooms.length > 3 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1.5 }}>
                    {Array.from({ length: maxCarouselPositions }).map((_, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: idx === currentRoomIndex ? 'primary.main' : 'grey.300',
                          transition: 'all 0.3s',
                          cursor: 'pointer',
                        }}
                        onClick={() => setCurrentRoomIndex(idx)}
                      />
                    ))}
                  </Box>
                )}
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
