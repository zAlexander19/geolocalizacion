import { useEffect, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { getFullImageUrl } from '../../../utils/imageUrl'
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
  InputAdornment,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import api from '../../../lib/api'
import MapLocationPicker from '../../../components/MapLocationPicker'

export default function RoomsPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [filterBuilding, setFilterBuilding] = useState('')
  const [filterFloor, setFilterFloor] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [mapCoordinates, setMapCoordinates] = useState({ latitude: -33.0367, longitude: -71.5963 })
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState(null)

  const { control, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      id_piso: '',
      nombre_sala: '',
      acronimo: '',
      descripcion: '',
      imagen: '',
      capacidad: 0,
      tipo_sala: '',
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

  const { data: allFloorsData } = useQuery({
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

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await api.get('/rooms')
      return res.data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await api.post('/rooms', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rooms'])
      setOpen(false)
      reset()
      setImageFile(null)
      setImagePreviewUrl(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }) => {
      const res = await api.put(`/rooms/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rooms'])
      setOpen(false)
      reset()
      setEditId(null)
      setImageFile(null)
      setImagePreviewUrl(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/rooms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['deleted'], refetchType: 'active' })
      queryClient.refetchQueries({ queryKey: ['rooms'] })
      queryClient.refetchQueries({ queryKey: ['deleted'] })
      setDeleteConfirmOpen(false)
      setRoomToDelete(null)
    },
  })

  useEffect(() => {
    if (open) {
      if (editId) {
        const r = rooms?.find(x => x.id_sala === editId)
        if (r) {
          // Find the building of this floor
          const floor = allFloorsData?.find(f => f.id_piso === r.id_piso)
          if (floor) {
            setSelectedBuilding(floor.id_edificio)
          }
          setValue('id_piso', r.id_piso)
          setValue('nombre_sala', r.nombre_sala)
          setValue('acronimo', r.acronimo || '')
          setValue('descripcion', r.descripcion || '')
          setValue('imagen', r.imagen || '')
          setValue('capacidad', r.capacidad)
          setValue('tipo_sala', r.tipo_sala)
          setValue('cord_latitud', r.cord_latitud)
          setValue('cord_longitud', r.cord_longitud)
          setMapCoordinates({ latitude: r.cord_latitud, longitude: r.cord_longitud })
          setValue('estado', r.estado)
          setValue('disponibilidad', r.disponibilidad)
          setImagePreviewUrl(r.imagen ? getFullImageUrl(r.imagen) : null)
        }
      } else {
        reset()
        setImageFile(null)
        setImagePreviewUrl(null)
        setSelectedBuilding('')
      }
    }
  }, [open, editId, rooms, allFloorsData, reset, setValue])

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
      // Validar dimensiones de la imagen
      const img = new Image()
      const reader = new FileReader()
      
      reader.onload = (event) => {
        img.onload = () => {
          // Validar que las dimensiones estén en un rango razonable (entre 500 y 1800 píxeles)
          const isValidWidth = img.width >= 500 && img.width <= 1800
          const isValidHeight = img.height >= 500 && img.height <= 1800
          
          if (isValidWidth && isValidHeight) {
            setImageFile(file)
            setImagePreviewUrl(event.target.result)
          } else {
            alert(`La imagen debe tener dimensiones entre 500x500 y 1800x1800 píxeles. Imagen seleccionada: ${img.width}x${img.height} píxeles`)
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
    formData.append('id_piso', data.id_piso)
    formData.append('nombre_sala', data.nombre_sala)
    formData.append('acronimo', data.acronimo)
    if (data.descripcion) {
      formData.append('descripcion', data.descripcion)
    }
    formData.append('capacidad', data.capacidad)
    formData.append('tipo_sala', data.tipo_sala)
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
    setRoomToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = () => {
    if (roomToDelete) {
      deleteMutation.mutate(roomToDelete)
    }
  }

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false)
    setRoomToDelete(null)
  }

  const getFloorName = (id_piso) => {
    const f = allFloorsData?.find(x => x.id_piso === id_piso)
    return f ? f.nombre_piso : '—'
  }

  // Pisos filtrados según el edificio seleccionado
  const filteredFloors = filterBuilding 
    ? allFloorsData?.filter(f => f.id_edificio === filterBuilding)
    : []

  // Salas filtradas por búsqueda o por edificio/piso
  const filteredRooms = (() => {
    if (!rooms) return []
    
    let result = rooms
    
    // Filtrar por búsqueda si hay texto
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(r => {
        const nombre = r.nombre_sala?.toLowerCase() || ''
        const acronimo = r.acronimo?.toLowerCase() || ''
        return nombre.includes(query) || acronimo.includes(query)
      })
    }
    
    // Filtrar por edificio si está seleccionado
    if (filterBuilding) {
      result = result.filter(r => {
        const floor = allFloorsData?.find(f => f.id_piso === r.id_piso)
        return floor && floor.id_edificio === filterBuilding
      })
    }
    
    // Filtrar por piso si está seleccionado
    if (filterFloor) {
      result = result.filter(r => r.id_piso === filterFloor)
    }
    
    return result
  })()

  const handleMapCoordinatesChange = useCallback((coords) => {
    setMapCoordinates(coords)
    setValue('cord_latitud', coords.latitude)
    setValue('cord_longitud', coords.longitude)
  }, [setValue])

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 'bold', mb: isMobile ? 2 : 0 }}>Salas</Typography>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: 2, 
          alignItems: isMobile ? 'stretch' : 'center',
          mt: isMobile ? 2 : 3,
        }}>
          <TextField
            placeholder="Buscar por nombre o acrónimo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            fullWidth={isMobile}
            sx={{ minWidth: isMobile ? 'auto' : 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" fullWidth={isMobile} sx={{ minWidth: isMobile ? 'auto' : 180 }}>
            <InputLabel>Filtrar por edificio</InputLabel>
            <Select
              value={filterBuilding}
              onChange={(e) => {
                setFilterBuilding(e.target.value)
                setFilterFloor('') // Reset floor filter when building changes
              }}
              label="Filtrar por edificio"
            >
              <MenuItem value="">Todos</MenuItem>
              {buildings?.sort((a, b) => a.nombre_edificio.localeCompare(b.nombre_edificio)).map(b => (
                <MenuItem key={b.id_edificio} value={b.id_edificio}>{b.nombre_edificio}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth={isMobile} sx={{ minWidth: isMobile ? 'auto' : 180 }} disabled={!filterBuilding}>
            <InputLabel>Filtrar por piso</InputLabel>
            <Select
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              label="Filtrar por piso"
            >
              <MenuItem value="">Todos</MenuItem>
              {filteredFloors?.sort((a, b) => a.nombre_piso.localeCompare(b.nombre_piso)).map(f => (
                <MenuItem key={f.id_piso} value={f.id_piso}>{f.nombre_piso}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button 
            variant="contained" 
            startIcon={!isMobile && <AddIcon />} 
            onClick={() => { setEditId(null); setOpen(true) }}
            fullWidth={isMobile}
          >
            {isMobile ? '+ Agregar' : 'Agregar Sala'}
          </Button>
        </Box>
      </Box>

      {/* Vista Mobile - Cards */}
      {isMobile ? (
        <Grid container spacing={2}>
          {filteredRooms && filteredRooms.length > 0 ? (
            filteredRooms.map((r) => (
              <Grid item xs={12} key={r.id_sala}>
                <Card>
                  {r.imagen && !/via\.placeholder\.com/.test(r.imagen) && (
                    <CardMedia
                      component="img"
                      height="140"
                      image={getFullImageUrl(r.imagen)}
                      alt={r.nombre_sala}
                    />
                  )}
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                      <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                        {r.nombre_sala}
                      </Typography>
                      <Chip 
                        label={r.estado ? 'Activa' : 'Inactiva'} 
                        color={r.estado ? 'success' : 'default'} 
                        size="small" 
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>Acrónimo:</strong> {r.acronimo || '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>Tipo:</strong> {r.tipo_sala} | <strong>Capacidad:</strong> {r.capacidad}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      <strong>Piso:</strong> {getFloorName(r.id_piso)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <Button 
                        size="small" 
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => handleEdit(r.id_sala)}
                        fullWidth
                      >
                        Editar
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDelete(r.id_sala)}
                        fullWidth
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
                  No se encontraron salas
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
                <TableCell>Tipo</TableCell>
                <TableCell>Capacidad</TableCell>
                <TableCell>Piso</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRooms?.map((r) => (
                <TableRow key={r.id_sala} hover>
                  <TableCell>{r.id_sala}</TableCell>
                  <TableCell>
                    {r.imagen && !/via\.placeholder\.com/.test(r.imagen) ? (
                      <Box
                        component="img"
                        src={getFullImageUrl(r.imagen)}
                        alt={r.nombre_sala}
                        sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1, cursor: 'pointer' }}
                        onClick={() => setImagePreview(getFullImageUrl(r.imagen))}
                      />
                    ) : (
                      <Box sx={{ width: 60, height: 60, bgcolor: 'grey.200', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="caption" color="text.secondary">Sin imagen</Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>{r.nombre_sala}</TableCell>
                  <TableCell>{r.acronimo || '-'}</TableCell>
                  <TableCell>{r.tipo_sala}</TableCell>
                  <TableCell>{r.capacidad}</TableCell>
                  <TableCell>{getFloorName(r.id_piso)}</TableCell>
                  <TableCell>
                    <Chip label={r.estado ? 'Activa' : 'Inactiva'} color={r.estado ? 'success' : 'default'} size="small" />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEdit(r.id_sala)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(r.id_sala)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRooms.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No se encontraron salas
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Editar Sala' : 'Nueva Sala'}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Edificio</InputLabel>
              <Select
                value={selectedBuilding}
                onChange={(e) => {
                  setSelectedBuilding(e.target.value)
                  setValue('id_piso', '') // Reset floor when building changes
                }}
                label="Edificio"
              >
                <MenuItem value="">-- Seleccionar --</MenuItem>
                {buildings?.map(b => (
                  <MenuItem key={b.id_edificio} value={b.id_edificio}>{b.nombre_edificio}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Controller
              name="id_piso"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth required disabled={!selectedBuilding}>
                  <InputLabel>Piso</InputLabel>
                  <Select {...field} label="Piso">
                    {allFloorsData
                      ?.filter(f => f.id_edificio === selectedBuilding)
                      .map(f => (
                        <MenuItem key={f.id_piso} value={f.id_piso}>{f.nombre_piso}</MenuItem>
                      ))}
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="nombre_sala"
              control={control}
              render={({ field }) => <TextField {...field} label="Nombre Sala" fullWidth required />}
            />
            <Controller
              name="acronimo"
              control={control}
              render={({ field }) => <TextField {...field} label="Acrónimo" fullWidth required />}
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
                  placeholder="Describe la sala..."
                />
              )}
            />
            <Controller
              name="tipo_sala"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Tipo Sala</InputLabel>
                  <Select {...field} label="Tipo Sala">
                    <MenuItem value="">-- Seleccionar --</MenuItem>
                    <MenuItem value="Aula">Aula</MenuItem>
                    <MenuItem value="Laboratorio">Laboratorio</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="capacidad"
              control={control}
              render={({ field }) => <TextField {...field} label="Capacidad" type="number" fullWidth />}
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
                Dimensiones requeridas: 500-1800 píxeles (ancho y alto)
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
                    <MenuItem value={true}>Activa</MenuItem>
                    <MenuItem value={false}>Inactiva</MenuItem>
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

      {/* Modal de confirmación de eliminación */}
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={handleCancelDelete}
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'warning.dark',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          Confirmar eliminación
        </DialogTitle>
        <DialogContent>
          <Typography>
            ¿Está seguro de que desea eliminar esta sala?
          </Typography>
          <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
            La sala será enviada a la sección de elementos eliminados donde podrá recuperarla o eliminarla permanentemente.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCancelDelete}
            sx={{ color: 'white' }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
