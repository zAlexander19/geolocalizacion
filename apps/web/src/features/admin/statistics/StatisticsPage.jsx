import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../../lib/api'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  Search as SearchIcon,
  Business as BuildingIcon,
  MeetingRoom as RoomIcon,
  Wc as BathroomIcon,
  Download as DownloadIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material'

export default function StatisticsPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Query para obtener estadísticas
  const { data: statistics, isLoading, error, refetch } = useQuery({
    queryKey: ['statistics', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      const res = await api.get(`/statistics/summary?${params}`)
      return res.data.data
    },
  })

  // Query para obtener reporte completo
  const { data: report } = useQuery({
    queryKey: ['statistics-report', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      params.append('limit', '1000')
      
      const res = await api.get(`/statistics/report?${params}`)
      return res.data.data
    },
  })

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      const response = await fetch(`${api.defaults.baseURL}/statistics/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `estadisticas_${new Date().toISOString()}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error al exportar:', error)
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error al cargar estadísticas: {error.message}
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: 'white' }}>
            <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Estadísticas de Uso
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Análisis de búsquedas y consultas del sistema
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
        >
          Exportar CSV
        </Button>
      </Box>

      {/* Filtros de fecha */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filtrar por Fecha
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                label="Fecha Inicio"
                type="date"
                fullWidth
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Fecha Fin"
                type="date"
                fullWidth
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="outlined"
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
                fullWidth
              >
                Limpiar Filtros
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Métricas generales */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Búsquedas
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {statistics?.total || 0}
                  </Typography>
                </Box>
                <SearchIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Búsquedas de Salas
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {statistics?.byType?.find(t => t.search_type === 'sala')?.count || 0}
                  </Typography>
                </Box>
                <RoomIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Búsquedas de Edificios
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {statistics?.byType?.find(t => t.search_type === 'edificio')?.count || 0}
                  </Typography>
                </Box>
                <BuildingIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Búsquedas de Baños
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {statistics?.byType?.find(t => t.search_type === 'bano')?.count || 0}
                  </Typography>
                </Box>
                <BathroomIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Cobertura de Registros
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {report?.percentage || 0}%
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Búsquedas por tipo */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Distribución por Tipo de Búsqueda
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {statistics?.byType?.map((item, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {item.search_type}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {item.count} ({item.percentage}%)
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: '100%',
                      height: 8,
                      bgcolor: 'grey.200',
                      borderRadius: 1,
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      sx={{
                        width: `${item.percentage}%`,
                        height: '100%',
                        bgcolor: 'primary.main',
                        transition: 'width 0.3s'
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Top salas más buscadas */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top 10 Salas Más Buscadas
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Sala</TableCell>
                      <TableCell align="right">Búsquedas</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {statistics?.topRooms?.slice(0, 10).map((room, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{room.name}</TableCell>
                        <TableCell align="right">
                          <Chip label={room.searches} size="small" color="primary" />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!statistics?.topRooms || statistics.topRooms.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No hay datos disponibles
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Top edificios más buscados */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top 10 Edificios Más Buscados
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Edificio</TableCell>
                      <TableCell align="right">Búsquedas</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {statistics?.topBuildings?.slice(0, 10).map((building, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{building.name}</TableCell>
                        <TableCell align="right">
                          <Chip label={building.searches} size="small" color="warning" />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!statistics?.topBuildings || statistics.topBuildings.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No hay datos disponibles
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Términos de búsqueda más frecuentes */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Términos Más Buscados
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {statistics?.topSearchTerms?.slice(0, 20).map((term, index) => (
                  <Chip
                    key={index}
                    label={`${term.search_query} (${term.count})`}
                    color="primary"
                    variant="filled"
                    size="small"
                  />
                ))}
                {(!statistics?.topSearchTerms || statistics.topSearchTerms.length === 0) && (
                  <Typography variant="body2" color="text.secondary">
                    No hay datos disponibles
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Reporte de cobertura */}
      {report && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Reporte de Cobertura de Registros
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                  <Typography variant="body2">Total de Registros</Typography>
                  <Typography variant="h5" fontWeight="bold">{report.total}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <Typography variant="body2">Registros Retornados</Typography>
                  <Typography variant="h5" fontWeight="bold">{report.returned}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, bgcolor: report.percentage >= 95 ? 'success.main' : 'warning.main', color: 'white' }}>
                  <Typography variant="body2">Porcentaje de Cobertura</Typography>
                  <Typography variant="h5" fontWeight="bold">{report.percentage}%</Typography>
                </Paper>
              </Grid>
            </Grid>
            {report.percentage >= 95 ? (
              <Alert severity="success" sx={{ mt: 2 }}>
                ✓ Cumple con el criterio de aceptación (≥95% de cobertura)
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mt: 2 }}>
                ⚠ No cumple con el criterio de aceptación (requiere ≥95% de cobertura)
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
