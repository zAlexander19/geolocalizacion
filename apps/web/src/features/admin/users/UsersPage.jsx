import { useState } from 'react'
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
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material'
import DataTable from '../../../components/DataTable'
import { authService } from '../../../lib/auth'

export default function UsersPage() {
  const [users, setUsers] = useState([
    {
      id: '1',
      name: 'Administrador Principal',
      email: 'admin@example.com',
      role: 'super-admin',
      createdAt: '2024-01-15',
    },
    {
      id: '2',
      name: 'Administrador Secundario',
      email: 'staff@example.com',
      role: 'admin',
      createdAt: '2024-02-20',
    },
  ])

  const [openDialog, setOpenDialog] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin', // Solo pueden crear admins normales
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const currentUser = authService.getUser()
  const isSuperAdmin = authService.isSuperAdmin()

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
      })
    } else {
      setEditingUser(null)
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'admin',
      })
    }
    setOpenDialog(true)
    setError('')
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingUser(null)
    setFormData({ name: '', email: '', password: '', role: 'admin' })
    setError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validaciones
    if (!formData.name || !formData.email) {
      setError('Nombre y email son obligatorios')
      return
    }

    if (!editingUser && !formData.password) {
      setError('La contraseña es obligatoria para nuevos usuarios')
      return
    }

    if (editingUser) {
      // Editar usuario existente
      setUsers(
        users.map((u) =>
          u.id === editingUser.id
            ? { ...u, name: formData.name, email: formData.email }
            : u
        )
      )
      setSuccess('Usuario actualizado correctamente')
    } else {
      // Crear nuevo usuario
      const newUser = {
        id: String(Date.now()),
        name: formData.name,
        email: formData.email,
        role: 'admin', // Solo pueden crear admin regular
        createdAt: new Date().toISOString().split('T')[0],
      }
      setUsers([...users, newUser])
      setSuccess('Usuario creado correctamente')
    }

    handleCloseDialog()
  }

  const handleDelete = (userId) => {
    if (userId === currentUser.id) {
      setError('No puedes eliminar tu propia cuenta')
      return
    }

    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      setUsers(users.filter((u) => u.id !== userId))
      setSuccess('Usuario eliminado correctamente')
    }
  }

  const columns = [
    {
      field: 'name',
      headerName: 'Nombre',
      flex: 1,
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
    },
    {
      field: 'role',
      headerName: 'Rol',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.value === 'super-admin' ? 'Super Admin' : 'Admin'}
          color={params.value === 'super-admin' ? 'primary' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Fecha de Creación',
      width: 150,
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleOpenDialog(params.row)}
            disabled={params.row.role === 'super-admin' && params.row.id !== currentUser.id}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(params.row.id)}
            disabled={params.row.role === 'super-admin' || params.row.id === currentUser.id}
            color="error"
          >
            <DeleteIcon fontSize="small" />
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
              • <strong>Super Admin:</strong> Puede crear y gestionar otros administradores
            </Typography>
            <Typography variant="body2">
              • <strong>Admin:</strong> Puede gestionar edificios, pisos y salas, pero no puede crear otros usuarios
            </Typography>
          </Alert>

          <DataTable rows={users} columns={columns} />
        </CardContent>
      </Card>

      {/* Dialog para crear/editar usuario */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingUser ? 'Editar Administrador' : 'Crear Nuevo Administrador'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}

              <TextField
                label="Nombre completo"
                fullWidth
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
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
                disabled={editingUser?.role === 'super-admin'}
              />

              <TextField
                label={editingUser ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña'}
                type="password"
                fullWidth
                required={!editingUser}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />

              <Alert severity="info">
                Los administradores que crees tendrán rol de <strong>Admin</strong> (no podrán crear otros usuarios)
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button type="submit" variant="contained">
              {editingUser ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}
