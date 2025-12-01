import { useEffect, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
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
  Typography,
  IconButton,
  Chip,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material'
import api from '../../../lib/api'
import BuildingDetailsModal from '../../../components/BuildingDetailsModal'
import MapLocationPicker from '../../../components/MapLocationPicker'

export default function BuildingsPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [filterBuilding, setFilterBuilding] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState(null)
  const [mapCoordinates, setMapCoordinates] = useState({ latitude: -33.0367, longitude: -71.5963 })

  const { control, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      nombre_edificio: '',
      acronimo: '',
      descripcion: '',
      imagen: '',
      cord_latitud: 0,
      cord_longitud: 0,
      estado: true,
      disponibilidad: 'Disponible',
    }
  })

  const { data: buildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => {
      const res = await api.get('/buildings')
      return res.data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await api.post('/buildings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['buildings'])
      setOpen(false)
      reset()
      setImageFile(null)
      setImagePreviewUrl(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }) => {
      const res = await api.put(`/buildings/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['buildings'])
      setOpen(false)
      reset()
      setEditId(null)
      setImageFile(null)
      setImagePreviewUrl(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/buildings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['buildings'])
    },
  })

  const handleViewDetails = (building) => {
    setSelectedBuilding(building)
    setDetailsModalOpen(true)
  }

  useEffect(() => {
    if (open) {
      if (editId) {
        const b = buildings?.find(x => x.id_edificio === editId)
        if (b) {
          setValue('nombre_edificio', b.nombre_edificio)
          setValue('acronimo', b.acronimo)
          setValue('descripcion', b.descripcion || '')
          setValue('imagen', b.imagen || '')
          setValue('cord_latitud', b.cord_latitud)
          setValue('cord_longitud', b.cord_longitud)
          setMapCoordinates({ latitude: b.cord_latitud, longitude: b.cord_longitud })
          setValue('estado', b.estado)
          setValue('disponibilidad', b.disponibilidad)
          setImagePreviewUrl(b.imagen ? (b.imagen.startsWith('http') ? b.imagen : `http://localhost:4000${b.imagen}`) : null)
        }
      } else {
        reset()
        setImageFile(null)
        setImagePreviewUrl(null)
      }
    }
  }, [open, editId, buildings, reset, setValue])

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
      // Validar dimensiones de la imagen
      const img = new Image()
      const reader = new FileReader()
      
      reader.onload = (event) => {
        img.onload = () => {
          if (img.width === 1600 && img.height === 1200) {
            setImageFile(file)
            setImagePreviewUrl(event.target.result)
          } else {
            alert(`La imagen debe tener exactamente 1600x1200 píxeles. Imagen seleccionada: ${img.width}x${img.height} píxeles`)
            e.target.value = '' // Limpiar el input
          }
        }
        img.src = event.target.result
      }
      
      reader.readAsDataURL(file)
    } else if (file) {
      alert('Por favor selecciona un archivo PNG o JPG')
    }
  }

  const onSubmit = (data) => {
    const formData = new FormData()
    formData.append('nombre_edificio', data.nombre_edificio)
    formData.append('acronimo', data.acronimo)
    if (data.descripcion) {
      formData.append('descripcion', data.descripcion)
    }
    formData.append('cord_latitud', data.cord_latitud)
    formData.append('cord_longitud', data.cord_longitud)
    formData.append('estado', data.estado)
    formData.append('disponibilidad', data.disponibilidad)
    
    if (imageFile) {
      formData.append('imagen', imageFile)
    }

    if (editId) {
      updateMutation.mutate({ id: editId, formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (id) => {
    setEditId(id)
    setOpen(true)
  }

  const handleDelete = (id) => {
    if (confirm('¿Eliminar edificio?')) {
      deleteMutation.mutate(id)
    }
  }

  const filteredBuildings = buildings?.filter(b => {
    const matchesSearch = searchQuery.trim() === '' || 
      b.nombre_edificio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.acronimo.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterBuilding === '' || b.id_edificio === filterBuilding
    return matchesSearch && matchesFilter
  })

  const handleMapCoordinatesChange = useCallback((coords) => {
    setMapCoordinates(coords)
    setValue('cord_latitud', coords.latitude)
    setValue('cord_longitud', coords.longitude)
  }, [setValue])

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 'bold', mb: isMobile ? 2 : 0 }}>Edificios</Typography>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: 2, 
          alignItems: isMobile ? 'stretch' : 'center',
          mt: isMobile ? 2 : 3,
        }}>
          <TextField
            placeholder="Buscar edificios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            fullWidth={isMobile}
            sx={{ minWidth: isMobile ? 'auto' : 250 }}
          />
          <FormControl size="small" fullWidth={isMobile} sx={{ minWidth: isMobile ? 'auto' : 200 }}>
            <InputLabel>Filtrar por edificio</InputLabel>
            <Select
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
              label="Filtrar por edificio"
            >
              <MenuItem value="">Todos</MenuItem>
              {buildings?.sort((a, b) => a.nombre_edificio.localeCompare(b.nombre_edificio)).map(b => (
                <MenuItem key={b.id_edificio} value={b.id_edificio}>{b.nombre_edificio}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button 
            variant="contained" 
            startIcon={!isMobile && <AddIcon />} 
            onClick={() => { 
              setEditId(null)
              setMapCoordinates({ latitude: -33.0367, longitude: -71.5963 })
              reset()
              setImageFile(null)
              setImagePreviewUrl(null)
              setOpen(true)
            }}
            fullWidth={isMobile}
            sx={{
              background: 'rgba(0, 0, 0, 0.85) !important',
              color: 'white !important',
              '&:hover': {
                background: 'rgba(0, 0, 0, 0.95) !important',
              }
            }}
          >
            {isMobile ? '+ Agregar' : 'Agregar Edificio'}
          </Button>
        </Box>
      </Box>

      {/* Vista Mobile - Cards */}
      {isMobile ? (
        <Grid container spacing={2}>
          {filteredBuildings && filteredBuildings.length > 0 ? (
            filteredBuildings.map((b) => (
              <Grid item xs={12} key={b.id_edificio}>
                <Card>
                  {b.imagen && !/via\.placeholder\.com/.test(b.imagen) && (
                    <CardMedia
                      component="img"
                      height="140"
                      image={b.imagen.startsWith('http') ? b.imagen : `http://localhost:4000${b.imagen}`}
                      alt={b.nombre_edificio}
                    />
                  )}
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                      <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                        {b.nombre_edificio}
                      </Typography>
                      <Chip 
                        label={b.estado ? 'Activo' : 'Inactivo'} 
                        color={b.estado ? 'success' : 'default'} 
                        size="small" 
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>Acrónimo:</strong> {b.acronimo}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>Coordenadas:</strong> {b.cord_latitud}, {b.cord_longitud}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                      <Button 
                        size="small" 
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => handleEdit(b.id_edificio)}
                        sx={{ flex: 1 }}
                      >
                        Editar
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDelete(b.id_edificio)}
                        sx={{ flex: 1 }}
                      >
                        Eliminar
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No se encontraron edificios
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      ) : (
        /* Vista Desktop - Tabla */
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell>ID</TableCell>
                <TableCell>Imagen</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Acrónimo</TableCell>
                <TableCell>Latitud</TableCell>
                <TableCell>Longitud</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBuildings && filteredBuildings.length > 0 ? (
                filteredBuildings.map((b) => (
                  <TableRow key={b.id_edificio} hover>
                    <TableCell>{b.id_edificio}</TableCell>
                    <TableCell>
                      {b.imagen && !/via\.placeholder\.com/.test(b.imagen) ? (
                        <Box
                          component="img"
                          src={b.imagen.startsWith('http') ? b.imagen : `http://localhost:4000${b.imagen}`}
                          alt={b.nombre_edificio}
                          sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1, cursor: 'pointer' }}
                          onClick={() => setImagePreview(b.imagen.startsWith('http') ? b.imagen : `http://localhost:4000${b.imagen}`)}
                        />
                      ) : (
                        <Box sx={{ width: 60, height: 60, bgcolor: 'grey.200', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="caption" color="text.secondary">Sin imagen</Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>{b.nombre_edificio}</TableCell>
                    <TableCell>{b.acronimo}</TableCell>
                    <TableCell>{b.cord_latitud}</TableCell>
                    <TableCell>{b.cord_longitud}</TableCell>
                    <TableCell>
                      <Chip label={b.estado ? 'Activo' : 'Inactivo'} color={b.estado ? 'success' : 'default'} size="small" />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => handleEdit(b.id_edificio)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => handleDelete(b.id_edificio)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No se encontraron edificios
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Editar Edificio' : 'Nuevo Edificio'}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Controller
              name="nombre_edificio"
              control={control}
              render={({ field }) => <TextField {...field} label="Nombre Edificio" fullWidth required />}
            />
            <Controller
              name="acronimo"
              control={control}
              render={({ field }) => <TextField {...field} label="Acrónimo" fullWidth />}
            />
            <Controller
              name="descripcion"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Descripción (Opcional)"
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Describe el edificio..."
                />
              )}
            />
            <Box>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                sx={{ mb: 1 }}
              >
                Subir Imagen (PNG/JPG)
                <input
                  type="file"
                  hidden
                  accept="image/png,image/jpeg"
                  onChange={handleImageChange}
                />
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Dimensiones requeridas: 1600x1200 píxeles
              </Typography>
              {imagePreviewUrl && (
                <Box
                  component="img"
                  src={imagePreviewUrl}
                  alt="Preview"
                  sx={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 1, border: 1, borderColor: 'divider' }}
                />
              )}
            </Box>
            
            <MapLocationPicker
              latitude={mapCoordinates.latitude}
              longitude={mapCoordinates.longitude}
              onChange={handleMapCoordinatesChange}
            />
            
            <Controller
              name="estado"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select {...field} label="Estado">
                    <MenuItem value={true}>Activo</MenuItem>
                    <MenuItem value={false}>Inactivo</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="disponibilidad"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Disponibilidad</InputLabel>
                  <Select {...field} label="Disponibilidad">
                    <MenuItem value="Disponible">Disponible</MenuItem>
                    <MenuItem value="En mantenimiento">En mantenimiento</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit)}>
            {editId ? 'Guardar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para preview de imagen */}
      <Dialog open={!!imagePreview} onClose={() => setImagePreview(null)} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: 0 }}>
          <Box
            component="img"
            src={imagePreview}
            alt="Preview"
            sx={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImagePreview(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de detalles del edificio con pisos y salas */}
      <BuildingDetailsModal
        building={selectedBuilding}
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false)
          setSelectedBuilding(null)
        }}
      />
    </Box>
  )
}
