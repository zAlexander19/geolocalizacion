import React, { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../../lib/api'
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Toolbar,
  Typography,
  IconButton,
  Chip,
  Paper,
} from '@mui/material'
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'

export default function BathroomsAdmin() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [filterBuilding, setFilterBuilding] = useState('')
  const [filterFloor, setFilterFloor] = useState('')
  const [editId, setEditId] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [form, setForm] = useState({
    id_edificio: '',
    id_piso: '',
    nombre: '',
    descripcion: '',
    capacidad: '',
    imagen: '',
    tipo: 'mixto',
    acceso_discapacidad: false,
    cord_latitud: '',
    cord_longitud: ''
  })
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // buildings
  const { data: buildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => {
      const res = await api.get('/buildings')
      return res.data.data
    },
  })

  // all floors across buildings (para resolver nombre de piso por id)
  const { data: allFloorsData } = useQuery({
    queryKey: ['all-floors'],
    queryFn: async () => {
      if (!buildings) return []
      const floorsPromises = buildings.map(b => api.get(`/buildings/${b.id_edificio}/floors`))
      const floorsResponses = await Promise.all(floorsPromises)
      return floorsResponses.flatMap(res => res.data.data)
    },
    enabled: !!buildings,
  })

  // floors for selected building (used both for filter and form)
  const { data: floors } = useQuery({
    queryKey: ['floors', filterBuilding || form.id_edificio],
    queryFn: async () => {
      const id = filterBuilding || form.id_edificio
      if (!id) return []
      const res = await api.get(`/buildings/${id}/floors`)
      return res.data.data
    },
    enabled: !!(filterBuilding || form.id_edificio),
  })

  // helpers para mostrar nombres
  const getBuildingName = (id_edificio) => {
    const b = buildings?.find(x => Number(x.id_edificio) === Number(id_edificio))
    return b ? (b.nombre_edificio || b.acronimo || b.id_edificio) : id_edificio
  }

  const getFloorName = (id_piso) => {
    const f = allFloorsData?.find(x => Number(x.id_piso) === Number(id_piso))
    return f ? (f.nombre_piso || f.numero_piso || f.id_piso) : id_piso
  }

  // bathrooms
  const { data: allBathrooms } = useQuery({
    queryKey: ['bathrooms'],
    queryFn: async () => {
      const res = await api.get('/bathrooms')
      return res.data.data
    },
  })

  // filtered list
  const list = (allBathrooms || []).filter(b => {
    // Solo mostrar baños si ambos filtros están seleccionados
    if (!filterBuilding || !filterFloor) return false
    if (Number(b.id_edificio) !== Number(filterBuilding)) return false
    if (Number(b.id_piso) !== Number(filterFloor)) return false
    return true
  })

  // create mutation (enviar FormData con encabezado multipart/form-data)
  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/bathrooms', payload, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['bathrooms'])
      setOpen(false)
      setEditId(null)
      setForm({ id_edificio: '', id_piso: '', nombre: '', descripcion: '', capacidad: '', imagen: '', tipo: 'mixto', acceso_discapacidad: false, cord_latitud: '', cord_longitud: '' })
      setMessage({ type: 'success', text: `Baño creado correctamente.` })
    },
    onError: (err) => {
      const text = err?.response?.data?.message || err.message || 'Error al crear baño'
      setMessage({ type: 'error', text })
    },
    onSettled: () => setSubmitting(false)
  })

  // update mutation (enviar FormData con encabezado multipart/form-data)
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/bathrooms/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['bathrooms'])
      setOpen(false)
      setEditId(null)
      setForm({ id_edificio: '', id_piso: '', nombre: '', descripcion: '', capacidad: '', imagen: '', tipo: 'mixto', acceso_discapacidad: false, cord_latitud: '', cord_longitud: '' })
      setMessage({ type: 'success', text: 'Baño actualizado correctamente.' })
    },
    onError: (err) => {
      const text = err?.response?.data?.message || err.message || 'Error al actualizar baño'
      setMessage({ type: 'error', text })
    },
    onSettled: () => setSubmitting(false)
  })

  // delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/bathrooms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['bathrooms'])
      setMessage({ type: 'success', text: 'Baño eliminado.' })
    },
    onError: (err) => {
      const text = err?.response?.data?.message || err.message || 'Error al eliminar baño'
      setMessage({ type: 'error', text })
    }
  })

  function onFormChange(e) {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  function openCreate() {
    setMessage(null)
    setEditId(null)
    setForm({ 
      id_edificio: filterBuilding || '', 
      id_piso: filterFloor || '', 
      nombre: '',
      descripcion: '',
      capacidad: '',
      imagen: '', 
      tipo: 'mixto', 
      acceso_discapacidad: false, 
      cord_latitud: '', 
      cord_longitud: '' 
    })
    setImageFile(null)
    setImagePreviewUrl(null)
    setOpen(true)
  }

  function openEdit(b) {
    setMessage(null)
    setEditId(b.id_bano)
    setForm({
      id_edificio: b.id_edificio,
      id_piso: b.id_piso,
      nombre: b.nombre || '',
      descripcion: b.descripcion || '',
      capacidad: b.capacidad || '',
      imagen: typeof b.imagen === 'string' ? b.imagen : '',
      tipo: b.tipo || 'mixto',
      acceso_discapacidad: !!b.acceso_discapacidad,
      cord_latitud: b.cord_latitud || '',
      cord_longitud: b.cord_longitud || ''
    })
    setImageFile(null)
    // calcular preview de forma segura
    const img = b.imagen
    const preview = (typeof img === 'string' && img)
      ? (img.startsWith('http') ? img : `http://localhost:4000${img}`)
      : null
    setImagePreviewUrl(preview)
    setOpen(true)
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      alert('Por favor selecciona PNG o JPG')
      return
    }
    
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
  }

  async function handleSubmit() {
    setMessage(null)
    if (!form.id_edificio || !form.id_piso) {
      setMessage({ type: 'error', text: 'Complete edificio y piso.' })
      return
    }
    if (!['h','m','mixto'].includes(String(form.tipo).toLowerCase())) {
      setMessage({ type: 'error', text: 'Tipo inválido.' })
      return
    }
    setSubmitting(true)
    // construir FormData (como en FloorsPage)
    const formData = new FormData()
    formData.append('id_edificio', Number(form.id_edificio))
    formData.append('id_piso', Number(form.id_piso))
    formData.append('nombre', form.nombre)
    if (form.descripcion) {
      formData.append('descripcion', form.descripcion)
    }
    formData.append('capacidad', form.capacidad ? Number(form.capacidad) : 0)
    formData.append('tipo', form.tipo)
    formData.append('acceso_discapacidad', form.acceso_discapacidad ? 'true' : 'false')
    formData.append('cord_latitud', form.cord_latitud ? String(form.cord_latitud) : '0')
    formData.append('cord_longitud', form.cord_longitud ? String(form.cord_longitud) : '0')
    // adjuntar archivo si existe
    if (imageFile) formData.append('imagen', imageFile)
    if (editId) {
      updateMutation.mutate({ id: editId, payload: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  function handleDelete(id) {
    if (!confirm('¿Eliminar baño?')) return
    deleteMutation.mutate(id)
  }

  useEffect(() => {
    setFilterFloor('')
  }, [filterBuilding])

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>Baños</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Seleccionar edificio</InputLabel>
            <Select
              label="Seleccionar edificio"
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
            >
              <MenuItem value="">--</MenuItem>
              {buildings?.map(b => <MenuItem key={b.id_edificio} value={b.id_edificio}>{b.nombre_edificio || b.acronimo || b.id_edificio}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Seleccionar piso</InputLabel>
            <Select
              label="Seleccionar piso"
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              disabled={!filterBuilding}
            >
              <MenuItem value="">--</MenuItem>
              {(floors || []).map(f => <MenuItem key={f.id_piso} value={f.id_piso}>{f.nombre_piso || f.numero_piso || f.id_piso}</MenuItem>)}
            </Select>
          </FormControl>

          <Button 
            variant="contained" 
            onClick={openCreate}
            disabled={!filterBuilding || !filterFloor}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            + AGREGAR BAÑO
          </Button>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#fafafa' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Imagen</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Nombre</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Capacidad</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Tipo</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Acceso discapacidad</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!filterBuilding && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#999' }}>
                  Selecciona un edificio primero
                </TableCell>
              </TableRow>
            )}
            {filterBuilding && !filterFloor && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#999' }}>
                  Selecciona un piso
                </TableCell>
              </TableRow>
            )}
            {filterBuilding && filterFloor && list.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#999' }}>
                  No hay baños
                </TableCell>
              </TableRow>
            )}
            {list.map(b => (
              <TableRow key={b.id_bano} sx={{ '&:hover': { bgcolor: '#f5f5f5' } }}>
                <TableCell>{b.id_bano}</TableCell>
                <TableCell>
                  {(() => {
                    const img = b.imagen
                    const placeholder = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="100%" height="100%" fill="%23e5e7eb"/><text x="50%" y="50%" dy=".3em" text-anchor="middle" font-size="10" fill="%23aaa">Sin imagen</text></svg>'
                    if (!img || /via\.placeholder\.com/.test(img)) {
                      return (
                        <Box sx={{ width: 60, height: 60, bgcolor: 'grey.200', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Box component="img" src={placeholder} alt="Sin imagen" sx={{ width: 40, height: 40 }} />
                        </Box>
                      )
                    }
                    if (typeof img !== 'string') return '—'
                    const src = img.startsWith('http') ? img : `http://localhost:4000${img}`
                    return (
                      <Box
                        component="img"
                        src={src}
                        alt=""
                        sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1, cursor: 'pointer' }}
                        onClick={() => setImagePreview(src)}
                      />
                    )
                  })()}
                </TableCell>
                <TableCell>{b.nombre || '—'}</TableCell>
                <TableCell>{b.capacidad || '—'}</TableCell>
                <TableCell>{b.tipo}</TableCell>
                <TableCell>
                  <Chip label={b.estado ? 'Activo' : 'Inactivo'} color={b.estado ? 'success' : 'default'} size="small" />
                </TableCell>
                <TableCell>{b.acceso_discapacidad ? 'Sí' : 'No'}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(b)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(b.id_bano)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 600 }}>{editId ? 'Editar baño' : 'Crear nuevo baño'}</DialogTitle>
        <DialogContent dividers>
          {message && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}
          
          {!editId && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Edificio: <strong>{getBuildingName(filterBuilding)}</strong> | Piso: <strong>{getFloorName(filterFloor)}</strong>
            </Alert>
          )}

          {editId && (
            <>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="dialog-edificio-label">Edificio</InputLabel>
                <Select
                  labelId="dialog-edificio-label"
                  id="dialog-edificio"
                  label="Edificio"
                  name="id_edificio"
                  value={form.id_edificio}
                  onChange={onFormChange}
                >
                  <MenuItem value="">-- seleccionar --</MenuItem>
                  {buildings?.map(b => <MenuItem key={b.id_edificio} value={b.id_edificio}>{b.nombre_edificio || b.acronimo || b.id_edificio}</MenuItem>)}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="dialog-piso-label">Piso</InputLabel>
                <Select
                  labelId="dialog-piso-label"
                  id="dialog-piso"
                  label="Piso"
                  name="id_piso"
                  value={form.id_piso}
                  onChange={onFormChange}
                  disabled={!form.id_edificio}
                >
                  <MenuItem value="">-- seleccionar --</MenuItem>
                  {(form.id_edificio ? (floors || []) : []).map(f => <MenuItem key={f.id_piso} value={f.id_piso}>{f.nombre_piso || f.numero_piso || f.id_piso}</MenuItem>)}
                </Select>
              </FormControl>
            </>
          )}

          <TextField fullWidth label="Nombre" name="nombre" value={form.nombre} onChange={onFormChange} sx={{ mb: 2 }} />
          <TextField
            fullWidth
            label="Descripción (Opcional)"
            name="descripcion"
            value={form.descripcion}
            onChange={onFormChange}
            multiline
            rows={3}
            placeholder="Describe el baño..."
            sx={{ mb: 2 }}
          />
          <TextField fullWidth label="Capacidad (personas/cubículos)" name="capacidad" type="number" value={form.capacidad} onChange={onFormChange} sx={{ mb: 2 }} />

          <Box sx={{ mb: 2 }}>
            <Button variant="outlined" component="label" fullWidth sx={{ mb: 1 }}>
              Subir imagen (PNG/JPG)
              <input hidden accept="image/png, image/jpeg" type="file" onChange={handleImageChange} />
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Dimensiones requeridas: 1600x1200 píxeles
            </Typography>
            {imagePreviewUrl && (
              <Box component="img" src={imagePreviewUrl} alt="Preview" sx={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 1, border: 1, borderColor: 'divider' }} />
            )}
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="dialog-tipo-label">Tipo</InputLabel>
            <Select labelId="dialog-tipo-label" id="dialog-tipo" label="Tipo" name="tipo" value={form.tipo} onChange={onFormChange}>
              <MenuItem value="h">Hombre</MenuItem>
              <MenuItem value="m">Mujer</MenuItem>
              <MenuItem value="mixto">Mixto</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel control={<Checkbox name="acceso_discapacidad" checked={!!form.acceso_discapacidad} onChange={onFormChange} />} label="Acceso discapacidad" sx={{ mb: 2 }} />
          <TextField fullWidth label="Latitud" name="cord_latitud" value={form.cord_latitud} onChange={onFormChange} sx={{ mb: 2 }} />
          <TextField fullWidth label="Longitud" name="cord_longitud" value={form.cord_longitud} onChange={onFormChange} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setOpen(false); setEditId(null); setImageFile(null); setImagePreviewUrl(null); }} disabled={submitting}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <CircularProgress size={18} color="inherit" /> : (editId ? 'Guardar' : 'Crear baño')}
          </Button>
        </DialogActions>
      </Dialog>

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
