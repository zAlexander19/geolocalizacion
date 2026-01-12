import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../../lib/api'
import DateRangeCalendar from '../../../components/DateRangeCalendar'
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
  Popover,
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  Search as SearchIcon,
  Business as BuildingIcon,
  MeetingRoom as RoomIcon,
  Wc as BathroomIcon,
  Download as DownloadIcon,
  Assessment as AssessmentIcon,
  CalendarMonth as CalendarMonthIcon,
} from '@mui/icons-material'

export default function StatisticsPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Estado para el popover de filtro de fecha
  const [anchorEl, setAnchorEl] = useState(null)
  const [tempStartDate, setTempStartDate] = useState('')
  const [tempEndDate, setTempEndDate] = useState('')

  const handleOpenFilter = (event) => {
    setTempStartDate(startDate)
    setTempEndDate(endDate)
    setAnchorEl(event.currentTarget)
  }

  const handleCloseFilter = () => {
    setAnchorEl(null)
  }

  const handleApplyFilter = () => {
    setStartDate(tempStartDate)
    setEndDate(tempEndDate)
    handleCloseFilter()
  }

  const openFilter = Boolean(anchorEl)
  const filterId = openFilter ? 'date-filter-popover' : undefined

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
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<CalendarMonthIcon />}
              onClick={handleOpenFilter}
              size="large"
            >
              {startDate || endDate 
                ? `${startDate || 'Inicio'} - ${endDate || 'Fin'}`
                : 'Seleccionar Rango de Fecha'}
            </Button>
            
            {(startDate || endDate) && (
              <Button
                color="error"
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
              >
                Limpiar Filtros
              </Button>
            )}
          </Box>

          <Popover
            id={filterId}
            open={openFilter}
            anchorEl={anchorEl}
            onClose={handleCloseFilter}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            PaperProps={{
              sx: { bgcolor: '#1e293b', color: 'white' }
            }}
          >
            <Box sx={{ borderRadius: 1 }}>
              <DateRangeCalendar
                startDate={tempStartDate}
                endDate={tempEndDate}
                onChange={(start, end) => {
                  setTempStartDate(start)
                  setTempEndDate(end)
                }}
              />
              <Box sx={{ p: 2, pt: 0 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    label="Inicio"
                    size="small"
                    value={tempStartDate}
                    InputProps={{ 
                      readOnly: true,
                      sx: { color: 'white' }
                    }}
                    InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.7)' } }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                      }
                    }}
                    fullWidth
                  />
                  <TextField
                    label="Fin"
                    size="small"
                    value={tempEndDate}
                    InputProps={{ 
                      readOnly: true,
                      sx: { color: 'white' }
                    }}
                    InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.7)' } }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                      }
                    }}
                    fullWidth
                  />
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleApplyFilter}
                  disabled={!tempStartDate}
                >
                  Aplicar Filtro
                </Button>
              </Box>
            </Box>
          </Popover>
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


      </Grid>

      {/* Búsquedas por tipo */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
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


    </Box>
  )
}
