import { useState } from 'react'
import { Button, Snackbar, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Box, TextField, IconButton, Tooltip } from '@mui/material'
import { Share as ShareIcon, ContentCopy as CopyIcon, Close as CloseIcon } from '@mui/icons-material'
import { generateShareUrl, copyToClipboard } from '../utils/shareLocation'

/**
 * Componente de botón para compartir ubicación
 * @param {Object} props
 * @param {number} props.latitude - Latitud de la ubicación
 * @param {number} props.longitude - Longitud de la ubicación
 * @param {string} [props.type='location'] - Tipo de ubicación
 * @param {number} [props.id] - ID del elemento
 * @param {string} [props.name] - Nombre del elemento
 * @param {string} [props.variant='contained'] - Variante del botón
 * @param {string} [props.size='medium'] - Tamaño del botón
 * @param {boolean} [props.fullWidth=false] - Ancho completo
 * @param {Object} [props.sx] - Estilos adicionales
 */
export default function ShareLocationButton({
  latitude,
  longitude,
  type = 'location',
  id = null,
  name = null,
  variant = 'contained',
  size = 'medium',
  fullWidth = false,
  sx = {}
}) {
  const [copying, setCopying] = useState(false)
  const [showSnackbar, setShowSnackbar] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarSeverity, setSnackbarSeverity] = useState('success')
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  const handleShare = async () => {
    try {
      // Generar URL
      console.log('🔗 ShareLocationButton - Datos:', { latitude, longitude, type, id, name })
      const url = generateShareUrl({
        latitude,
        longitude,
        type,
        id,
        name
      })
      console.log('🔗 ShareLocationButton - URL generada:', url)
      setShareUrl(url)
      setShareDialogOpen(true)
    } catch (error) {
      console.error('Error al generar URL:', error)
      setSnackbarMessage('Error al generar el enlace: ' + error.message)
      setSnackbarSeverity('error')
      setShowSnackbar(true)
    }
  }

  const handleCopyUrl = async () => {
    try {
      setCopying(true)
      const success = await copyToClipboard(shareUrl)

      if (success) {
        setSnackbarMessage('¡Enlace copiado al portapapeles!')
        setSnackbarSeverity('success')
        setShareDialogOpen(false)
      } else {
        throw new Error('No se pudo copiar el enlace')
      }
    } catch (error) {
      console.error('Error al copiar:', error)
      setSnackbarMessage('Error al copiar el enlace: ' + error.message)
      setSnackbarSeverity('error')
    } finally {
      setCopying(false)
      setShowSnackbar(true)
    }
  }

  return (
    <>
      <Button
        startIcon={<ShareIcon />}
        onClick={handleShare}
        disabled={!latitude || !longitude}
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        sx={{
          textTransform: 'none',
          backgroundColor: '#4CAF50',
          color: 'white',
          fontWeight: 'bold',
          '&:hover': {
            backgroundColor: '#45a049',
          },
          '&:disabled': {
            backgroundColor: '#cccccc',
          },
          ...sx
        }}
      >
        Compartir
      </Button>

      {/* Diálogo para mostrar el enlace */}
      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 'bold' }}>
          Compartir Ubicación
          <IconButton
            onClick={() => setShareDialogOpen(false)}
            size="small"
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Box sx={{ mb: 1, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                Enlace para compartir:
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  value={shareUrl}
                  readOnly
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiInputBase-root': {
                      color: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '& .MuiInputBase-input': {
                      fontSize: '0.875rem',
                      wordBreak: 'break-all',
                    },
                  }}
                />
                <Tooltip title="Copiar enlace">
                  <IconButton
                    onClick={handleCopyUrl}
                    disabled={copying}
                    size="small"
                    sx={{
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#45a049',
                      },
                      '&:disabled': {
                        backgroundColor: '#cccccc',
                      }
                    }}
                  >
                    {copying ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <CopyIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2 }}>
          <Button
            onClick={() => setShareDialogOpen(false)}
            variant="outlined"
            sx={{
              color: 'white',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              }
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowSnackbar(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  )
}
