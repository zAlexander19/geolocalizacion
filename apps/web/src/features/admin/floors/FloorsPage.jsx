import { useEffect, useState } from 'react'
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
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import api from '../../../lib/api'

export default function FloorsPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [filterBuilding, setFilterBuilding] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [floorToDelete, setFloorToDelete] = useState(null)
  const [deleteDependencies, setDeleteDependencies] = useState(null)

  const { control, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      id_edificio: '',
      nombre_piso: '',
      numero_piso: 0,
      imagen: '',
      estado: true,
      disponibilidad: 'Disponible',
    }
  })

  const idEdificio = watch('id_edificio')

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

  const createMutation = useMutation({
    mutationFn: async ({ id_edificio, formData }) => {
      const res = await api.post(`/buildings/${id_edificio}/floors`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-floors'])
      setOpen(false)
      reset()
      setImageFile(null)
      setImagePreviewUrl(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }) => {
      const res = await api.put(`/floors/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-floors'])
      setOpen(false)
      reset()
      setEditId(null)
      setImageFile(null)
      setImagePreviewUrl(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/floors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-floors'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['deleted'], refetchType: 'active' })
      queryClient.refetchQueries({ queryKey: ['all-floors'] })
      queryClient.refetchQueries({ queryKey: ['deleted'] })
      setDeleteConfirmOpen(false)
      setFloorToDelete(null)
      setDeleteDependencies(null)
    },
    onError: (error) => {
      if (error.response?.data?.error === 'DEPENDENCIAS_ENCONTRADAS') {
        setDeleteDependencies(error.response.data.dependencias)
      } else {
        alert(error.response?.data?.message || 'Error al eliminar piso')
        setDeleteConfirmOpen(false)
        setFloorToDelete(null)
      }
    },
  })

  useEffect(() => {
    if (open && buildings) {
      if (editId) {
        const f = allFloorsData?.find(x => x.id_piso === editId)
        if (f) {
          // Asegurar que el id_edificio se establece correctamente
          const idEdificio = Number(f.id_edificio)
          console.log('Cargando piso para editar:', { id: editId, id_edificio: idEdificio, floor: f })
          
          reset({
            id_edificio: idEdificio,
            nombre_piso: f.nombre_piso,
            numero_piso: f.numero_piso ?? 0,
            imagen: f.imagen || '',
            estado: f.estado,
            disponibilidad: f.disponibilidad
          })
          setImagePreviewUrl(f.imagen ? getFullImageUrl(f.imagen) : null)
        }
      } else {
        reset({
          id_edificio: '',
          nombre_piso: '',
          numero_piso: 0,
          imagen: '',
          estado: true,
          disponibilidad: 'Disponible',
        })
        setImageFile(null)
        setImagePreviewUrl(null)
      }
    }
  }, [open, editId, allFloorsData, buildings, reset])

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
    formData.append('nombre_piso', data.nombre_piso)
    formData.append('numero_piso', data.numero_piso)
    formData.append('estado', true)
    formData.append('disponibilidad', data.disponibilidad)
    
    if (imageFile) {
      formData.append('imagen', imageFile)
    }

    if (editId) {
      updateMutation.mutate({ id: editId, formData })
    } else {
      createMutation.mutate({ id_edificio: data.id_edificio, formData })
    }
  }

  const handleEdit = (id) => {
    setEditId(id)
    setOpen(true)
  }

  const handleDelete = (id) => {
    setFloorToDelete(id)
    setDeleteDependencies(null)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = () => {
    if (floorToDelete) {
      deleteMutation.mutate(floorToDelete)
    }
  }

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false)
    setFloorToDelete(null)
    setDeleteDependencies(null)
  }

  const getBuildingName = (id_edificio) => {
    const b = buildings?.find(x => x.id_edificio === id_edificio)
    return b ? b.nombre_edificio : '—'
  }

  const filteredFloors = allFloorsData?.filter(f => {
    const matchesSearch = searchQuery.trim() === '' || 
      f.nombre_piso.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterBuilding === '' || f.id_edificio === filterBuilding
    return matchesSearch && matchesFilter
  })

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 'bold', mb: isMobile ? 2 : 0 }}>Pisos</Typography>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: 2, 
          alignItems: isMobile ? 'stretch' : 'center',
          mt: isMobile ? 2 : 3,
        }}>
          <TextField
            placeholder="Buscar pisos..."
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
            onClick={() => { setEditId(null); setOpen(true) }}
            fullWidth={isMobile}
          >
            {isMobile ? '+ Agregar' : 'Agregar Piso'}
          </Button>
        </Box>
      </Box>

      {/* Vista Mobile - Cards */}
      {isMobile ? (
        <Grid container spacing={2}>
          {filteredFloors && filteredFloors.length > 0 ? (
            filteredFloors.map((f) => (
              <Grid item xs={12} key={f.id_piso}>
                <Card>
                  {f.imagen && !/via\.placeholder\.com/.test(f.imagen) && (
                    <CardMedia
                      component="img"
                      height="140"
                      image={getFullImageUrl(f.imagen)}
                      alt={f.nombre_piso}
                    />
                  )}
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                      <Box>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                          {f.nombre_piso}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Piso {f.numero_piso ?? '—'}
                        </Typography>
                      </Box>
                      <Chip 
                        label={f.estado ? 'Activo' : 'Inactivo'} 
                        color={f.estado ? 'success' : 'default'} 
                        size="small" 
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      <strong>Edificio:</strong> {getBuildingName(f.id_edificio)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button 
                        size="small" 
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => handleEdit(f.id_piso)}
                        fullWidth
                      >
                        Editar
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDelete(f.id_piso)}
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
                  No se encontraron pisos
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
                <TableCell>Número</TableCell>
                <TableCell>Edificio</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFloors && filteredFloors.length > 0 ? (
                filteredFloors.map((f) => (
                  <TableRow key={f.id_piso} hover>
                    <TableCell>{f.id_piso}</TableCell>
                    <TableCell>
                      {f.imagen && !/via\.placeholder\.com/.test(f.imagen) ? (
                        <Box
                          component="img"
                          src={getFullImageUrl(f.imagen)}
                          alt={f.nombre_piso}
                          sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1, cursor: 'pointer' }}
                          onClick={() => setImagePreview(getFullImageUrl(f.imagen))}
                        />
                    ) : (
                      <Box sx={{ width: 60, height: 60, bgcolor: 'grey.200', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="caption" color="text.secondary">Sin imagen</Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>{f.nombre_piso}</TableCell>
                  <TableCell>{f.numero_piso ?? '—'}</TableCell>
                  <TableCell>{getBuildingName(f.id_edificio)}</TableCell>
                  <TableCell>
                    <Chip label={f.estado ? 'Activo' : 'Inactivo'} color={f.estado ? 'success' : 'default'} size="small" />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEdit(f.id_piso)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(f.id_piso)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No se encontraron pisos
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Editar Piso' : 'Nuevo Piso'}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {editId ? (
              <TextField
                label="Edificio"
                value={getBuildingName(watch('id_edificio')) || ''}
                disabled
                fullWidth
                required
                helperText="No se puede cambiar el edificio al editar"
                sx={{
                  '& .MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: 'white',
                    color: 'white'
                  },
                  '& .MuiFormHelperText-root': {
                    color: 'rgba(255, 255, 255, 0.7)'
                  }
                }}
              />
            ) : (
              <Controller
                name="id_edificio"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth required>
                    <InputLabel>Edificio</InputLabel>
                    <Select 
                      {...field} 
                      label="Edificio"
                      value={field.value || ''}
                    >
                      {buildings?.map(b => (
                        <MenuItem key={b.id_edificio} value={b.id_edificio}>{b.nombre_edificio}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            )}
            <Controller
              name="nombre_piso"
              control={control}
              render={({ field }) => <TextField {...field} label="Nombre Piso" fullWidth required />}
            />
            <Controller
              name="numero_piso"
              control={control}
              render={({ field }) => <TextField {...field} label="Número Piso" type="number" fullWidth />}
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
            bgcolor: deleteDependencies ? 'error.dark' : 'warning.dark',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {deleteDependencies ? (
            <>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              No se puede eliminar el piso
            </>
          ) : (
            <>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              Confirmar eliminación
            </>
          )}
        </DialogTitle>
        <DialogContent>
          {deleteDependencies ? (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                No se puede eliminar el piso porque tiene las siguientes salas asociadas:
              </Typography>
              
              {deleteDependencies.salas && deleteDependencies.salas.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Salas asociadas ({deleteDependencies.salas.length}):
                  </Typography>
                  <Box component="ul" sx={{ pl: 2 }}>
                    {deleteDependencies.salas.map(sala => (
                      <Box component="li" key={sala.id} sx={{ mb: 0.5 }}>
                        <Typography variant="body2">
                          {sala.nombre}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
              
              <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
                Para eliminar este piso, primero debe eliminar o reasignar todas las salas asociadas.
              </Typography>
            </Box>
          ) : (
            <Typography>
              ¿Está seguro de que desea eliminar este piso?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCancelDelete}
            sx={{ color: 'white' }}
          >
            {deleteDependencies ? 'Entendido' : 'Cancelar'}
          </Button>
          {!deleteDependencies && (
            <Button 
              onClick={handleConfirmDelete}
              variant="contained"
              color="error"
            >
              Eliminar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}
