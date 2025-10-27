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
    // usar la ruta en español para que coincida con el router del admin
    { label: 'Baños', icon: <BathroomIcon />, path: '/admin/banos' },
  ]

  const drawer = (
    <Box>
      <Toolbar sx={{ bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6" noWrap>
          Administración
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              // marcar si la ruta actual empieza por la ruta del item o si el estado local la indica
              selected={ (location && location.pathname && location.pathname.startsWith(item.path)) || activePath.startsWith(item.path) }
              onClick={() => {
                // Interceptar el click en Baños: no usar navigate (evita redirección al lobby si ruta no existe)
                if (item.path === '/admin/banos' || item.path === '/admin/bathrooms') {
                  setActivePath(item.path)
                  try {
                    // actualizar URL en la barra sin disparar la navegación del router
                    window.history.pushState(null, '', item.path)
                  } catch (e) {
                    // fallback: intentar navigate si pushState falla
                    navigate(item.path)
                  }
                } else {
                  setActivePath(item.path)
                  navigate(item.path)
                }
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <List sx={{ mt: 'auto', pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Cerrar Sesión" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
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
          <Typography variant="h6" noWrap component="div">
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
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
      >
        <Toolbar />
        {isBathroomsRoute ? <BathroomsAdmin /> : <Outlet />}
      </Box>
    </Box>
  )
}
