import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Card,
  CardContent,
  Chip,
  Stack,
  CircularProgress,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PersonAdd as PersonAddIcon,
  Lock as LockIcon,
} from '@mui/icons-material'
import DataTable from '../../../components/DataTable'
import { authService } from '../../../lib/auth'
import api from '../../../lib/api'

export default function UsersPage() {
  const queryClient = useQueryClient()

  const [openDialog, setOpenDialog] = useState(false)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [resetPasswordUser, setResetPasswordUser] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'admin_secundario',
  })
  const [editFormData, setEditFormData] = useState({
    nombre: '',
    email: '',
    password: '',
  })
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const currentUser = authService.getUser()
  const isSuperAdmin = authService.isSuperAdmin()

  // Obtener todos los usuarios
  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const response = await api.get('/auth/users')
      return response.data.data
    },
    enabled: isSuperAdmin,
  })

  // Crear usuario
  const createMutation = useMutation({
    mutationFn: async (userData) => {
      const response = await api.post('/auth/users', userData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['usuarios'])
      setSuccess('Usuario creado exitosamente')
      handleCloseDialog()
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Error al crear usuario')
    },
  })

  // Actualizar usuario (nombre, email, contraseña)
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }) => {
      // Actualizar nombre y email
      if (userData.nombre || userData.email) {
        await api.put(`/auth/users/${userId}`, {
          nombre: userData.nombre,
          email: userData.email
        })
      }
      
      // Si hay contraseña, usar el endpoint de reset password
      if (userData.password) {
        await api.post(`/auth/users/${userId}/reset-password`, { passwordNueva: userData.password })
      }
      
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['usuarios'])
      setSuccess('Usuario actualizado exitosamente')
      handleCloseEditDialog()
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Error al actualizar usuario')
    },
  })

  // Actualizar estado de usuario
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, estado }) => {
      const response = await api.patch(`/auth/users/${userId}/status`, { estado })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['usuarios'])
      setSuccess('Estado del usuario actualizado')
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Error al actualizar estado')
    },
  })

  // Resetear contraseña
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, passwordNueva }) => {
      const response = await api.post(`/auth/users/${userId}/reset-password`, { passwordNueva })
      return response.data
    },
    onSuccess: () => {
      setSuccess('Contraseña actualizada exitosamente')
      setOpenPasswordDialog(false)
      setResetPasswordUser(null)
      setNewPassword('')
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Error al cambiar contraseña')
    },
  })

  const handleOpenEditDialog = (user) => {
    setEditingUser(user)
    setEditFormData({
      nombre: user.nombre,
      email: user.email,
      password: '',
    })
    setOpenEditDialog(true)
    setError('')
  }

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false)
    setEditingUser(null)
    setEditFormData({ nombre: '', email: '', password: '' })
    setError('')
  }

  const handleOpenPasswordDialog = (user) => {
    setResetPasswordUser(user)
    setNewPassword('')
    setOpenPasswordDialog(true)
    setError('')
  }

  const handleClosePasswordDialog = () => {
    setOpenPasswordDialog(false)
    setResetPasswordUser(null)
    setNewPassword('')
    setError('')
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingUser(null)
    setFormData({ nombre: '', email: '', password: '', rol: 'admin_secundario' })
    setError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validaciones
    if (!formData.nombre || !formData.email || !formData.password) {
      setError('Todos los campos son obligatorios')
      return
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    createMutation.mutate(formData)
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (!editFormData.nombre || !editFormData.email) {
      setError('Nombre y email son obligatorios')
      return
    }

    if (editFormData.password && editFormData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    updateUserMutation.mutate({
      userId: editingUser.id_usuario,
      userData: editFormData,
    })
  }

  const handleResetPassword = (e) => {
    e.preventDefault()
    setError('')

    if (!newPassword || newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    resetPasswordMutation.mutate({
      userId: resetPasswordUser.id_usuario,
      passwordNueva: newPassword,
    })
  }

  const handleToggleStatus = (user) => {
    if (user.id_usuario === parseInt(currentUser.id)) {
      setError('No puedes cambiar tu propio estado')
      return
    }

    updateStatusMutation.mutate({
      userId: user.id_usuario,
      estado: !user.estado,
    })
  }

  // Mapear usuarios para la tabla
  const rows = usuarios?.map(u => ({
    id: u.id_usuario,
    id_usuario: u.id_usuario,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    estado: u.estado,
    created_at: new Date(u.created_at).toLocaleDateString(),
    ultimo_acceso: u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleDateString() : 'Nunca',
  })) || []

  const columns = [
    {
      field: 'nombre',
      headerName: 'Nombre',
      flex: 1,
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
    },
    {
      field: 'rol',
      headerName: 'Rol',
      width: 180,
      renderCell: (params) => (
        <Chip
          label={params.value === 'admin_primario' ? 'Super Admin' : 'Admin Secundario'}
          color={params.value === 'admin_primario' ? 'primary' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'estado',
      headerName: 'Estado',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Activo' : 'Inactivo'}
          color={params.value ? 'success' : 'error'}
          size="small"
        />
      ),
    },
    {
      field: 'created_at',
      headerName: 'Fecha de Creación',
      width: 150,
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => handleOpenEditDialog(params.row)}
            disabled={params.row.id_usuario === parseInt(currentUser.id)}
            title="Editar usuario"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleToggleStatus(params.row)}
            disabled={params.row.rol === 'admin_primario' || params.row.id_usuario === parseInt(currentUser.id)}
            color={params.row.estado ? 'error' : 'success'}
            title={params.row.estado ? 'Desactivar' : 'Activar'}
          >
            {params.row.estado ? <DeleteIcon fontSize="small" /> : <AddIcon fontSize="small" />}
          </IconButton>
        </Box>
      ),
    },
  ]

  if (!isSuperAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Solo los Super Administradores pueden gestionar usuarios.
        </Alert>
      </Box>
    )
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Gestión de Usuarios
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Crear Administrador
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              <strong>Información sobre roles:</strong>
            </Typography>
            <Typography variant="body2">
              • <strong>Super Admin (admin_primario):</strong> Puede crear y gestionar otros administradores
            </Typography>
            <Typography variant="body2">
              • <strong>Admin Secundario (admin_secundario):</strong> Puede gestionar edificios, pisos y salas, pero no puede crear otros usuarios
            </Typography>
          </Alert>

          <DataTable rows={rows} columns={columns} />
        </CardContent>
      </Card>

      {/* Dialog para crear usuario */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Crear Nuevo Administrador</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Nombre completo"
                fullWidth
                required
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
              />

              <TextField
                label="Email"
                type="email"
                fullWidth
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />

              <TextField
                label="Contraseña"
                type="password"
                fullWidth
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                helperText="Mínimo 6 caracteres"
              />

              <Alert severity="info">
                Los administradores que crees tendrán rol de <strong>Admin Secundario</strong> (no podrán crear otros usuarios)
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={createMutation.isLoading}
            >
              {createMutation.isLoading ? 'Creando...' : 'Crear'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog para editar usuario */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleEditSubmit}>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Nombre completo"
                fullWidth
                required
                value={editFormData.nombre}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, nombre: e.target.value })
                }
              />

              <TextField
                label="Email"
                type="email"
                fullWidth
                required
                value={editFormData.email}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, email: e.target.value })
                }
                sx={{
                  '& .MuiInputBase-input': {
                    color: 'white',
                  },
                  '& .MuiFormHelperText-root': {
                    color: 'rgba(255, 255, 255, 0.7)'
                  }
                }}
              />

              <TextField
                label="Nueva Contraseña (opcional)"
                type="password"
                fullWidth
                value={editFormData.password}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, password: e.target.value })
                }
                helperText="Dejar vacío si no deseas cambiar la contraseña. Mínimo 6 caracteres"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditDialog}>Cancelar</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={updateUserMutation.isLoading}
            >
              {updateUserMutation.isLoading ? 'Actualizando...' : 'Guardar Cambios'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog para cambiar contraseña */}
      <Dialog open={openPasswordDialog} onClose={handleClosePasswordDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleResetPassword}>
          <DialogTitle>Cambiar Contraseña de Usuario</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="warning">
                Estás cambiando la contraseña de: <strong>{resetPasswordUser?.nombre}</strong>
              </Alert>

              <TextField
                label="Nueva Contraseña"
                type="password"
                fullWidth
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                helperText="Mínimo 6 caracteres"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePasswordDialog}>Cancelar</Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={resetPasswordMutation.isLoading}
            >
              {resetPasswordMutation.isLoading ? 'Actualizando...' : 'Cambiar Contraseña'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog para cambiar contraseña */}
      <Dialog open={openPasswordDialog} onClose={handleClosePasswordDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleResetPassword}>
          <DialogTitle>Cambiar Contraseña de Usuario</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Alert severity="warning">
                Estás cambiando la contraseña de: <strong>{resetPasswordUser?.nombre}</strong>
              </Alert>

              <TextField
                label="Nueva Contraseña"
                type="password"
                fullWidth
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                helperText="Mínimo 6 caracteres"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePasswordDialog}>Cancelar</Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={resetPasswordMutation.isLoading}
            >
              {resetPasswordMutation.isLoading ? 'Actualizando...' : 'Cambiar Contraseña'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}
