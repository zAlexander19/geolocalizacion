import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material'
import { Login as LoginIcon, LocationOn } from '@mui/icons-material'
import api from '../../lib/api'
import { setToken } from '../../lib/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const loginMutation = useMutation({
    mutationFn: async (credentials) => {
      const res = await api.post('/auth/login', credentials)
      return res.data
    },
    onSuccess: (data) => {
      if (data.data?.token) {
        setToken(data.data.token)
        navigate('/admin')
      } else {
        setError(data.error || 'Error desconocido')
      }
    },
    onError: (err) => {
      setError(err.response?.data?.error || err.message)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    loginMutation.mutate({ email, password })
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.50',
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <LocationOn color="primary" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Geolocalización Campus
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Panel de Administración
          </Typography>
        </Box>

        <Card elevation={3}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              Iniciar Sesión
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Correo Electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                margin="normal"
                autoComplete="email"
              />

              <TextField
                fullWidth
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                margin="normal"
                autoComplete="current-password"
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loginMutation.isPending}
                startIcon={loginMutation.isPending ? <CircularProgress size={20} /> : <LoginIcon />}
                sx={{ mt: 3, mb: 2 }}
              >
                {loginMutation.isPending ? 'Ingresando...' : 'Ingresar'}
              </Button>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Credenciales de prueba:</strong><br />
                  Email: admin@unap.cl<br />
                  Contraseña: 123456
                </Typography>
              </Alert>
            </form>
          </CardContent>
        </Card>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button onClick={() => navigate('/')} variant="text">
            Volver al inicio
          </Button>
        </Box>
      </Container>
    </Box>
  )
}
