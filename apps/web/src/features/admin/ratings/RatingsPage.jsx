import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Rating,
  CircularProgress
} from '@mui/material';
import api from '../../../lib/api';

export default function RatingsPage() {
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const response = await api.get('/ratings');
        if (response.data && response.data.success) {
          setRatings(response.data.data);
          setStats(response.data.stats);
        }
      } catch (error) {
        console.error('Error fetching ratings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRatings();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 4, fontWeight: 'bold' }}>Valoraciones (Geo-Campus)</Typography>
      
      {stats && (
        <Box sx={{ display: 'flex', gap: 4, mb: 4 }}>
          <Paper sx={{ p: 3, textAlign: 'center', minWidth: 150 }}>
            <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
              {stats.average || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">Promedio de Estrellas</Typography>
            <Rating value={Number(stats.average || 0)} readOnly precision={0.1} sx={{ mt: 1 }} />
          </Paper>
          <Paper sx={{ p: 3, textAlign: 'center', minWidth: 150 }}>
            <Typography variant="h4" color="secondary" sx={{ fontWeight: 'bold' }}>
              {stats.total_count || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">Total de Valoraciones</Typography>
          </Paper>
        </Box>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'background.default' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Estrellas</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Comentario</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ratings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">No hay valoraciones todavía</TableCell>
              </TableRow>
            ) : (
              ratings.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    <Rating value={row.stars} readOnly size="small" />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 400, wordWrap: 'break-word' }}>
                    {row.description}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
