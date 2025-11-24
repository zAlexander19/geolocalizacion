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

export default function FloorsPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [filterBuilding, setFilterBuilding] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)

  const { control, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      id_edificio: '',
      nombre_piso: '',
      numero_piso: 0,
      imagen: '',
      codigo_qr: '',
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
      queryClient.invalidateQueries(['all-floors'])
    },
  })

  useEffect(() => {
    if (open) {
      if (editId) {
        const f = allFloorsData?.find(x => x.id_piso === editId)
        if (f) {
          setValue('id_edificio', f.id_edificio)
          setValue('nombre_piso', f.nombre_piso)
          setValue('numero_piso', f.numero_piso ?? 0)
          setValue('imagen', f.imagen || '')
          setValue('codigo_qr', f.codigo_qr || '')
          setValue('estado', f.estado)
          setValue('disponibilidad', f.disponibilidad)
          setImagePreviewUrl(f.imagen ? (f.imagen.startsWith('http') ? f.imagen : `http://localhost:4000${f.imagen}`) : null)
        }
      } else {
        reset()
        setImageFile(null)
        setImagePreviewUrl(null)
      }
    }
  }, [open, editId, allFloorsData, reset, setValue])

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
    formData.append('nombre_piso', data.nombre_piso)
    formData.append('numero_piso', data.numero_piso)
    formData.append('codigo_qr', data.codigo_qr)
    formData.append('estado', data.estado)
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
    if (confirm('¿Eliminar piso?')) {
      deleteMutation.mutate(id)
    }
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Pisos</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Buscar pisos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ minWidth: 250 }}
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filtrar por edificio</InputLabel>
            <Select
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
              label="Filtrar por edificio"
              size="small"
            >
              <MenuItem value="">Todos</MenuItem>
              {buildings?.sort((a, b) => a.nombre_edificio.localeCompare(b.nombre_edificio)).map(b => (
                <MenuItem key={b.id_edificio} value={b.id_edificio}>{b.nombre_edificio}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(null); setOpen(true) }}>
            Agregar Piso
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
                        src={f.imagen.startsWith('http') ? f.imagen : `http://localhost:4000${f.imagen}`}
                        alt={f.nombre_piso}
                        sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1, cursor: 'pointer' }}
                        onClick={() => setImagePreview(f.imagen.startsWith('http') ? f.imagen : `http://localhost:4000${f.imagen}`)}
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

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Editar Piso' : 'Nuevo Piso'}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Controller
              name="id_edificio"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth required>
                  <InputLabel>Edificio</InputLabel>
                  <Select {...field} label="Edificio">
                    {buildings?.map(b => (
                      <MenuItem key={b.id_edificio} value={b.id_edificio}>{b.nombre_edificio}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
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
            <Controller
              name="codigo_qr"
              control={control}
              render={({ field }) => <TextField {...field} label="Código QR" fullWidth />}
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
    </Box>
  )
}
