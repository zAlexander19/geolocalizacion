
import { useEffect, useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
  Grid,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Map as MapIcon,
  LocationOn as LocationOnIcon,
} from '@mui/icons-material'
import api from '../../../lib/api'
import MapLocationPicker from '../../../components/MapLocationPicker'

export default function TotemsPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)
  const [mapCoordinates, setMapCoordinates] = useState({ latitude: -33.0367, longitude: -71.5963 })
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [totemToDelete, setTotemToDelete] = useState(null)

  const totemSchema = useMemo(() => z.object({
    nombre_totem: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
    descripcion: z.string().max(500, 'Máximo 500 caracteres').optional(),
    cord_latitud: z.number({ invalid_type_error: 'La latitud debe ser un número' })
      .min(-90, 'Latitud mínima: -90')
      .max(90, 'Latitud máxima: 90'),
    cord_longitud: z.number({ invalid_type_error: 'La longitud debe ser un número' })
      .min(-180, 'Longitud mínima: -180')
      .max(180, 'Longitud máxima: 180'),
    email: !editId 
      ? z.string().email('Email válido requerido') 
      : z.string().optional(),
    password: !editId 
      ? z.string().min(6, 'Mínimo 6 caracteres') 
      : z.string().optional(),
    confirmPassword: !editId 
      ? z.string().min(1, 'Confirma la contraseña')
      : z.string().optional()
  }).refine((data) => {
    if (!editId && data.password !== data.confirmPassword) {
      return false
    }
    return true
  }, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  }), [editId])

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(totemSchema),
    defaultValues: {
      nombre_totem: '',
      descripcion: '',
      cord_latitud: 0,
      cord_longitud: 0,
      email: '',
      password: '',
      confirmPassword: ''
    }
  })

  const { data: totems } = useQuery({
    queryKey: ['totems', searchQuery],
    queryFn: async () => {
      const res = await api.get('/totems', { params: { search: searchQuery } })
      return res.data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await api.post('/totems', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['totems'] })
      handleClose()
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Error al crear tótem')
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }) => {
      const res = await api.put(`/totems/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['totems'] })
      handleClose()
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Error al actualizar tótem')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/totems/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['totems'] })
      setConfirmDeleteOpen(false)
      setTotemToDelete(null)
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Error al eliminar tótem')
    }
  })

  const handleOpen = (totem = null) => {
    if (totem) {
      setEditId(totem.id_totem)
      setValue('nombre_totem', totem.nombre_totem)
      setValue('descripcion', totem.descripcion || '')
      setValue('cord_latitud', Number(totem.cord_latitud))
      setValue('cord_longitud', Number(totem.cord_longitud))
      setMapCoordinates({ 
        latitude: Number(totem.cord_latitud), 
        longitude: Number(totem.cord_longitud) 
      })
      setImagePreviewUrl(totem.imagen ? getFullImageUrl(totem.imagen) : null)
    } else {
      setEditId(null)
      reset({
        nombre_totem: '',
        descripcion: '',
        cord_latitud: 0,
        cord_longitud: 0,
        email: '',
        password: '',
        confirmPassword: ''
      })
      setMapCoordinates({ latitude: -33.0367, longitude: -71.5963 })
      setImagePreviewUrl(null)
    }
    setImageFile(null)
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setEditId(null)
    reset()
    setImageFile(null)
    setImagePreviewUrl(null)
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleMapLocationSelect = (coords) => {
    setValue('cord_latitud', coords.latitude)
    setValue('cord_longitud', coords.longitude)
    setMapCoordinates({ latitude: coords.latitude, longitude: coords.longitude })
  }

  const onSubmit = (data) => {
    const formData = new FormData()
    formData.append('nombre_totem', data.nombre_totem)
    formData.append('descripcion', data.descripcion || '')
    formData.append('cord_latitud', data.cord_latitud)
    formData.append('cord_longitud', data.cord_longitud)
    
    if (!editId) {
      formData.append('email', data.email)
      formData.append('password', data.password)
    }

    if (imageFile) {
      formData.append('imagen', imageFile)
    }

    if (editId) {
      updateMutation.mutate({ id: editId, formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" sx={{ color: 'white' }}>
          Gestión de Tótems
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          sx={{
            bgcolor: '#e63946',
            '&:hover': { bgcolor: '#d62839' },
          }}
        >
          Crear Tótem
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Buscar tótems..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ 
          mb: 3,
          '& .MuiOutlinedInput-root': {
            bgcolor: 'rgba(255, 255, 255, 0.05)',
            color: 'white',
            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
            '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
          },
        }}
      />

      <Grid container spacing={3}>
        {totems?.map((totem) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={totem.id_totem}>
            <Card sx={{ 
              height: '100%', 
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' }
            }}>
              <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
                {totem.imagen ? (
                  <CardMedia
                    component="img"
                    image={getFullImageUrl(totem.imagen)}
                    alt={totem.nombre_totem}
                    sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Box sx={{ 
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <LocationOnIcon sx={{ fontSize: 40, color: 'rgba(255, 255, 255, 0.3)' }} />
                  </Box>
                )}
              </Box>
              <CardContent>
                <Typography variant="h6" gutterBottom noWrap>
                  {totem.nombre_totem}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 2 }}>
                  {totem.descripcion || 'Sin descripción'}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => handleOpen(totem)} sx={{ color: '#4dabf5' }}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton size="small" onClick={() => { setTotemToDelete(totem); setConfirmDeleteOpen(true); }} sx={{ color: '#f44336' }}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a1a1a', color: 'white' }}>
          {editId ? 'Editar Tótem' : 'Nuevo Tótem'}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a1a', color: 'white' }}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="nombre_totem"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Nombre"
                      fullWidth
                      error={!!errors.nombre_totem}
                      helperText={errors.nombre_totem?.message}
                      sx={{ 
                        mb: 2,
                        '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                        '& .MuiOutlinedInput-root': {
                          color: 'white',
                          '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                        }
                      }}
                    />
                  )}
                />
                <Controller
                  name="descripcion"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Descripción"
                      fullWidth
                      multiline
                      rows={3}
                      sx={{ 
                        mb: 2,
                        '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                        '& .MuiOutlinedInput-root': {
                          color: 'white',
                          '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                        }
                      }}
                    />
                  )}
                />
                
                {!editId && (
                  <>
                    <Controller
                      name="email"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Email para inicio de sesión"
                          type="email"
                          fullWidth
                          error={!!errors.email}
                          helperText={errors.email?.message}
                          sx={{ 
                            mb: 2,
                            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                            '& .MuiOutlinedInput-root': {
                              color: 'white',
                              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                            }
                          }}
                        />
                      )}
                    />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="password"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Contraseña"
                              type="password"
                              fullWidth
                              error={!!errors.password}
                              helperText={errors.password?.message}
                              sx={{ 
                                mb: 2,
                                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                                '& .MuiOutlinedInput-root': {
                                  color: 'white',
                                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                }
                              }}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="confirmPassword"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Confirmar Contraseña"
                              type="password"
                              fullWidth
                              error={!!errors.confirmPassword}
                              helperText={errors.confirmPassword?.message}
                              sx={{ 
                                mb: 2,
                                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                                '& .MuiOutlinedInput-root': {
                                  color: 'white',
                                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                }
                              }}
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </>
                )}

                <Box sx={{ mb: 2 }}>
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    sx={{ color: '#e63946', borderColor: '#e63946' }}
                  >
                    Subir Imagen
                    <input type="file" hidden accept="image/png, image/jpeg" onChange={handleImageChange} />
                  </Button>
                  {imagePreviewUrl && (
                    <Box sx={{ mt: 2, height: 200, borderRadius: 1, overflow: 'hidden' }}>
                      <img src={imagePreviewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </Box>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>Ubicación</Typography>
                <Box sx={{ mb: 2 }}>
                   <MapLocationPicker
                    latitude={mapCoordinates.latitude}
                    longitude={mapCoordinates.longitude}
                    onChange={handleMapLocationSelect}
                  />
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1a1a', p: 2 }}>
          <Button onClick={handleClose} sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} variant="contained" sx={{ bgcolor: '#e63946' }}>
            {editId ? 'Guardar Cambios' : 'Crear Tótem'}
          </Button>
        </DialogActions>
      </Dialog>

       <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <DialogTitle sx={{ bgcolor: '#1a1a1a', color: 'white' }}>Confirmar Eliminación</DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1a1a', color: 'white' }}>
          <Typography>
            ¿Estás seguro de que deseas eliminar el tótem "{totemToDelete?.nombre_totem}"? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1a1a', color: 'white' }}>
          <Button onClick={() => setConfirmDeleteOpen(false)} sx={{ color: 'white' }}>Cancelar</Button>
          <Button onClick={() => deleteMutation.mutate(totemToDelete.id_totem)} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
