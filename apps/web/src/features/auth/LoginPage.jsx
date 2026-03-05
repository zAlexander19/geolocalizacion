import { useState } from 'react'
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(email, password)

    if (result.success) {
      const user = result.data.usuario
      if (user.rol === 'totem') {
        navigate('/', {
          replace: true,
          state: {
            isTotem: true,
            totemLocation: user.totem,
            totemName: user.totem?.nombre_totem,
          },
        })
      } else {
        const from = location.state?.from?.pathname || '/admin'
        navigate(from, { replace: true })
      }
    } else {
      setError(result.error || 'Error al iniciar sesión')
    }

    setLoading(false)
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        width: '100%',
        display: 'flex',
        background: 'linear-gradient(135deg, #0a2540 0%, #0d3460 50%, #0a2540 100%)',
        willChange: 'auto',
      }}
    >
      {/* Panel izquierdo — branding (solo desktop) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 6,
          position: 'relative',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Círculos decorativos estáticos — sin blur, sin animación */}
        <Box sx={{
          position: 'absolute', width: 400, height: 400,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
          top: '10%', left: '-10%',
          pointerEvents: 'none',
        }} />
        <Box sx={{
          position: 'absolute', width: 300, height: 300,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
          bottom: '10%', right: '-5%',
          pointerEvents: 'none',
        }} />

        <Box sx={{ position: 'relative', textAlign: 'center', maxWidth: 420 }}>
          <Box
            component="img"
            src="/unap-logo-new.png"
            alt="UNAP"
            sx={{ width: 140, mb: 4, filter: 'brightness(0) invert(1)', opacity: 0.9 }}
          />
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, mb: 2, lineHeight: 1.3 }}>
            GeoCampus UNAP
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
            Plataforma de geolocalización del campus universitario. Gestiona edificios, salas y servicios.
          </Typography>
        </Box>
      </Box>

      {/* Panel derecho — formulario */}
      <Box
        sx={{
          flex: { xs: 1, md: '0 0 440px' },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 3, sm: 5 },
          py: 6,
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        {/* Logo visible solo en mobile */}
        <Box
          component="img"
          src="/unap-logo-new.png"
          alt="UNAP"
          sx={{
            display: { xs: 'block', md: 'none' },
            width: 90, mb: 4,
            filter: 'brightness(0) invert(1)',
            opacity: 0.85,
          }}
        />

        <Box sx={{ width: '100%', maxWidth: 360 }}>
          {/* Encabezado */}
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, mb: 0.5 }}>
            Bienvenido
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', mb: 4 }}>
            Ingresa tus credenciales para continuar
          </Typography>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3, borderRadius: 2,
                bgcolor: 'rgba(211,47,47,0.15)',
                color: '#ff8a80',
                border: '1px solid rgba(211,47,47,0.3)',
                '& .MuiAlert-icon': { color: '#ff8a80' },
              }}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              disabled={loading}
              autoComplete="email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={fieldSx}
            />

            <TextField
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              disabled={loading}
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      tabIndex={-1}
                      sx={{ color: 'rgba(255,255,255,0.35)' }}
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={fieldSx}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{
                mt: 0.5,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 700,
                fontSize: '1rem',
                textTransform: 'none',
                background: 'linear-gradient(90deg, #1565c0, #1976d2)',
                boxShadow: '0 4px 16px rgba(21,101,192,0.4)',
                transition: 'opacity 0.2s, transform 0.1s',
                '&:hover': {
                  background: 'linear-gradient(90deg, #1565c0, #1976d2)',
                  opacity: 0.9,
                  transform: 'translateY(-1px)',
                  boxShadow: '0 6px 20px rgba(21,101,192,0.5)',
                },
                '&:active': { transform: 'translateY(0)' },
                '&.Mui-disabled': { opacity: 0.5, background: 'linear-gradient(90deg, #1565c0, #1976d2)' },
              }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: 'white' }} /> : 'Iniciar sesión'}
            </Button>

            <Button
              variant="text"
              fullWidth
              onClick={() => navigate('/')}
              disabled={loading}
              startIcon={<ArrowBackIcon fontSize="small" />}
              sx={{
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'none',
                fontWeight: 400,
                '&:hover': { color: 'rgba(255,255,255,0.7)', background: 'transparent' },
              }}
            >
              Volver al inicio
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

// Estilos reutilizables para los TextField oscuros
const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    color: 'white',
    background: 'rgba(255,255,255,0.06)',
    transition: 'background 0.2s',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.35)' },
    '&.Mui-focused fieldset': { borderColor: '#42a5f5' },
    '&:hover': { background: 'rgba(255,255,255,0.09)' },
    '&.Mui-focused': { background: 'rgba(255,255,255,0.09)' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#42a5f5' },
  '& input:-webkit-autofill': {
    WebkitBoxShadow: '0 0 0 100px #0d2d55 inset',
    WebkitTextFillColor: 'white',
    caretColor: 'white',
  },
}
