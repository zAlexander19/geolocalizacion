import { useState, useMemo } from 'react'
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
  Chip,
  List,
  ListItem,
  ListItemText,
  useMediaQuery,
  useTheme,
  Tooltip,
} from '@mui/material'
import {
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  People as PeopleIcon,
  MeetingRoom as RoomIcon,
  LocationOn as LocationOnIcon,
  Share as ShareIcon,
} from '@mui/icons-material'
import api from '../lib/api'

// ─── Estilos estáticos fuera del componente (se crean una sola vez) ───────────
const STYLES = {
  dialogPaper: {
    borderRadius: 4,
    m: 2,
    width: 'calc(100% - 32px)',
    maxHeight: '85vh',
    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)',
    background: 'linear-gradient(135deg, #0f1419 0%, #1a1f2e 50%, #0d1117 100%)',
    color: 'white',
    backdropFilter: 'blur(0px)',
  },
  dialogTitle: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3, pb: 2, color: 'white' },
  titleTypography: { fontWeight: 800, fontFamily: 'sans-serif', lineHeight: 1.2, flex: 1, color: 'white' },
  titleButtonBox: { display: 'flex', gap: 1, alignItems: 'center' },
  closeIconButton: { color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } },
  dialogContent: { p: 0, maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' },
  mainImageBox: { width: '100%', height: 280, position: 'relative', bgcolor: 'grey.100' },
  shareIconButton: {
    position: 'absolute', top: 10, right: 10, zIndex: 20,
    bgcolor: 'rgba(33,150,243,0.85)', color: 'white',
    backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.25)',
    '&:hover': { bgcolor: 'rgba(25,118,210,0.95)' },
  },
  mobileRouteButton: {
    display: { xs: 'inline-flex', md: 'none' },
    position: 'absolute', bottom: 10, right: 10, left: 10, zIndex: 20,
    borderRadius: 2, fontWeight: 700, fontSize: '0.9rem', textTransform: 'none',
    bgcolor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255,255,255,0.15)', color: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    '&:hover': { bgcolor: 'rgba(25,118,210,0.85)', boxShadow: '0 6px 16px rgba(25,118,210,0.5)' },
  },
  buildingImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  maintenanceBanner: {
    position: 'absolute', top: '15%', left: '50%', width: '150%',
    transform: 'translate(-50%, -50%) rotate(-10deg)',
    background: 'linear-gradient(90deg, rgba(220,38,38,0.95) 0%, rgba(185,28,28,0.95) 100%)',
    color: 'white', py: 1, textAlign: 'center', fontWeight: 900, fontSize: '1rem',
    letterSpacing: 4, textTransform: 'uppercase', zIndex: 10,
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    borderTop: '2px solid rgba(255,255,255,0.3)', borderBottom: '2px solid rgba(255,255,255,0.3)',
  },
  noImageBox: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 },
  contentBox: { p: 3 },
  descriptionTypography: { color: 'text.secondary', lineHeight: 1.8, fontSize: '1.05rem' },
  desktopRouteButton: {
    display: { xs: 'none', md: 'inline-flex' },
    mb: 3, py: 1.5, borderRadius: 2.5, fontWeight: 700, textTransform: 'none', fontSize: '1rem',
    background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
    boxShadow: '0 6px 16px rgba(25,118,210,0.35)',
    '&:hover': { boxShadow: '0 8px 22px rgba(25,118,210,0.5)', transform: 'translateY(-2px)' },
  },
  floorListItem: {
    py: 2, px: 3, mb: 2, borderRadius: 3,
    bgcolor: 'rgba(0, 0, 0, 0.3)', border: '1px solid', borderColor: 'rgba(255, 255, 255, 0.05)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  floorPrimaryText: { fontWeight: 600, color: 'text.primary', mb: 0.5 },
  floorButton: {
    borderRadius: 2, fontWeight: 700, py: 0.8, px: 2,
    fontSize: { xs: '0.8rem', sm: '0.9rem' },
    background: 'linear-gradient(135deg, #42A5F5 0%, #2196F3 100%)',
    color: 'white', boxShadow: '0 3px 8px rgba(33, 150, 243, 0.3)',
    transition: 'all 0.3s ease',
    '&:hover': { boxShadow: '0 5px 12px rgba(33, 150, 243, 0.4)', transform: 'translateY(-1px)' },
    minWidth: 110, ml: { xs: 0.5, sm: 2 },
  },
  noFloorsBox: { py: 3, textAlign: 'center', mt: 2 },
  backButton: {
    color: 'text.secondary', fontWeight: 600, textTransform: 'none', fontSize: '0.95rem',
    '&:hover': { bgcolor: 'transparent', color: 'primary.main', transform: 'translateX(-4px)' },
    transition: 'all 0.2s ease', justifyContent: 'flex-start', p: 0, minWidth: 0,
  },
  floorHeaderBox: { px: 3, pt: 3, pb: 1 },
  floorImageContainerBox: { px: 3, pt: 2, pb: 1 },
  floorImg: { width: '100%', height: 160, objectFit: 'cover', borderRadius: 2, boxShadow: 2 },
  maintenanceFloorBanner: {
    position: 'absolute', top: 10, left: 0, right: 0,
    bgcolor: 'error.main', color: 'white', py: 1, px: 2,
    fontWeight: 'bold', textAlign: 'center', transform: 'rotate(-3deg)', boxShadow: 3, zIndex: 1,
  },
  noFloorImageBox: { width: '100%', height: 160, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  roomsCounterBox: { px: 3, pb: 2 },
  roomsListBox: { px: 3, pb: 3 },
  roomsColumnBox: { display: 'flex', flexDirection: 'column', gap: 2 },
  roomCard: { transition: 'all 0.2s', '&:hover': { boxShadow: 3 } },
  roomCardContentBase: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, gap: 2, '&:last-child': { pb: 2 } },
  roomInfoBox: { flex: 1, width: '100%' },
  roomChipsBox: { display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 },
  capacityChip: { bgcolor: 'white', color: 'black' },
  noRoomsBox: { p: 4, textAlign: 'center' },
  shareQRDialogPaper: {
    borderRadius: 3,
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: 'white', border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  shareQRDialogTitle: { pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  shareQRDialogContent: { py: 4, px: 3, display: 'flex', flexDirection: 'column', gap: 4 },
  shareQRDivider: { borderColor: 'rgba(255,255,255,0.2)', my: 2 },
  shareQRCloseButton: { color: 'white' },
  qrCenterBox: { display: 'flex', justifyContent: 'center', mb: 2 },
  captionText: { display: 'block', textAlign: 'center', color: 'rgba(255,255,255,0.7)', mt: 2 },
  sectionTitleText: { mb: 3, fontWeight: 'bold', textAlign: 'center', fontSize: '1.1rem' },
  roomIconStyle: { fontSize: 48, color: 'text.disabled' },
  acronimChip: { mb: 2, fontWeight: 600 },
  descriptionBox: { mb: 3 },
  dividerMain: { my: 3 },
  floorsSectionTitle: { fontWeight: 800, mb: 1 },
  floorsSectionSubtitle: { mb: 2 },
  floorImageRelativeBox: { position: 'relative' },
  shareQRTitleTypography: { fontWeight: 'bold' },
}

export default function BuildingDetailsModal({ building, open, onClose, isPublic = false, onViewRoute, onRoomClick, onClearSharedParams }) {
  const [selectedFloor, setSelectedFloor] = useState(null)
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0)
  const [shareQRDialogOpen, setShareQRDialogOpen] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // Estilos que dependen de isMobile — memorizados para evitar recreación en cada render
  const roomCardContentSx = useMemo(() => ({
    ...STYLES.roomCardContentBase,
    flexDirection: isMobile ? 'column' : 'row',
  }), [isMobile])

  const roomActionButtonSx = useMemo(() => ({
    minWidth: isMobile ? '100%' : 100,
  }), [isMobile])

  const roomActionBoxSx = useMemo(() => ({
    display: 'flex', gap: 1,
    width: isMobile ? '100%' : 'auto',
  }), [isMobile])

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
    <>
      <Dialog 
        open={open && !!building} 
        onClose={handleClose} 
        maxWidth="md"
        fullWidth
        keepMounted={false}
        disableEscapeKeyDown
        disableBackdrop
        PaperProps={{ sx: STYLES.dialogPaper }}
      >
      {building && (
        <>
      <DialogTitle sx={STYLES.dialogTitle}>
        <Typography variant="h5" component="div" sx={STYLES.titleTypography}>
          {selectedFloor ? `${selectedFloor.nombre_piso} - ${building.nombre_edificio}` : building.nombre_edificio}
        </Typography>
        <Box sx={STYLES.titleButtonBox}>
          <IconButton onClick={handleClose} sx={STYLES.closeIconButton}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={STYLES.dialogContent}>
        {!selectedFloor ? (
          // Vista Moderna de Detalles del Edificio
          <Box>
            {/* Imagen Principal - Full Width */}
            <Box sx={STYLES.mainImageBox}>

              {/* Botón Compartir - esquina superior derecha */}
              <Tooltip title="Compartir">
                <IconButton
                  onClick={() => setShareQRDialogOpen(true)}
                  sx={STYLES.shareIconButton}
                >
                  <ShareIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {/* Botón Ver Ruta sobre imagen - solo móvil */}
              {isPublic && onViewRoute && (
                <Button
                  variant="contained"
                  size="small"
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
                  sx={STYLES.mobileRouteButton}
                >
                  Ver Ruta
                </Button>
              )}

              {building.imagen && !/via\.placeholder\.com/.test(building.imagen) ? (
                <>
                  <Box
                    component="img"
                    src={getFullImageUrl(building.imagen)}
                    alt={building.nombre_edificio}
                    sx={STYLES.buildingImg}
                  />
                  {building.disponibilidad === 'En mantenimiento' && (
                     <Box sx={STYLES.maintenanceBanner}>
                       EN MANTENIMIENTO
                     </Box>
                  )}
                </>
              ) : (
                <Box sx={STYLES.noImageBox}>
                  <RoomIcon sx={STYLES.roomIconStyle} />
                  <Typography variant="body2" color="text.secondary">
                    Sin imagen disponible
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Contenido */}
            <Box sx={STYLES.contentBox}>
              {/* Acrónimo y Etiquetas */}
              {building.acronimo && (
                <Chip
                  label={building.acronimo}
                  color="primary"
                  sx={STYLES.acronimChip}
                />
              )}

              {/* Descripción */}
              <Box sx={STYLES.descriptionBox}>
                {building.descripcion ? (
                  <Typography variant="body1" sx={STYLES.descriptionTypography}>
                    {building.descripcion}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary" fontStyle="italic">
                    No hay descripción disponible para este edificio.
                  </Typography>
                )}
              </Box>

              {/* Botón Ver Ruta - solo desktop, debajo de descripción */}
              {isPublic && onViewRoute && (
                <Button
                  variant="contained"
                  fullWidth
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
                  sx={STYLES.desktopRouteButton}
                >
                  Ver Ruta
                </Button>
              )}

              <Divider sx={STYLES.dividerMain} />

              {/* Sección Pisos */}
              <Box>
                <Typography variant="h6" sx={STYLES.floorsSectionTitle}>
                  PISOS Y SALAS
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={STYLES.floorsSectionSubtitle}>
                  Selecciona un piso para ver sus aulas y laboratorios
                </Typography>

                <List disablePadding>
                  {floors && floors.length > 0 ? (
                    floors.map((floor) => (
                      <ListItem
                        key={floor.id_piso}
                        disableGutters
                        sx={STYLES.floorListItem}
                      >
                        <ListItemText
                          primary={floor.nombre_piso}
                          secondary={`Piso ${floor.numero_piso ?? '-'}`}
                          primaryTypographyProps={STYLES.floorPrimaryText}
                        />
                        <Button
                          variant="contained"
                          onClick={() => handleFloorClick(floor)}
                          sx={STYLES.floorButton}
                        >
                          VER PISO
                        </Button>
                      </ListItem>
                    ))
                  ) : (
                    <Box sx={STYLES.noFloorsBox}>
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
            <Box sx={STYLES.floorHeaderBox}>
              <Button
                variant="text"
                startIcon={<ChevronLeftIcon />}
                onClick={handleBackToFloors}
                sx={STYLES.backButton}
                disableRipple
              >
                Volver a lista de pisos
              </Button>
            </Box>

            {/* Imagen del piso */}
            <Box sx={STYLES.floorImageContainerBox}>
              {selectedFloor.imagen && !/via\.placeholder\.com/.test(selectedFloor.imagen) ? (
                <Box sx={STYLES.floorImageRelativeBox}>
                  <Box
                    component="img"
                    src={getFullImageUrl(selectedFloor.imagen)}
                    alt={selectedFloor.nombre_piso}
                    sx={STYLES.floorImg}
                  />
                  {selectedFloor.disponibilidad === 'En mantenimiento' && (
                    <Box sx={STYLES.maintenanceFloorBanner}>
                      ⚠️ EN MANTENIMIENTO
                    </Box>
                  )}
                </Box>
              ) : (
                <Box sx={STYLES.noFloorImageBox}>
                  <Typography variant="h6" color="text.secondary">
                    Foto del piso no disponible
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Contador de salas */}
            {rooms && rooms.filter(r => r.estado).length > 0 && (
              <Box sx={STYLES.roomsCounterBox}>
                <Typography variant="h6" fontWeight="bold">
                  Salas
                </Typography>
              </Box>
            )}

            {/* Lista de salas */}
            {rooms && rooms.filter(r => r.estado).length > 0 ? (
              <Box sx={STYLES.roomsListBox}>
                <Box sx={STYLES.roomsColumnBox}>
                  {rooms.filter(r => r.estado).map((room) => (
                    <Card
                      key={room.id_sala}
                      variant="outlined"
                      sx={STYLES.roomCard}
                    >
                      <CardContent sx={roomCardContentSx}>
                        <Box sx={STYLES.roomInfoBox}>
                          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            {room.nombre_sala}
                          </Typography>
                          
                          {/* Chips de información */}
                          <Box sx={STYLES.roomChipsBox}>
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
                              sx={STYLES.capacityChip}
                            />
                          </Box>

                          {/* Estado y Disponibilidad - ELIMINADO */}
                        </Box>

                        <Box sx={roomActionBoxSx}>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => {
                              if (onRoomClick) {
                                onRoomClick(room)
                              }
                            }}
                            sx={roomActionButtonSx}
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
              <Box sx={STYLES.noRoomsBox}>
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

    {/* Modal de Compartir + QR */}
    <Dialog
      open={shareQRDialogOpen}
      onClose={() => setShareQRDialogOpen(false)}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: STYLES.shareQRDialogPaper }}
    >
      <DialogTitle sx={STYLES.shareQRDialogTitle}>
        <Typography variant="h6" sx={STYLES.shareQRTitleTypography}>Compartir ubicacion</Typography>
        <IconButton
          onClick={() => setShareQRDialogOpen(false)}
          size="small"
          sx={STYLES.shareQRCloseButton}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={STYLES.shareQRDialogContent}>
        {building && (
          <>
            {/* Sección de QR */}
            <Box>
              <Typography variant="subtitle1" sx={STYLES.sectionTitleText}>Código QR</Typography>
              <Box sx={STYLES.qrCenterBox}>
                <QRCodeButton
                  latitude={building.cord_latitud}
                  longitude={building.cord_longitud}
                  type="building"
                  id={building.id_edificio}
                  name={building.nombre_edificio}
                  size="small"
                  fullWidth
                />
              </Box>
              <Typography variant="caption" sx={STYLES.captionText}>Escanea con tu celular para compartir la ubicación</Typography>
            </Box>

            <Divider sx={STYLES.shareQRDivider} />

            {/* Sección de Compartir */}
            <Box>
              <Typography variant="subtitle1" sx={STYLES.sectionTitleText}>Compartir Enlace</Typography>
              <ShareLocationButton
                latitude={building.cord_latitud}
                longitude={building.cord_longitud}
                type="building"
                id={building.id_edificio}
                name={building.nombre_edificio}
                size="small"
                fullWidth
              />
              <Typography variant="caption" sx={STYLES.captionText}>Copia el enlace y comparte con tus amigos</Typography>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}
