import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import {
  CloudUpload as UploadIcon,
  Visibility as PreviewIcon,
  Map as MapIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material'
import api from '../../../lib/api'

export default function OSMImportPage() {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [importOptions, setImportOptions] = useState({
    mergeMode: 'add',
    updateExisting: false,
    skipDuplicates: true,
  })
  const [importResult, setImportResult] = useState(null)

  // Query para obtener preview de datos OSM
  const { data: previewData, isLoading: isLoadingPreview, refetch: refetchPreview } = useQuery({
    queryKey: ['osm-preview'],
    queryFn: async () => {
      const res = await api.get('/import/osm/preview')
      return res.data
    },
    enabled: false, // Solo cargar cuando se solicite
  })

  // Mutation para importar datos OSM
  const importMutation = useMutation({
    mutationFn: async (options) => {
      const res = await api.post('/import/osm', options)
      return res.data
    },
    onSuccess: (data) => {
      setImportResult(data)
      console.log('Import successful:', data)
    },
    onError: (error) => {
      console.error('Import error:', error)
      setImportResult({
        success: false,
        message: error.response?.data?.message || 'Error al importar datos',
      })
    },
  })

  const handlePreview = async () => {
    await refetchPreview()
    setPreviewOpen(true)
  }

  const handleImport = () => {
    importMutation.mutate(importOptions)
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <MapIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Importar Mapa OSM
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Importa edificios y puntos de interés desde OpenStreetMap
          </Typography>
        </Box>
      </Box>

      {/* Import Options Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            Opciones de Importación
          </Typography>

          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend">Modo de fusión</FormLabel>
            <RadioGroup
              value={importOptions.mergeMode}
              onChange={(e) =>
                setImportOptions({ ...importOptions, mergeMode: e.target.value })
              }
            >
              <FormControlLabel
                value="add"
                control={<Radio />}
                label="Agregar - Solo añadir edificios nuevos (recomendado)"
              />
              <FormControlLabel
                value="merge"
                control={<Radio />}
                label="Fusionar - Agregar y actualizar edificios existentes"
              />
              <FormControlLabel
                value="replace"
                control={<Radio />}
                label="Reemplazar - Eliminar todos los edificios actuales e importar nuevos ⚠️"
              />
            </RadioGroup>
          </FormControl>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={importOptions.updateExisting}
                  onChange={(e) =>
                    setImportOptions({
                      ...importOptions,
                      updateExisting: e.target.checked,
                    })
                  }
                />
              }
              label="Actualizar edificios existentes con datos de OSM"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={importOptions.skipDuplicates}
                  onChange={(e) =>
                    setImportOptions({
                      ...importOptions,
                      skipDuplicates: e.target.checked,
                    })
                  }
                />
              }
              label="Saltar duplicados (si ya existe un edificio con el mismo nombre)"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={isLoadingPreview ? <CircularProgress size={20} /> : <PreviewIcon />}
          onClick={handlePreview}
          disabled={isLoadingPreview}
        >
          Vista Previa
        </Button>
        <Button
          variant="contained"
          startIcon={importMutation.isPending ? <CircularProgress size={20} /> : <UploadIcon />}
          onClick={handleImport}
          disabled={importMutation.isPending}
        >
          Importar Datos
        </Button>
      </Box>

      {/* Import Result */}
      {importResult && (
        <Alert
          severity={importResult.success ? 'success' : 'error'}
          icon={importResult.success ? <SuccessIcon /> : <ErrorIcon />}
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            {importResult.message}
          </Typography>
          {importResult.stats && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2">
                Edificios originales: {importResult.stats.originalCount}
              </Typography>
              <Typography variant="body2">
                Añadidos: {importResult.stats.added}
              </Typography>
              <Typography variant="body2">
                Actualizados: {importResult.stats.updated}
              </Typography>
              <Typography variant="body2">
                Omitidos: {importResult.stats.skipped}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                Total final: {importResult.stats.finalCount}
              </Typography>
            </Box>
          )}
        </Alert>
      )}

      {/* Information Card */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            ℹ️ Información
          </Typography>
          <Typography variant="body2" paragraph>
            Esta herramienta importa datos desde el archivo <strong>map.osm</strong> ubicado
            en el servidor. El archivo contiene el mapa del campus exportado desde
            OpenStreetMap.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Datos que se importan:</strong>
          </Typography>
          <ul>
            <li>
              <Typography variant="body2">
                Edificios con sus coordenadas y nombres
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Puntos de interés (cafeterías, farmacias, etc.)
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Coordenadas geográficas precisas (latitud/longitud)
              </Typography>
            </li>
          </ul>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Importante:</strong> El modo "Reemplazar" eliminará todos los
              edificios existentes. Usa esta opción solo si deseas reiniciar
              completamente la base de datos de edificios.
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Vista Previa de Datos OSM
        </DialogTitle>
        <DialogContent>
          {previewData && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Estadísticas
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip
                    label={`${previewData.stats.buildingsCount} Edificios`}
                    color="primary"
                  />
                  <Chip
                    label={`${previewData.stats.poisCount} Puntos de Interés`}
                    color="secondary"
                  />
                  <Chip
                    label={`${previewData.stats.totalNodes} Nodos`}
                    variant="outlined"
                  />
                  <Chip
                    label={`${previewData.stats.totalWays} Vías`}
                    variant="outlined"
                  />
                </Box>
              </Box>

              <Typography variant="h6" gutterBottom>
                Edificios a Importar
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Latitud</TableCell>
                      <TableCell>Longitud</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData.buildings.map((building, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{building.nombre_edificio}</TableCell>
                        <TableCell>
                          <Chip label={building.tipo} size="small" />
                        </TableCell>
                        <TableCell>{building.cord_latitud.toFixed(6)}</TableCell>
                        <TableCell>{building.cord_longitud.toFixed(6)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Cerrar</Button>
          <Button
            variant="contained"
            onClick={() => {
              setPreviewOpen(false)
              handleImport()
            }}
          >
            Importar Ahora
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
