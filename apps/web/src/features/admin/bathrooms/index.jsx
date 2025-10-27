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
} from '@mui/material'
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'

export default function BathroomsAdmin() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [filterBuilding, setFilterBuilding] = useState('')
  const [filterFloor, setFilterFloor] = useState('')
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({
    id_edificio: '',
    id_piso: '',
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
    if (filterBuilding && Number(b.id_edificio) !== Number(filterBuilding)) return false
    if (filterFloor && Number(b.id_piso) !== Number(filterFloor)) return false
    return true
  })

  // create mutation
  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/bathrooms', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['bathrooms'])
      setOpen(false)
      setEditId(null)
      setForm({ id_edificio: '', id_piso: '', imagen: '', tipo: 'mixto', acceso_discapacidad: false, cord_latitud: '', cord_longitud: '' })
      setMessage({ type: 'success', text: `Baño creado correctamente.` })
    },
    onError: (err) => {
      const text = err?.response?.data?.message || err.message || 'Error al crear baño'
      setMessage({ type: 'error', text })
    },
    onSettled: () => setSubmitting(false)
  })

  // update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/bathrooms/${id}`, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['bathrooms'])
      setOpen(false)
      setEditId(null)
      setForm({ id_edificio: '', id_piso: '', imagen: '', tipo: 'mixto', acceso_discapacidad: false, cord_latitud: '', cord_longitud: '' })
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
    setForm({ id_edificio: '', id_piso: '', imagen: '', tipo: 'mixto', acceso_discapacidad: false, cord_latitud: '', cord_longitud: '' })
    setOpen(true)
  }

  function openEdit(b) {
    setMessage(null)
    setEditId(b.id_bano)
    setForm({
      id_edificio: b.id_edificio,
      id_piso: b.id_piso,
      imagen: b.imagen || '',
      tipo: b.tipo || 'mixto',
      acceso_discapacidad: !!b.acceso_discapacidad,
      cord_latitud: b.cord_latitud || '',
      cord_longitud: b.cord_longitud || ''
    })
    setOpen(true)
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
    const payload = {
      id_edificio: Number(form.id_edificio),
      id_piso: Number(form.id_piso),
      imagen: String(form.imagen || '').trim(),
      tipo: form.tipo,
      acceso_discapacidad: !!form.acceso_discapacidad,
      cord_latitud: form.cord_latitud ? Number(form.cord_latitud) : 0,
      cord_longitud: form.cord_longitud ? Number(form.cord_longitud) : 0
    }
    if (editId) {
      updateMutation.mutate({ id: editId, payload })
    } else {
      createMutation.mutate(payload)
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
    <Box sx={{ p: 2 }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', p: 0 }}>
        <Typography variant="h5">Baños</Typography>
        <Box>
          <FormControl sx={{ mr: 1, minWidth: 180 }}>
            <InputLabel>Seleccionar edificio</InputLabel>
            <Select
              label="Seleccionar edificio"
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
              size="small"
            >
              <MenuItem value="">--</MenuItem>
              {buildings?.map(b => <MenuItem key={b.id_edificio} value={b.id_edificio}>{b.nombre_edificio || b.acronimo || b.id_edificio}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl sx={{ mr: 2, minWidth: 160 }}>
            <InputLabel>Seleccionar piso</InputLabel>
            <Select
              label="Seleccionar piso"
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              size="small"
              disabled={!filterBuilding}
            >
              <MenuItem value="">--</MenuItem>
              {(floors || []).map(f => <MenuItem key={f.id_piso} value={f.id_piso}>{f.nombre_piso || f.numero_piso || f.id_piso}</MenuItem>)}
            </Select>
          </FormControl>

          <Button variant="contained" onClick={openCreate}>
            + AGREGAR BAÑO
          </Button>
        </Box>
      </Toolbar>

      <Box sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Edificio</TableCell>
              <TableCell>Piso</TableCell>
              <TableCell>Imagen</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Acceso</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map(b => (
              <TableRow key={b.id_bano}>
                <TableCell>{b.id_bano}</TableCell>
                <TableCell>{b.id_edificio}</TableCell>
                <TableCell>{b.id_piso}</TableCell>
                <TableCell>
                  {b.imagen ? (
                    <Box component="img" src={b.imagen.startsWith('http') ? b.imagen : `http://localhost:4000${b.imagen}`} alt="" sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1 }} />
                  ) : '—'}
                </TableCell>
                <TableCell>{b.tipo}</TableCell>
                <TableCell>{b.acceso_discapacidad ? 'Sí' : 'No'}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(b)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(b.id_bano)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">No hay baños</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editId ? 'Editar baño' : 'Crear nuevo baño'}</DialogTitle>
        <DialogContent dividers>
          {message && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}
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

          <TextField fullWidth label="URL imagen (opcional)" name="imagen" value={form.imagen} onChange={onFormChange} sx={{ mb: 2 }} />

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
          <TextField fullWidth label="Longitud" name="cord_longitud" value={form.cord_longitud} onChange={onFormChange} sx={{ mb: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpen(false); setEditId(null); }} disabled={submitting}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <CircularProgress size={18} color="inherit" /> : (editId ? 'Guardar' : 'Crear baño')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
