import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { removeToken } from '../../lib/auth'
import {
  AppBar,
  Box,
  Button,
  Container,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from '@mui/material'
import {
  Business as BuildingIcon,
  Layers as FloorsIcon,
  MeetingRoom as RoomsIcon,
  BugReport as DebugIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material'

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const handleLogout = () => {
    removeToken()
    navigate('/login')
  }

  const tabs = [
    { value: '/admin/buildings', label: 'Edificios', icon: <BuildingIcon /> },
    { value: '/admin/floors', label: 'Pisos', icon: <FloorsIcon /> },
    { value: '/admin/rooms', label: 'Habitaciones', icon: <RoomsIcon /> },
    { value: '/admin/debug', label: 'Debug', icon: <DebugIcon /> },
  ]

  const currentTab = tabs.findIndex(tab => location.pathname.startsWith(tab.value))

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <AppBar position="static" elevation={1} sx={{ bgcolor: 'white', color: 'text.primary' }}>
        <Toolbar>
          <AdminIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Panel de Administración
          </Typography>
          <Button
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{ textTransform: 'none' }}
          >
            Cerrar Sesión
          </Button>
        </Toolbar>
      </AppBar>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white' }}>
        <Container maxWidth="xl">
          <Tabs
            value={currentTab >= 0 ? currentTab : 0}
            onChange={(e, newValue) => navigate(tabs[newValue].value)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 'medium',
                fontSize: '1rem',
                minHeight: 64,
              }
            }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.value}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  )
}
