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
  InputAdornment,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import api from '../../../lib/api'

export default function RoomsPage() {
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

  const { control, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      id_piso: '',
      nombre_sala: '',
      acronimo: '',
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
      queryClient.invalidateQueries(['rooms'])
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
          setValue('imagen', r.imagen || '')
          setValue('capacidad', r.capacidad)
          setValue('tipo_sala', r.tipo_sala)
          setValue('cord_latitud', r.cord_latitud)
          setValue('cord_longitud', r.cord_longitud)
          setValue('estado', r.estado)
          setValue('disponibilidad', r.disponibilidad)
          setImagePreviewUrl(r.imagen ? (r.imagen.startsWith('http') ? r.imagen : `http://localhost:4000${r.imagen}`) : null)
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
    formData.append('id_piso', data.id_piso)
    formData.append('nombre_sala', data.nombre_sala)
    formData.append('acronimo', data.acronimo)
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
    if (confirm('¿Eliminar sala?')) {
      deleteMutation.mutate(id)
    }
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
    
    // Si hay búsqueda, filtrar por nombre o acrónimo
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      return rooms.filter(r => {
        const nombre = r.nombre_sala?.toLowerCase() || ''
        const acronimo = r.acronimo?.toLowerCase() || ''
        return nombre.includes(query) || acronimo.includes(query)
      })
    }
    
    // Si hay filtros de edificio y piso
    if (filterBuilding && filterFloor) {
      return rooms.filter(r => {
        const floor = allFloorsData?.find(f => f.id_piso === r.id_piso)
        if (!floor) return false
        const matchBuilding = floor.id_edificio === filterBuilding
        const matchFloor = r.id_piso === filterFloor
        return matchBuilding && matchFloor
      })
    }
    
    return []
  })()

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Salas</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Buscar por nombre o acrónimo..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              // Limpiar filtros de edificio/piso cuando se busca
              if (e.target.value.trim()) {
                setFilterBuilding('')
                setFilterFloor('')
              }
            }}
            size="small"
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ minWidth: 180 }} disabled={searchQuery.trim() !== ''}>
            <InputLabel>Seleccionar edificio</InputLabel>
            <Select
              value={filterBuilding}
              onChange={(e) => {
                setFilterBuilding(e.target.value)
                setFilterFloor('') // Reset floor filter when building changes
                setSearchQuery('') // Limpiar búsqueda cuando se filtra
              }}
              label="Seleccionar edificio"
              size="small"
            >
              <MenuItem value="">-- Seleccionar --</MenuItem>
              {buildings?.map(b => (
                <MenuItem key={b.id_edificio} value={b.id_edificio}>{b.nombre_edificio}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 180 }} disabled={!filterBuilding || searchQuery.trim() !== ''}>
            <InputLabel>Seleccionar piso</InputLabel>
            <Select
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              label="Seleccionar piso"
              size="small"
            >
              <MenuItem value="">-- Seleccionar --</MenuItem>
              {filteredFloors?.map(f => (
                <MenuItem key={f.id_piso} value={f.id_piso}>{f.nombre_piso}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(null); setOpen(true) }}>
            Agregar Sala
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
                      src={r.imagen.startsWith('http') ? r.imagen : `http://localhost:4000${r.imagen}`}
                      alt={r.nombre_sala}
                      sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1, cursor: 'pointer' }}
                      onClick={() => setImagePreview(r.imagen.startsWith('http') ? r.imagen : `http://localhost:4000${r.imagen}`)}
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
            {(searchQuery.trim() ? filteredRooms.length === 0 : (!filterBuilding || !filterFloor)) && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    {searchQuery.trim() 
                      ? 'No se encontraron salas con ese criterio de búsqueda'
                      : (!filterBuilding 
                          ? 'Selecciona un edificio o usa el buscador' 
                          : 'Selecciona un piso para ver sus salas')}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
