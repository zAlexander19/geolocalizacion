import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
  IconButton,
} from '@mui/material'
import {
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import api from '../../../lib/api'
import { useAuth } from '../../../contexts/AuthContext'

export default function AuditLogPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { user } = useAuth()
  const [filterAction, setFilterAction] = useState('')
  const [filterEntityType, setFilterEntityType] = useState('')
  const [filterUserEmail, setFilterUserEmail] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)

  const { data: auditData, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', filterAction, filterEntityType, filterUserEmail],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filterAction) params.append('action', filterAction)
      if (filterEntityType) params.append('entityType', filterEntityType)
      if (filterUserEmail) params.append('userEmail', filterUserEmail)
      params.append('limit', '100')
      
      const res = await api.get(`/audit-logs?${params.toString()}`)
      return res.data
    },
  })

  const handleViewDetails = (log) => {
    setSelectedLog(log)
    setDetailsOpen(true)
  }

  const getActionColor = (action) => {
    switch (action) {
      case 'crear':
        return 'success'
      case 'modificar':
        return 'warning'
      case 'eliminar':
        return 'error'
      case 'restaurar':
        return 'info'
      case 'eliminar_permanente':
        return 'error'
      default:
        return 'default'
    }
  }

  const getEntityTypeLabel = (entityType) => {
    const labels = {
      edificio: 'Edificio',
      piso: 'Piso',
      sala: 'Sala',
      baño: 'Baño',
      facultad: 'Facultad',
    }
    return labels[entityType] || entityType
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const renderChanges = (changes) => {
    if (!changes) return <Typography variant="body2">Sin detalles</Typography>

    try {
      const changesObj = typeof changes === 'string' ? JSON.parse(changes) : changes

      // Si changesObj no es un objeto válido, mostrar el contenido tal cual
      if (typeof changesObj !== 'object' || changesObj === null) {
        return (
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '12px', 
            borderRadius: '4px',
            fontSize: '12px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {JSON.stringify(changes, null, 2)}
          </pre>
        )
      }

      return (
        <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>


          {changesObj.anterior && changesObj.nuevo && (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {Object.keys(changesObj.nuevo).filter(key => key !== 'updated_at' && key !== 'created_at').map((key) => {
                  const oldValue = changesObj.anterior[key]
                  const newValue = changesObj.nuevo[key]
                  
                  // Solo mostrar si hubo cambio
                  if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return null
                  
                  return (
                    <Box 
                      key={key} 
                      sx={{ 
                        borderRadius: 1, 
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          fontWeight: 'bold', 
                          textTransform: 'capitalize',
                          bgcolor: 'primary.main',
                          color: 'white',
                          p: 1.5
                        }}
                      >
                        {key.replace(/_/g, ' ')}
                      </Typography>
                      
                      <Box sx={{ bgcolor: '#1a1a1a', p: 2, borderBottom: '2px solid #ff9800' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#ff9800', display: 'block', mb: 1 }}>
                          ⬆️ Valor Anterior:
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#ffffff', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                          {typeof oldValue === 'object' ? JSON.stringify(oldValue, null, 2) : String(oldValue || '(vacío)')}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ bgcolor: '#0d1b2a', p: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#42a5f5', display: 'block', mb: 1 }}>
                          ⬇️ Valor Nuevo:
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#ffffff', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                          {typeof newValue === 'object' ? JSON.stringify(newValue, null, 2) : String(newValue || '(vacío)')}
                        </Typography>
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            </>
          )}



        </Box>
      )
    } catch (error) {
      console.error('Error al renderizar cambios:', error)
      return (
        <Box>
          <Typography variant="body2" color="error" sx={{ mb: 1 }}>
            Error al mostrar cambios: {error.message}
          </Typography>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '12px', 
            borderRadius: '4px',
            fontSize: '12px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {typeof changes === 'string' ? changes : JSON.stringify(changes, null, 2)}
          </pre>
        </Box>
      )
    }
  }

  const logs = auditData?.data || []

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 'bold' }}>
            Historial de Cambios
          </Typography>
          <IconButton onClick={() => refetch()} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: 2, 
          alignItems: isMobile ? 'stretch' : 'center',
        }}>
          <FormControl size="small" fullWidth={isMobile} sx={{ minWidth: isMobile ? 'auto' : 150 }}>
            <InputLabel>Acción</InputLabel>
            <Select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              label="Acción"
            >
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="crear">Crear</MenuItem>
              <MenuItem value="modificar">Modificar</MenuItem>
              <MenuItem value="eliminar">Eliminar</MenuItem>
              <MenuItem value="restaurar">Restaurar</MenuItem>
              <MenuItem value="eliminar_permanente">Eliminar Permanente</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth={isMobile} sx={{ minWidth: isMobile ? 'auto' : 150 }}>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value)}
              label="Tipo"
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="edificio">Edificio</MenuItem>
              <MenuItem value="piso">Piso</MenuItem>
              <MenuItem value="sala">Sala</MenuItem>
              <MenuItem value="baño">Baño</MenuItem>
              <MenuItem value="facultad">Facultad</MenuItem>
            </Select>
          </FormControl>

          <TextField
            placeholder="Filtrar por email..."
            value={filterUserEmail}
            onChange={(e) => setFilterUserEmail(e.target.value)}
            size="small"
            fullWidth={isMobile}
            sx={{ minWidth: isMobile ? 'auto' : 250 }}
          />

          {(filterAction || filterEntityType || filterUserEmail) && (
            <Button 
              variant="outlined" 
              onClick={() => {
                setFilterAction('')
                setFilterEntityType('')
                setFilterUserEmail('')
              }}
              size="small"
              fullWidth={isMobile}
            >
              Limpiar
            </Button>
          )}
        </Box>
      </Box>

      {isLoading ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography>Cargando...</Typography>
        </Paper>
      ) : (
        <>
          {/* Vista Mobile - Cards */}
          {isMobile ? (
            <Grid container spacing={2}>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <Grid item xs={12} key={log.id_audit}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                          <Chip 
                            label={log.action} 
                            color={getActionColor(log.action)} 
                            size="small" 
                          />
                          <Chip 
                            label={getEntityTypeLabel(log.entity_type)} 
                            variant="outlined"
                            size="small" 
                          />
                        </Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Usuario:</strong> {log.user_email}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Entidad:</strong> {log.entity_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                          {formatDate(log.created_at)}
                        </Typography>
                        <Button 
                          size="small" 
                          variant="outlined"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleViewDetails(log)}
                          fullWidth
                        >
                          Ver Detalles
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary">
                      No se encontraron registros
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          ) : (
            /* Vista Desktop - Tabla */
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Acción</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Entidad</TableCell>
                    <TableCell>Detalles</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length > 0 ? (
                    logs.map((log) => (
                      <TableRow key={log.id_audit} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell>{log.user_email}</TableCell>
                        <TableCell>
                          <Chip 
                            label={log.action} 
                            color={getActionColor(log.action)} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={getEntityTypeLabel(log.entity_type)} 
                            variant="outlined"
                            size="small"
                            sx={{
                              color: 'primary.main',
                              borderColor: 'primary.main'
                            }}
                          />
                        </TableCell>
                        <TableCell>{log.entity_name}</TableCell>
                        <TableCell>
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewDetails(log)}
                            color="primary"
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                          No se encontraron registros
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Modal de detalles */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Detalles del Cambio
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Usuario:</strong> {selectedLog.user_email}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Acción:</strong>{' '}
                  <Chip 
                    label={selectedLog.action} 
                    color={getActionColor(selectedLog.action)} 
                    size="small" 
                  />
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Tipo:</strong> {getEntityTypeLabel(selectedLog.entity_type)}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Entidad:</strong> {selectedLog.entity_name}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Fecha:</strong> {formatDate(selectedLog.created_at)}
                </Typography>
              </Box>
              
              {renderChanges(selectedLog.changes)}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
