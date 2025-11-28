import { useState } from 'react'
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Business as BuildingIcon,
  Layers as LayersIcon,
  MeetingRoom as RoomIcon,
  Wc as BathroomIcon,
  ExitToApp as LogoutIcon,
  Map as MapIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import BathroomsAdmin from './bathrooms' // render directo si la ruta coincide

const drawerWidth = 240

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  // estado local para controlar la sección activa (evita que el router te saque al lobby si la ruta no está registrada)
  const [activePath, setActivePath] = useState(location?.pathname || '/admin')
  // considerar baños si la URL actual o el estado local indican la ruta
  const isBathroomsRoute = !!location && !!location.pathname && (location.pathname.startsWith('/admin/banos') || location.pathname.startsWith('/admin/bathrooms') || activePath.startsWith('/admin/banos') || activePath.startsWith('/admin/bathrooms'))
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleLogout = () => {
    // Placeholder: aquí iría logout real (limpiar token)
    navigate('/')
  }

  const menuItems = [
    { label: 'Edificios', icon: <BuildingIcon />, path: '/admin/edificios' },
    { label: 'Pisos', icon: <LayersIcon />, path: '/admin/pisos' },
    { label: 'Salas', icon: <RoomIcon />, path: '/admin/salas' },
    { label: 'Facultades', icon: <BuildingIcon />, path: '/admin/facultades' },
    { label: 'Baños', icon: <BathroomIcon />, path: '/admin/banos' },
    { label: 'Ver Mapa', icon: <MapIcon />, path: '/admin/mapa' },
    { label: 'Importar OSM', icon: <UploadIcon />, path: '/admin/osm-import' },
  ]

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #000000 0%, #1a1a1a 100%)' }}>
      <Toolbar sx={{ bgcolor: 'rgba(0, 0, 0, 0.5)', color: 'white', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
          Administración
        </Typography>
      </Toolbar>
      <List sx={{ flexGrow: 1, pt: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ px: 1, mb: 0.5 }}>
            <ListItemButton
              selected={ (location && location.pathname && location.pathname.startsWith(item.path)) || activePath.startsWith(item.path) }
              onClick={() => {
                if (item.path === '/admin/banos' || item.path === '/admin/bathrooms') {
                  setActivePath(item.path)
                  try {
                    window.history.pushState(null, '', item.path)
                  } catch (e) {
                    navigate(item.path)
                  }
                } else {
                  setActivePath(item.path)
                  navigate(item.path)
                }
              }}
              sx={{
                borderRadius: 2,
                color: 'rgba(255, 255, 255, 0.8)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                },
                '&.Mui-selected': {
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText 
                primary={item.label} 
                primaryTypographyProps={{ 
                  fontWeight: (location && location.pathname && location.pathname.startsWith(item.path)) || activePath.startsWith(item.path) ? 600 : 400,
                  fontSize: '0.95rem',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <List sx={{ pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)', px: 1, pb: 2 }}>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              color: 'rgba(255, 255, 255, 0.8)',
              '&:hover': {
                bgcolor: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Cerrar Sesión" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          background: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'white',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
            Geolocalización Campus - Panel Admin
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          background: 'linear-gradient(135deg, #0a2540 0%, #0d335a 25%, #164e85 50%, #0d335a 100%)',
          minHeight: '100vh',
          margin: 0,
          overflow: 'auto',
        }}
      >
        <Toolbar />
        {isBathroomsRoute ? <BathroomsAdmin /> : <Outlet />}
      </Box>
    </Box>
  )
}
