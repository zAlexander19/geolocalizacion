import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  InputAdornment,
} from '@mui/material'
import {
  Search as SearchIcon,
  Business as BusinessIcon,
  Layers as LayersIcon,
  MeetingRoom as RoomIcon,
  Wc as BathroomIcon,
  Restore as RestoreIcon,
  DeleteForever as DeleteForeverIcon,
} from '@mui/icons-material'
import { getFullImageUrl } from '../../../utils/imageUrl'
import api from '../../../lib/api'

export default function DeletedPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const queryClient = useQueryClient()
  const [filterType, setFilterType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const { data: deletedItems, isLoading } = useQuery({
    queryKey: ['deleted', filterType, searchQuery],
    queryFn: async () => {
      const params = {}
      if (filterType) params.type = filterType
      if (searchQuery) params.search = searchQuery
      const res = await api.get('/deleted', { params })
      return res.data.data
    },
  })

  const getEntityIcon = (type) => {
    switch (type) {
      case 'building': return <BusinessIcon />
      case 'floor': return <LayersIcon />
      case 'room': return <RoomIcon />
      case 'bathroom': return <BathroomIcon />
      default: return null
    }
  }

  const getEntityColor = (type) => {
    switch (type) {
      case 'building': return 'primary'
      case 'floor': return 'secondary'
      case 'room': return 'success'
      case 'bathroom': return 'warning'
      default: return 'default'
    }
  }

  const getItemName = (item) => {
    return item.nombre_edificio || item.nombre_piso || item.nombre_sala || item.nombre_bano || 'Sin nombre'
  }

  const getItemId = (item) => {
    switch (item.entity_type) {
      case 'building':
        return item.id_edificio
      case 'floor':
        return item.id_piso
      case 'room':
        return item.id_sala
      case 'bathroom':
        return item.id_bano
      default:
        return null
    }
  }

  const restoreMutation = useMutation({
    mutationFn: ({ type, id }) => api.patch(`/deleted/${type}/${id}/restore`),
    onSuccess: async () => {
      // Invalidar y esperar a que se refresquen todas las queries
      await queryClient.invalidateQueries({ queryKey: ['deleted'] })
      await queryClient.invalidateQueries({ queryKey: ['buildings'] })
      await queryClient.invalidateQueries({ queryKey: ['all-floors'] })
      await queryClient.refetchQueries({ queryKey: ['deleted'] })
      setConfirmRestoreOpen(false)
      setSelectedItem(null)
    },
    onError: (error) => {
      alert('Error al restaurar: ' + (error.response?.data?.message || error.message))
    }
  })

  const deletePermanentMutation = useMutation({
    mutationFn: ({ type, id }) => api.delete(`/deleted/${type}/${id}/permanent`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted'], refetchType: 'active' })
      queryClient.refetchQueries({ queryKey: ['deleted'] })
      setConfirmDeleteOpen(false)
      setSelectedItem(null)
    },
    onError: (error) => {
      alert('Error al eliminar: ' + (error.response?.data?.message || error.message))
    }
  })

  const handleRestore = (item) => {
    setSelectedItem(item)
    setConfirmRestoreOpen(true)
  }

  const handlePermanentDelete = (item) => {
    setSelectedItem(item)
    setConfirmDeleteOpen(true)
  }

  const confirmRestore = () => {
    if (selectedItem) {
      const itemId = getItemId(selectedItem)
      console.log('Restaurando:', { type: selectedItem.entity_type, id: itemId, selectedItem })
      restoreMutation.mutate({
        type: selectedItem.entity_type,
        id: itemId
      })
    }
  }

  const confirmPermanentDelete = () => {
    if (selectedItem) {
      deletePermanentMutation.mutate({
        type: selectedItem.entity_type,
        id: getItemId(selectedItem)
      })
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 'bold', mb: isMobile ? 2 : 0 }}>
          Elementos Eliminados
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          Aquí puedes ver todos los elementos que han sido marcados como eliminados del sistema
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: 2, 
          alignItems: isMobile ? 'stretch' : 'center',
        }}>
          <TextField
            placeholder="Buscar por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ minWidth: isMobile ? '100%' : 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 200 }}>
            <InputLabel>Filtrar por tipo</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              label="Filtrar por tipo"
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="buildings">Edificios</MenuItem>
              <MenuItem value="floors">Pisos</MenuItem>
              <MenuItem value="rooms">Salas</MenuItem>
              <MenuItem value="bathrooms">Baños</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {isLoading ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Cargando...
          </Typography>
        </Paper>
      ) : !deletedItems || deletedItems.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No hay elementos eliminados
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Vista Mobile - Cards */}
          {isMobile ? (
            <Grid container spacing={2}>
              {deletedItems.map((item) => (
                <Grid item xs={12} key={`${item.entity_type}-${getItemId(item)}`}>
                  <Card>
                    {item.imagen && !/via\.placeholder\.com/.test(item.imagen) && (
                      <Box
                        component="img"
                        src={getFullImageUrl(item.imagen)}
                        alt={getItemName(item)}
                        sx={{ width: '100%', height: 140, objectFit: 'cover' }}
                      />
                    )}
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                          {getItemName(item)}
                        </Typography>
                        <Chip 
                          icon={getEntityIcon(item.entity_type)}
                          label={item.entity_name} 
                          color={getEntityColor(item.entity_type)}
                          size="small" 
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        <strong>ID:</strong> {getItemId(item)}
                      </Typography>
                      {item.acronimo && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Acrónimo:</strong> {item.acronimo}
                        </Typography>
                      )}
                      {item.id_edificio && item.entity_type !== 'building' && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>ID Edificio:</strong> {item.id_edificio}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        <Button
                          variant="outlined"
                          color="success"
                          size="small"
                          startIcon={<RestoreIcon />}
                          onClick={() => handleRestore(item)}
                          sx={{ flex: 1 }}
                        >
                          Restaurar
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<DeleteForeverIcon />}
                          onClick={() => handlePermanentDelete(item)}
                          sx={{ flex: 1 }}
                        >
                          Eliminar
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            /* Vista Desktop - Tabla */
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>ID</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Acrónimo</TableCell>
                    <TableCell>Imagen</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deletedItems.map((item) => (
                    <TableRow key={`${item.entity_type}-${getItemId(item)}`} hover>
                      <TableCell>{getItemId(item)}</TableCell>
                      <TableCell>
                        <Chip 
                          icon={getEntityIcon(item.entity_type)}
                          label={item.entity_name} 
                          color={getEntityColor(item.entity_type)}
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{item.acronimo || '-'}</TableCell>
                      <TableCell>
                        {item.imagen && !/via\.placeholder\.com/.test(item.imagen) ? (
                          <Box
                            component="img"
                            src={getFullImageUrl(item.imagen)}
                            alt={getItemName(item)}
                            sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1 }}
                          />
                        ) : (
                          <Box sx={{ 
                            width: 60, 
                            height: 60, 
                            bgcolor: 'grey.200', 
                            borderRadius: 1, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}>
                            <Typography variant="caption" color="text.secondary">
                              Sin imagen
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Restaurar">
                          <IconButton 
                            size="small" 
                            color="success"
                            onClick={() => handleRestore(item)}
                          >
                            <RestoreIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar permanentemente">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handlePermanentDelete(item)}
                          >
                            <DeleteForeverIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Modal de confirmación de restauración */}
      <Dialog
        open={confirmRestoreOpen}
        onClose={() => {
          setConfirmRestoreOpen(false)
          setSelectedItem(null)
        }}
        maxWidth="sm"
        fullWidth
        aria-labelledby="restore-dialog-title"
        aria-describedby="restore-dialog-description"
      >
        <DialogTitle id="restore-dialog-title" sx={{ bgcolor: 'success.main', color: 'white', fontWeight: 'bold' }}>
          Confirmar restauración
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Box id="restore-dialog-description" sx={{ textAlign: 'center', mb: 2 }}>
            <RestoreIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              ¿Deseas restaurar este elemento?
            </Typography>
            {selectedItem && (
              <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
                <Chip
                  icon={getEntityIcon(selectedItem.entity_type)}
                  label={selectedItem.entity_name}
                  color={getEntityColor(selectedItem.entity_type)}
                  sx={{ mb: 1 }}
                />
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {getItemName(selectedItem)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ID: {getItemId(selectedItem)}
                </Typography>
              </Paper>
            )}
            <Paper sx={{ p: 2, bgcolor: 'success.light', mt: 2 }}>
              <Typography variant="body2" sx={{ color: 'success.dark', fontWeight: 'medium' }}>
                ✓ El elemento volverá a estar disponible en el sistema
              </Typography>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => {
              setConfirmRestoreOpen(false)
              setSelectedItem(null)
            }}
            variant="outlined"
            fullWidth={isMobile}
            sx={{ flex: 1 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmRestore}
            variant="contained"
            color="success"
            disabled={restoreMutation.isPending}
            fullWidth={isMobile}
            sx={{ flex: 1 }}
          >
            {restoreMutation.isPending ? 'Restaurando...' : 'Restaurar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de confirmación para eliminar permanentemente */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false)
          setSelectedItem(null)
        }}
        maxWidth="sm"
        fullWidth
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title" sx={{ bgcolor: 'error.main', color: 'white', fontWeight: 'bold' }}>
          Eliminar permanentemente
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Box id="delete-dialog-description" sx={{ textAlign: 'center', mb: 2 }}>
            <DeleteForeverIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              ¿Estás seguro de eliminar permanentemente?
            </Typography>
            {selectedItem && (
              <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
                <Chip
                  icon={getEntityIcon(selectedItem.entity_type)}
                  label={selectedItem.entity_name}
                  color={getEntityColor(selectedItem.entity_type)}
                  sx={{ mb: 1 }}
                />
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {getItemName(selectedItem)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ID: {getItemId(selectedItem)}
                </Typography>
              </Paper>
            )}
            <Paper sx={{ p: 2, bgcolor: 'error.light', mt: 2 }}>
              <Typography variant="body2" sx={{ color: 'error.dark', fontWeight: 'bold' }}>
                ⚠️ Esta acción NO se puede deshacer
              </Typography>
              <Typography variant="body2" sx={{ color: 'error.dark', mt: 1 }}>
                El elemento será eliminado de la base de datos permanentemente
              </Typography>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => {
              setConfirmDeleteOpen(false)
              setSelectedItem(null)
            }}
            variant="outlined"
            fullWidth={isMobile}
            sx={{ flex: 1 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmPermanentDelete}
            variant="contained"
            color="error"
            disabled={deletePermanentMutation.isPending}
            fullWidth={isMobile}
            sx={{ flex: 1 }}
          >
            {deletePermanentMutation.isPending ? 'Eliminando...' : 'Eliminar permanentemente'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
