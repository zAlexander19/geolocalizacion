import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Menu, MenuItem, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography, Avatar,
  CircularProgress, FormControl, InputLabel, Select,
} from '@mui/material'
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  MoreVert as MoreIcon, Search as SearchIcon, Image as ImageIcon,
} from '@mui/icons-material'
import api from '../../../lib/api'
import { queryClient } from '../../../lib/queryClient'

const floorSchema = z.object({
  nombre_piso: z.string().min(1).max(100),
  numero_piso: z.coerce.number(),
  imagen: z.string().optional(),
  id_edificio: z.coerce.number(),
  estado: z.coerce.boolean(),
  disponibilidad: z.string().max(20)
})

export default function FloorsPage() {
  const [search, setSearch] = useState('')
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [modalImg, setModalImg] = useState(null)
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)

  const { data: floors, isLoading } = useQuery({
    queryKey: ['floors', search, selectedBuilding],
    queryFn: async () => {
      if (!selectedBuilding) return []
      const res = await api.get(`/buildings/${selectedBuilding}/floors`, { params: { search } })
      return res.data.data
    },
    enabled: !!selectedBuilding
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
      const res = await api.post('/floors', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['floors'])
      setModalOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const res = await api.put(/floors/, payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['floors'])
      setModalOpen(false)
      setEditItem(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(/floors/)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['floors'])
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
    if (confirm('¿Borrar piso ' + item.nombre_piso + '?')) {
      deleteMutation.mutate(item.id_piso)
    }
    setAnchorEl(null)
  }

  const handleMenuOpen = (event, row) => {
    setAnchorEl(event.currentTarget)
    setSelectedRow(row)
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant='h4' component='h2' gutterBottom sx={{ fontWeight: 'bold' }}>
          Pisos
        </Typography>
        <Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
          Gestiona los pisos del sistema.
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
          <FormControl sx={{ minWidth: 250 }} size='small'>
            <InputLabel>Seleccionar Edificio</InputLabel>
            <Select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              label='Seleccionar Edificio'
            >
              <MenuItem value=''>
                <em>Ninguno</em>
              </MenuItem>
              {buildings?.map(b => (
                <MenuItem key={b.id_edificio} value={b.id_edificio}>
                  {b.nombre_edificio} ({b.acronimo})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder='Buscar pisos...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size='small'
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
            }}
            disabled={!selectedBuilding}
          />
          <Button variant='contained' startIcon={<AddIcon />} onClick={handleCreate} disabled={!selectedBuilding}>
            Crear Piso
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} elevation={1}>
        {!selectedBuilding ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant='body1' color='text.secondary'>
              Selecciona un edificio para ver sus pisos
            </Typography>
          </Box>
        ) : isLoading ? (
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
                <TableCell sx={{ fontWeight: 'bold' }}>Número</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Edificio</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Disponibilidad</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align='center'>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {floors?.map((row) => {
                const imageUrl = row.imagen && !/via\.placeholder\.com/.test(row.imagen)
                  ? (row.imagen.startsWith('http') ? row.imagen : `http://localhost:4000${row.imagen}`)
                  : null

                return (
                  <TableRow key={row.id_piso} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {row.id_piso}
                    </TableCell>
                    <TableCell>
                      {imageUrl ? (
                        <Avatar
                          src={imageUrl}
                          variant='rounded'
                          sx={{ width: 48, height: 48, cursor: 'pointer' }}
                          onClick={() => setModalImg(imageUrl)}
                        >
                          <ImageIcon />
                        </Avatar>
                      ) : (
                        <Avatar variant='rounded' sx={{ width: 48, height: 48, bgcolor: 'grey.300' }}>
                          <ImageIcon />
                        </Avatar>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'medium' }}>{row.nombre_piso}</TableCell>
                    <TableCell>{row.numero_piso}</TableCell>
                    <TableCell>
                      <Chip label={buildings?.find(b => b.id_edificio === row.id_edificio)?.nombre_edificio || row.id_edificio} size='small' variant='outlined' />
                    </TableCell>
                    <TableCell>
                      <Chip label={row.estado ? 'Activo' : 'Inactivo'} color={row.estado ? 'success' : 'error'} size='small' />
                    </TableCell>
                    <TableCell>
                      <Chip label={row.disponibilidad} color={row.disponibilidad === 'Disponible' ? 'success' : 'default'} size='small' />
                    </TableCell>
                    <TableCell align='center'>
                      <IconButton size='small' onClick={(e) => handleMenuOpen(e, row)}>
                        <MoreIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => handleEdit(selectedRow)}>
          <EditIcon sx={{ mr: 1 }} fontSize='small' />
          Editar
        </MenuItem>
        <MenuItem onClick={() => handleDelete(selectedRow)} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize='small' />
          Eliminar
        </MenuItem>
      </Menu>

      <FloorFormDialog
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditItem(null)
        }}
        editItem={editItem}
        buildings={buildings}
        onSubmit={(values) => {
          if (editItem) {
            updateMutation.mutate({ id: editItem.id_piso, ...values })
          } else {
            createMutation.mutate(values)
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog open={!!modalImg} onClose={() => setModalImg(null)} maxWidth='md' fullWidth>
        <DialogTitle>Imagen del piso</DialogTitle>
        <DialogContent>
          {modalImg && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <img
                src={modalImg}
                alt='Piso'
                style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
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

function FloorFormDialog({ open, onClose, editItem, buildings, onSubmit, isLoading }) {
  const fileRef = useRef()
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm({
    defaultValues: {
      nombre_piso: '',
      numero_piso: '',
      imagen: '',
      id_edificio: '',
      estado: true,
      disponibilidad: 'Disponible'
    },
    resolver: zodResolver(floorSchema),
  })

  // Reset form when editItem changes or dialog opens
  useEffect(() => {
    if (open) {
      reset(editItem || {
        nombre_piso: '',
        numero_piso: '',
        imagen: '',
        id_edificio: '',
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
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{editItem ? 'Editar Piso' : 'Crear Piso'}</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label='Nombre'
              {...register('nombre_piso')}
              error={!!errors.nombre_piso}
              helperText={errors.nombre_piso?.message}
            />
            
            <TextField
              fullWidth
              label='Número de Piso'
              type='number'
              {...register('numero_piso')}
              error={!!errors.numero_piso}
              helperText={errors.numero_piso?.message}
            />

            <FormControl fullWidth>
              <InputLabel>Edificio</InputLabel>
              <Controller
                name='id_edificio'
                control={control}
                render={({ field }) => (
                  <Select {...field} label='Edificio'>
                    {buildings?.map(b => (
                      <MenuItem key={b.id_edificio} value={b.id_edificio}>
                        {b.nombre_edificio}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>

            <Box>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                Imagen
              </Typography>
              <input type='file' ref={fileRef} accept='image/*' style={{ width: '100%' }} />
              {imagenUrl && (
                <Box sx={{ mt: 2 }}>
                  <img src={imagenUrl} alt='Preview' style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain' }} />
                </Box>
              )}
            </Box>

            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Controller
                name='estado'
                control={control}
                render={({ field }) => (
                  <Select {...field} label='Estado'>
                    <MenuItem value={true}>Activo</MenuItem>
                    <MenuItem value={false}>Inactivo</MenuItem>
                  </Select>
                )}
              />
            </FormControl>

            <TextField
              fullWidth
              label='Disponibilidad'
              {...register('disponibilidad')}
              error={!!errors.disponibilidad}
              helperText={errors.disponibilidad?.message}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            type='submit'
            variant='contained'
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
