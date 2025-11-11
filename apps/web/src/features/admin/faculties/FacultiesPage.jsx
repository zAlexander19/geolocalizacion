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
  Paper,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material'
import api from '../../../lib/api'

export default function FacultiesPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)

  const { control, handleSubmit, reset, setValue, getValues } = useForm({
    defaultValues: {
      nombre_facultad: '',
      codigo_facultad: '',
      descripcion: '',
    }
  })

  const { data: faculties } = useQuery({
    queryKey: ['faculties'],
    queryFn: async () => {
      const res = await api.get('/faculties')
      return res.data.data
    },
  })

  const { data: buildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => {
      const res = await api.get('/buildings')
      return res.data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      // If payload is FormData (contains file), send multipart/form-data
      if (payload instanceof FormData) {
        const res = await api.post('/faculties', payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        return res
      }
      const res = await api.post('/faculties', payload)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['faculties'])
      setOpen(false)
      reset()
      setImageFile(null)
      setImagePreviewUrl(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      if (payload instanceof FormData) {
        const res = await api.put(`/faculties/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } })
        return res
      }
      const res = await api.put(`/faculties/${id}`, payload)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['faculties'])
      setOpen(false)
      reset()
      setEditId(null)
      setImageFile(null)
      setImagePreviewUrl(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/faculties/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['faculties'])
    },
  })

  useEffect(() => {
    if (open) {
      if (editId) {
        const f = faculties?.find(x => x.codigo_facultad === editId || x.codigo_facultad === Number(editId) || x.codigo_facultad === undefined && x.codigo_facultad === editId)
        if (f) {
          setValue('nombre_facultad', f.nombre_facultad)
          setValue('codigo_facultad', f.codigo_facultad || '')
          setValue('descripcion', f.descripcion || '')
          setValue('id_edificio', f.id_edificio || '')
          // set preview if logo exists
          setImagePreviewUrl(f.logo ? (f.logo.startsWith('http') ? f.logo : `http://localhost:4000${f.logo}`) : null)
        }
      } else {
        reset()
        setImageFile(null)
        setImagePreviewUrl(null)
      }
    }
  }, [open, editId, faculties, reset, setValue])

  const validateUnique = (name, code, currentId = null) => {
    if (!faculties) return { nameExists: false, codeExists: false }
    const nameExists = faculties.some(f => {
      if (currentId && (String(f.codigo_facultad) === String(currentId) || String(f.codigo_facultad) === String(Number(currentId)))) return false
      return String(f.nombre_facultad || '').toLowerCase() === String(name || '').toLowerCase()
    })
    const codeExists = faculties.some(f => {
      if (currentId && (String(f.codigo_facultad) === String(currentId) || String(f.codigo_facultad) === String(Number(currentId)))) return false
      return String(f.codigo_facultad || '').toLowerCase() === String(code || '').toLowerCase()
    })
    return { nameExists, codeExists }
  }

  const onSubmit = (data) => {
    // Validaciones: nombre y codigo obligatorios
    const nombre = String(data.nombre_facultad || '').trim()
    const codigo = String(data.codigo_facultad || '').trim()
    const descripcion = String(data.descripcion || '').trim()

    if (!nombre) return alert('El nombre de la facultad es obligatorio')
    if (!codigo) return alert('El código de la facultad es obligatorio')

    // Formato: alfanumérico, guiones y guiones bajos permitidos, entre 2 y 50 caracteres
    const codeRe = /^[A-Za-z0-9_-]{2,50}$/
    if (!codeRe.test(codigo)) return alert('El código sólo puede contener letras, números, guiones y guiones bajos (2-50 caracteres)')

  const { nameExists, codeExists } = validateUnique(nombre, codigo, editId)
  if (nameExists) return alert('Ya existe una facultad con ese nombre')
  if (codeExists) return alert('Ya existe una facultad con ese código')

    // Prepare id_edificio if selected
    const idEd = getValues('id_edificio') || null

    // If editing existing faculty
    if (editId) {
      if (imageFile) {
        const formData = new FormData()
        formData.append('nombre_facultad', nombre)
        formData.append('codigo_facultad', codigo)
        formData.append('descripcion', descripcion || '')
        formData.append('estado', 'true')
        formData.append('disponibilidad', 'Disponible')
        if (idEd) formData.append('id_edificio', idEd)
        formData.append('logo', imageFile)
        updateMutation.mutate({ id: editId, payload: formData })
      } else {
        const payload = {
          nombre_facultad: nombre,
          codigo_facultad: codigo,
          descripcion: descripcion || '',
          estado: true,
          disponibilidad: 'Disponible',
          id_edificio: idEd,
        }
        updateMutation.mutate({ id: editId, payload })
      }
      return
    }

    // Creating new faculty
    if (imageFile) {
      const formData = new FormData()
      formData.append('nombre_facultad', nombre)
      formData.append('codigo_facultad', codigo)
      formData.append('descripcion', descripcion || '')
      formData.append('estado', 'true')
      formData.append('disponibilidad', 'Disponible')
      if (idEd) formData.append('id_edificio', idEd)
      formData.append('logo', imageFile)
      createMutation.mutate(formData)
    } else {
      const payload = {
        nombre_facultad: nombre,
        codigo_facultad: codigo,
        descripcion: descripcion || '',
        estado: true,
        disponibilidad: 'Disponible',
        id_edificio: idEd,
      }
      createMutation.mutate(payload)
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type === 'image/png' || file.type === 'image/jpeg') {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreviewUrl(reader.result)
      reader.readAsDataURL(file)
    } else {
      alert('Por favor selecciona un archivo PNG o JPG')
    }
  }

  const handleDelete = (id) => {
    if (confirm('¿Eliminar facultad?')) deleteMutation.mutate(id)
  }

  const handleEdit = (id) => {
    setEditId(id)
    setOpen(true)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Facultades</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(null); setOpen(true) }}>
          Agregar Facultad
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>Logo</TableCell>
                    <TableCell>Código</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Edificio</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(faculties || []).map((f) => (
              <TableRow key={f.codigo_facultad || f.nombre_facultad} hover>
                  <TableCell>
                    {f.logo ? (
                      <Box
                        component="img"
                        src={f.logo.startsWith('http') ? f.logo : `http://localhost:4000${f.logo}`}
                        alt={f.nombre_facultad}
                        sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1 }}
                      />
                    ) : (
                      <Box sx={{ width: 60, height: 60, bgcolor: 'grey.200', borderRadius: 1 }} />
                    )}
                  </TableCell>
                  <TableCell>{f.codigo_facultad || f.codigo || f.codigo_facultad === 0 ? f.codigo_facultad : ''}</TableCell>
                <TableCell>{f.nombre_facultad}</TableCell>
                <TableCell>
                  {f.id_edificio ? (buildings || []).find(b => Number(b.id_edificio) === Number(f.id_edificio))?.nombre_edificio || f.id_edificio : ''}
                </TableCell>
                <TableCell>{f.descripcion}</TableCell>
                <TableCell>
                  <Chip label={f.estado ? 'Activo' : 'Inactivo'} color={f.estado ? 'success' : 'default'} size="small" />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleEdit(f.codigo_facultad || f.codigo_facultad)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(f.codigo_facultad || f.codigo_facultad)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {(!faculties || faculties.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">No hay facultades registradas</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Editar Facultad' : 'Nueva Facultad'}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Controller name="nombre_facultad" control={control} render={({ field }) => <TextField {...field} label="Nombre (obligatorio)" fullWidth required />} />
            <Controller name="codigo_facultad" control={control} render={({ field }) => <TextField {...field} label="Código (obligatorio)" fullWidth required />} />
            <Controller name="descripcion" control={control} render={({ field }) => <TextField {...field} label="Descripción (opcional)" fullWidth multiline rows={3} />} />

            <Controller
              name="id_edificio"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Asociar Edificio</InputLabel>
                  <Select {...field} label="Asociar Edificio" displayEmpty>
                    <MenuItem value="">-- Ninguno --</MenuItem>
                    {(buildings || []).map(b => (
                      <MenuItem key={b.id_edificio} value={b.id_edificio}>{b.nombre_edificio}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Box>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                sx={{ mb: 1 }}
              >
                Subir Logo (PNG/JPG)
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
                  alt="Logo preview"
                  sx={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 1, border: 1, borderColor: 'divider' }}
                />
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit)}>{editId ? 'Guardar' : 'Crear'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
