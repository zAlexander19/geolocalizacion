import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
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
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import api from '../../../lib/api'

export default function BuildingsPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [filterBuilding, setFilterBuilding] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)

  const { control, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      nombre_edificio: '',
      acronimo: '',
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

  useEffect(() => {
    if (open) {
      if (editId) {
        const b = buildings?.find(x => x.id_edificio === editId)
        if (b) {
          setValue('nombre_edificio', b.nombre_edificio)
          setValue('acronimo', b.acronimo)
          setValue('imagen', b.imagen || '')
          setValue('cord_latitud', b.cord_latitud)
          setValue('cord_longitud', b.cord_longitud)
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
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result)
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Edificios</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Seleccionar edificio</InputLabel>
            <Select
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
              label="Seleccionar edificio"
              size="small"
            >
              <MenuItem value="">-- Seleccionar --</MenuItem>
              {buildings?.map(b => (
                <MenuItem key={b.id_edificio} value={b.id_edificio}>{b.nombre_edificio}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(null); setOpen(true) }}>
            Agregar Edificio
          </Button>
        </Box>
      </Box>

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
            {filterBuilding && buildings?.filter(b => b.id_edificio === filterBuilding).map((b) => (
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
                  <IconButton size="small" onClick={() => handleEdit(b.id_edificio)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(b.id_edificio)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!filterBuilding && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    Selecciona un edificio para ver sus datos
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
              name="cord_latitud"
              control={control}
              render={({ field }) => <TextField {...field} label="Latitud" type="number" fullWidth />}
            />
            <Controller
              name="cord_longitud"
              control={control}
              render={({ field }) => <TextField {...field} label="Longitud" type="number" fullWidth />}
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
                    <MenuItem value="No disponible">No disponible</MenuItem>
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
    </Box>
  )
}
