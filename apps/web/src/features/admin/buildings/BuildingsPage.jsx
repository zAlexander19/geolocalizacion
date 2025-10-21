import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Avatar,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Search as SearchIcon,
  Image as ImageIcon,
} from '@mui/icons-material'
import api from '../../../lib/api'
import { queryClient } from '../../../lib/queryClient'

const buildingSchema = z.object({
  nombre_edificio: z.string().min(1, 'Nombre requerido').max(100),
  acronimo: z.string().min(1, 'Acrónimo requerido').max(50),
  imagen: z.string().optional(),
  cord_latitud: z.coerce.number(),
  cord_longitud: z.coerce.number(),
  estado: z.coerce.boolean(),
  disponibilidad: z.string().max(20)
})

export default function BuildingsPage() {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [modalImg, setModalImg] = useState(null)
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['buildings', search],
    queryFn: async () => {
      const res = await api.get('/buildings', { params: { search } })
      return res.data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/buildings', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['buildings'])
      setModalOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const res = await api.put(`/buildings/${id}`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['buildings'])
      setModalOpen(false)
      setEditItem(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/buildings/${id}`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['buildings'])
    },
  })

  const handleCreate = () => {
    setEditItem(null)
    setModalOpen(true)
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setModalOpen(true)
    setAnchorEl(null)
  }

  const handleDelete = (item) => {
    if (confirm('¿Borrar edificio ' + item.nombre_edificio + '?')) {
      deleteMutation.mutate(item.id_edificio)
    }
    setAnchorEl(null)
  }

  const handleMenuOpen = (event, row) => {
    setAnchorEl(event.currentTarget)
    setSelectedRow(row)
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
          Edificios
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Gestiona los edificios del sistema.
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Buscar edificios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
          >
            Crear Edificio
          </Button>
        </Box>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} elevation={1}>
        {isLoading ? (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Imagen</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Acrónimo</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Coordenadas</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Disponibilidad</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.map((row) => (
                <TableRow key={row.id_edificio} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {row.id_edificio}
                  </TableCell>
                  <TableCell>
                    {row.imagen && !/via\.placeholder\.com/.test(row.imagen) ? (
                      <Avatar
                        src={row.imagen.startsWith('http') ? row.imagen : `http://localhost:4000${row.imagen}`}
                        variant="rounded"
                        sx={{ width: 48, height: 48, cursor: 'pointer' }}
                        onClick={() => {
                          const url = row.imagen.startsWith('http')
                            ? row.imagen
                            : `http://localhost:4000${row.imagen}`
                          setModalImg(url)
                        }}
                      >
                        <ImageIcon />
                      </Avatar>
                    ) : (
                      <Avatar variant="rounded" sx={{ width: 48, height: 48, bgcolor: 'grey.300' }}>
                        <ImageIcon />
                      </Avatar>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'medium' }}>{row.nombre_edificio}</TableCell>
                  <TableCell>
                    <Chip label={row.acronimo} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {row.cord_latitud}, {row.cord_longitud}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.estado ? 'Activo' : 'Inactivo'}
                      color={row.estado ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.disponibilidad}
                      color={row.disponibilidad === 'Disponible' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, row)}>
                      <MoreIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleEdit(selectedRow)}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Editar
        </MenuItem>
        <MenuItem onClick={() => handleDelete(selectedRow)} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Eliminar
        </MenuItem>
      </Menu>

      {/* Form Modal */}
      <BuildingFormDialog
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditItem(null)
        }}
        editItem={editItem}
        onSubmit={(values) => {
          if (editItem) {
            updateMutation.mutate({ id: editItem.id_edificio, ...values })
          } else {
            createMutation.mutate(values)
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Image Modal */}
      <Dialog open={!!modalImg} onClose={() => setModalImg(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Imagen del edificio</DialogTitle>
        <DialogContent>
          {modalImg && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={modalImg}
                alt="Edificio"
                style={{ maxWidth: '100%', maxHeight: 400 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalImg(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// Building Form Dialog Component
function BuildingFormDialog({ open, onClose, editItem, onSubmit, isLoading }) {
  const fileRef = useRef()
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm({
    defaultValues: {
      nombre_edificio: '',
      acronimo: '',
      imagen: '',
      cord_latitud: '',
      cord_longitud: '',
      estado: true,
      disponibilidad: 'Disponible'
    },
    resolver: zodResolver(buildingSchema),
  })

  // Reset form when editItem changes or dialog opens
  useEffect(() => {
    if (open) {
      reset(editItem || {
        nombre_edificio: '',
        acronimo: '',
        imagen: '',
        cord_latitud: '',
        cord_longitud: '',
        estado: true,
        disponibilidad: 'Disponible'
      })
    }
  }, [open, editItem, reset])

  const imagenUrl = editItem?.imagen && editItem.imagen.startsWith('/uploads')
    ? `http://localhost:4000${editItem.imagen}`
    : editItem?.imagen

  const handleFormSubmit = (values) => {
    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      if (key !== 'imagen') formData.append(key, value)
    })
    
    if (fileRef.current?.files[0]) {
      formData.append('imagen', fileRef.current.files[0])
    } else if (values.imagen && values.imagen.startsWith('/uploads')) {
      formData.append('imagen', values.imagen)
    }
    
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editItem ? 'Editar Edificio' : 'Crear Edificio'}</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Nombre"
              {...register('nombre_edificio')}
              error={!!errors.nombre_edificio}
              helperText={errors.nombre_edificio?.message}
            />
            
            <TextField
              fullWidth
              label="Acrónimo"
              {...register('acronimo')}
              error={!!errors.acronimo}
              helperText={errors.acronimo?.message}
            />

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Imagen
              </Typography>
              <input
                type="file"
                ref={fileRef}
                accept="image/*"
                style={{ width: '100%' }}
              />
              {imagenUrl && (
                <Box sx={{ mt: 2 }}>
                  <img src={imagenUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: 120 }} />
                </Box>
              )}
            </Box>

            <TextField
              fullWidth
              label="Latitud"
              type="number"
              inputProps={{ step: 'any' }}
              {...register('cord_latitud')}
              error={!!errors.cord_latitud}
              helperText={errors.cord_latitud?.message}
            />

            <TextField
              fullWidth
              label="Longitud"
              type="number"
              inputProps={{ step: 'any' }}
              {...register('cord_longitud')}
              error={!!errors.cord_longitud}
              helperText={errors.cord_longitud?.message}
            />

            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Controller
                name="estado"
                control={control}
                render={({ field }) => (
                  <Select {...field} label="Estado">
                    <MenuItem value={true}>Activo</MenuItem>
                    <MenuItem value={false}>Inactivo</MenuItem>
                  </Select>
                )}
              />
            </FormControl>

            <TextField
              fullWidth
              label="Disponibilidad"
              {...register('disponibilidad')}
              error={!!errors.disponibilidad}
              helperText={errors.disponibilidad?.message}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading && <CircularProgress size={20} />}
          >
            {isLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
