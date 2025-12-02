import { useState } from 'react'
import { Box, Skeleton } from '@mui/material'
import { getFullImageUrl } from '../utils/imageUrl'

export default function OptimizedImage({ 
  src, 
  alt = '', 
  width, 
  height, 
  objectFit = 'cover',
  sx = {},
  ...props 
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const imageUrl = getFullImageUrl(src)

  if (error || !src) {
    return (
      <Box
        sx={{
          width,
          height,
          bgcolor: 'grey.200',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...sx
        }}
      >
        <Box component="span" sx={{ fontSize: 40, color: 'grey.400' }}>
          🏢
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ position: 'relative', width, height, ...sx }}>
      {loading && (
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          animation="wave"
          sx={{ position: 'absolute', top: 0, left: 0 }}
        />
      )}
      <Box
        component="img"
        src={imageUrl}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false)
          setError(true)
        }}
        sx={{
          width: '100%',
          height: '100%',
          objectFit,
          display: loading ? 'none' : 'block',
        }}
        {...props}
      />
    </Box>
  )
}
