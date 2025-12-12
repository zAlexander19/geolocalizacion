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
    importType: 'buildings', // 'buildings' | 'routes' | 'both'
  })
  const [importResult, setImportResult] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)

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
    mutationFn: async ({ file, options }) => {
      // Si es upload de archivo, usar FormData
      if (file) {
        const formData = new FormData()
        formData.append('osmFile', file)
        formData.append('options', JSON.stringify(options))
        
        const res = await api.post('/import/osm', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        return res.data
      } else {
        // Si no hay archivo, enviar opciones como JSON
        const res = await api.post('/import/osm', options)
        return res.data
      }
    },
    onSuccess: (data) => {
      setImportResult(data)
      setSelectedFile(null)
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

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.name.endsWith('.osm') || file.type === 'application/xml' || file.type === 'text/xml') {
        setSelectedFile(file)
        setImportResult(null)
      } else {
        alert('Por favor selecciona un archivo .osm válido')
        event.target.value = ''
      }
    }
  }

  const handlePreview = async () => {
    await refetchPreview()
    setPreviewOpen(true)
  }

  const handleImport = () => {
    importMutation.mutate({ file: selectedFile, options: importOptions })
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

      {/* File Upload Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            Seleccionar Archivo OSM
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              sx={{ alignSelf: 'flex-start' }}
            >
              Seleccionar archivo .osm
              <input
                type="file"
                hidden
                accept=".osm,application/xml,text/xml"
                onChange={handleFileChange}
              />
            </Button>
            
            {selectedFile && (
              <Alert severity="info" icon={<SuccessIcon />}>
                <Typography variant="body2">
                  <strong>Archivo seleccionado:</strong> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </Typography>
              </Alert>
            )}
            
            <Typography variant="body2" color="text.secondary">
              Selecciona un archivo .osm exportado desde OpenStreetMap o utiliza el archivo predeterminado del servidor.
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Import Options Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            Opciones de Importación
          </Typography>

          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <FormLabel component="legend">Tipo de importación</FormLabel>
            <RadioGroup
              value={importOptions.importType}
              onChange={(e) =>
                setImportOptions({ ...importOptions, importType: e.target.value })
              }
            >
              <FormControlLabel
                value="buildings"
                control={<Radio />}
                label="Solo edificios - Importar únicamente edificios y estructuras"
              />
              <FormControlLabel
                value="routes"
                control={<Radio />}
                label="Solo rutas - Importar únicamente caminos, senderos y rutas"
              />
              <FormControlLabel
                value="both"
                control={<Radio />}
                label="Ambos - Importar edificios y rutas"
              />
            </RadioGroup>
          </FormControl>

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
                label="Agregar - Solo añadir elementos nuevos (recomendado)"
              />
              <FormControlLabel
                value="merge"
                control={<Radio />}
                label="Fusionar - Agregar y actualizar elementos existentes"
              />
              <FormControlLabel
                value="replace"
                control={<Radio />}
                label="Reemplazar - Eliminar todos los elementos actuales e importar nuevos ⚠️"
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
              label="Actualizar elementos existentes con datos de OSM"
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
              label="Saltar duplicados (si ya existe un elemento con el mismo identificador)"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          startIcon={importMutation.isPending ? <CircularProgress size={20} /> : <UploadIcon />}
          onClick={handleImport}
          disabled={importMutation.isPending}
        >
          {selectedFile ? 'Importar Archivo Seleccionado' : 'Importar desde Servidor'}
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
              {(importOptions.importType === 'buildings' || importOptions.importType === 'both') && (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
                    Edificios:
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    Originales: {importResult.stats.originalCount}
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    Añadidos: {importResult.stats.added}
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    Actualizados: {importResult.stats.updated}
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    Omitidos: {importResult.stats.skipped}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', ml: 2 }}>
                    Total final: {importResult.stats.finalCount}
                  </Typography>
                </>
              )}
              {(importOptions.importType === 'routes' || importOptions.importType === 'both') && (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
                    Rutas:
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    Añadidas: {importResult.stats.routesAdded || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    Actualizadas: {importResult.stats.routesUpdated || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    Omitidas: {importResult.stats.routesSkipped || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', ml: 2 }}>
                    Total final: {importResult.stats.routesFinalCount || 0}
                  </Typography>
                </>
              )}
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
            Esta herramienta importa datos desde un archivo .osm que puedes subir o desde el 
            archivo <strong>map.osm</strong> predeterminado ubicado en el servidor. 
            Los archivos OSM contienen mapas exportados desde OpenStreetMap.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Datos que se pueden importar:</strong>
          </Typography>
          <ul>
            <li>
              <Typography variant="body2">
                <strong>Edificios:</strong> Estructuras con sus coordenadas, nombres y tipos
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Rutas:</strong> Caminos, senderos, pasillos y vías peatonales con sus trazados
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Puntos de interés:</strong> Cafeterías, farmacias, servicios, etc.
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Coordenadas:</strong> Latitudes y longitudes precisas para navegación
              </Typography>
            </li>
          </ul>
          <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body2">
              <strong>💡 Sugerencia:</strong> Si solo necesitas actualizar las rutas de navegación 
              sin modificar los edificios existentes, selecciona "Solo rutas" en el tipo de importación.
            </Typography>
          </Alert>
          <Alert severity="warning">
            <Typography variant="body2">
              <strong>⚠️ Importante:</strong> El modo "Reemplazar" eliminará todos los
              elementos existentes del tipo seleccionado. Usa esta opción solo si deseas 
              reiniciar completamente los datos.
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
