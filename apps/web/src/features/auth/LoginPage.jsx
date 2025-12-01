import { useState } from 'react'
import {
  Avatar,
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const onSubmit = (e) => {
    e.preventDefault()
    // Placeholder: aquí iría la llamada real al endpoint de login
    // Por ahora solo simulamos éxito y redirigimos al admin
    navigate('/admin')
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Background con degradado UNAP (azul marino) y patrón */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(ellipse at 20% 30%, rgba(22, 78, 133, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, rgba(13, 51, 90, 0.3) 0%, transparent 50%),
            linear-gradient(135deg, #0a2540 0%, #0d335a 25%, #164e85 50%, #1a5a9e 75%, #0d335a 100%)
          `,
          backgroundSize: '100% 100%, 100% 100%, cover',
          backgroundAttachment: 'fixed',
          zIndex: -2,
        }}
      >
        {/* Patrón de puntos decorativo */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
              radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            backgroundPosition: '0 0, 25px 25px',
            opacity: 0.4,
          }}
        />
      </Box>
      
      {/* Overlay adicional con difuminado sutil */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, rgba(10, 37, 64, 0.4) 0%, rgba(13, 51, 90, 0.6) 50%, rgba(10, 37, 64, 0.7) 100%)',
          backdropFilter: 'blur(2px)',
          zIndex: -1,
        }}
      />

      <Paper 
        elevation={6} 
        sx={{ 
          p: isMobile ? 2.5 : 4, 
          width: isMobile ? 'calc(100% - 32px)' : 400,
          maxWidth: isMobile ? 'calc(100% - 32px)' : 400,
          mx: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderRadius: 2,
        }}
      >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2, width: '100%' }}>
            <Avatar sx={{ m: 1, bgcolor: 'primary.main', width: 56, height: 56 }}>
              <LockOutlinedIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography component="h1" variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 'bold' }}>
              Iniciar sesión
            </Typography>
          </Box>
          <Box component="form" onSubmit={onSubmit} sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
            <TextField
              label="Correo"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
            />
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 1 }}>
              Entrar
            </Button>
            <Button variant="text" fullWidth onClick={() => navigate('/')}>Volver</Button>
          </Box>
        </Paper>
    </Box>
  )
}
