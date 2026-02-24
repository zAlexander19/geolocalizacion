import { useState } from 'react'
import { Button, Dialog, DialogTitle, DialogContent, Box, IconButton } from '@mui/material'
import { QrCode as QrCodeIcon, Close as CloseIcon, Download as DownloadIcon } from '@mui/icons-material'
import QRCode from 'qrcode'
import { generateShareUrl } from '../utils/shareLocation'

export default function QRCodeButton({
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
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrImageUrl, setQrImageUrl] = useState('')

  const handleGenerateQR = async () => {
    try {
      const url = generateShareUrl({
        latitude,
        longitude,
        type,
        id,
        name
      })
      
      const qrDataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 1,
        width: 300
      })
      
      setQrImageUrl(qrDataUrl)
      setQrDialogOpen(true)
    } catch (error) {
      console.error('Error al generar QR:', error)
    }
  }

  const handleDownloadQR = () => {
    if (qrImageUrl) {
      const link = document.createElement('a')
      link.href = qrImageUrl
      link.download = `qr-${name || 'ubicacion'}.png`
      link.click()
    }
  }

  return (
    <>
      <Button
        startIcon={<QrCodeIcon />}
        onClick={handleGenerateQR}
        disabled={!latitude || !longitude}
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        sx={{
          textTransform: 'none',
          backgroundColor: '#FF9800',
          color: 'white',
          fontWeight: 'bold',
          '&:hover': {
            backgroundColor: '#F57C00',
          },
          '&:disabled': {
            backgroundColor: '#cccccc',
          },
          ...sx
        }}
      >
        QR
      </Button>

      <Dialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        maxWidth="xs"
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
          Código QR - {name}
          <IconButton
            onClick={() => setQrDialogOpen(false)}
            size="small"
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {qrImageUrl && (
            <Box
              sx={{
                p: 2,
                backgroundColor: 'white',
                borderRadius: 2,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <img src={qrImageUrl} alt="QR Code" style={{ maxWidth: '100%', height: 'auto' }} />
            </Box>
          )}

          <Box sx={{ textAlign: 'center', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)' }}>
            <p>Escanea este código QR para compartir y acceder a la ubicación</p>
            {name && <p style={{ fontWeight: 600, marginTop: '0.5rem' }}><strong>{name}</strong></p>}
          </Box>

          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadQR}
            fullWidth
            sx={{
              mt: 2,
              backgroundColor: '#4CAF50',
              '&:hover': {
                backgroundColor: '#45a049',
              }
            }}
          >
            Descargar QR
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
