import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  TextField,
  Typography,
  Container,
  Grid,
  InputAdornment,
} from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import api from '../../lib/api'

export default function FacultiesPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const { data: faculties } = useQuery({
    queryKey: ['faculties'],
    queryFn: async () => {
      const res = await api.get('/faculties')
      return res.data.data
    },
  })

  const { data: buildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => {
      const res = await api.get('/buildings')
      return res.data.data
    },
  })

  // Filter faculties by name or code
  const filteredFaculties = (faculties || []).filter(f =>
    String(f.nombre_facultad || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(f.codigo_facultad || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 4 }}>
        Facultades
      </Typography>

      {/* Search bar */}
      <TextField
        fullWidth
        placeholder="Buscar por nombre o código..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 4 }}
      />

      {/* Faculty cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filteredFaculties.map((faculty) => {
          // Get the associated building if id_edificio is set
          const associatedBuilding = faculty.id_edificio
            ? (buildings || []).find(b => Number(b.id_edificio) === Number(faculty.id_edificio))
            : null

          return (
            <Card key={faculty.codigo_facultad} sx={{ boxShadow: 2, borderRadius: 2 }}>
              <CardContent sx={{ p: 3 }}>
                {/* Faculty info: Logo left, Description right */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  {/* Logo on the left */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {faculty.logo ? (
                      <Box
                        component="img"
                        src={faculty.logo.startsWith('http') ? faculty.logo : `http://localhost:4000${faculty.logo}`}
                        alt={faculty.nombre_facultad}
                        sx={{
                          maxWidth: '100%',
                          maxHeight: 200,
                          objectFit: 'contain',
                          borderRadius: 1,
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 150,
                          height: 150,
                          bgcolor: 'grey.200',
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Sin logo
                        </Typography>
                      </Box>
                    )}
                  </Grid>

                  {/* Description on the right */}
                  <Grid item xs={12} sm={9}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {faculty.nombre_facultad}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                      Código: {faculty.codigo_facultad}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
                      {faculty.descripcion || 'Sin descripción'}
                    </Typography>
                  </Grid>
                </Grid>

                {/* Associated building(s) below */}
                {associatedBuilding && (
                  <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                      Edificio Asociado
                    </Typography>
                    <Card sx={{ maxWidth: 300, bgcolor: 'grey.50' }}>
                      <CardMedia
                        component="img"
                        height="200"
                        image={
                          associatedBuilding.imagen && !/via\.placeholder\.com/.test(associatedBuilding.imagen)
                            ? associatedBuilding.imagen.startsWith('http')
                              ? associatedBuilding.imagen
                              : `http://localhost:4000${associatedBuilding.imagen}`
                            : 'https://via.placeholder.com/300x200?text=Sin+imagen'
                        }
                        alt={associatedBuilding.nombre_edificio}
                      />
                      <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {associatedBuilding.nombre_edificio}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {associatedBuilding.acronimo || 'Sin acrónimo'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                )}
              </CardContent>
            </Card>
          )
        })}

        {filteredFaculties.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary">
              {faculties && faculties.length > 0 ? 'No se encontraron facultades' : 'No hay facultades disponibles'}
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  )
}
