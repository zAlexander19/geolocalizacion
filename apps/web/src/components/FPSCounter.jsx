import { useEffect, useRef, useState } from 'react'
import { Box, Typography } from '@mui/material'

/**
 * Contador de FPS en tiempo real — solo visible en modo desarrollo.
 * Usa requestAnimationFrame para medir cuántos frames se renderizan por segundo.
 */
export default function FPSCounter() {
  const [fps, setFps] = useState(0)
  const [avgFps, setAvgFps] = useState(0)
  const [minFps, setMinFps] = useState(999)
  const frameTimesRef = useRef([])
  const lastTimeRef = useRef(performance.now())
  const rafRef = useRef(null)
  const samplesRef = useRef([])

  useEffect(() => {
    if (!import.meta.env.DEV) return

    const tick = (now) => {
      const delta = now - lastTimeRef.current
      lastTimeRef.current = now

      if (delta > 0) {
        const currentFps = Math.round(1000 / delta)
        
        // Historial de los últimos 60 frames para calcular avg/min
        samplesRef.current.push(currentFps)
        if (samplesRef.current.length > 60) samplesRef.current.shift()

        const avg = Math.round(samplesRef.current.reduce((a, b) => a + b, 0) / samplesRef.current.length)
        const min = Math.min(...samplesRef.current)

        setFps(currentFps)
        setAvgFps(avg)
        setMinFps(min)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // No renderizar en producción
  if (!import.meta.env.DEV) return null

  const color = fps >= 50 ? '#4ade80' : fps >= 30 ? '#facc15' : '#f87171'
  const avgColor = avgFps >= 50 ? '#4ade80' : avgFps >= 30 ? '#facc15' : '#f87171'

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 99999,
        bgcolor: 'rgba(0, 0, 0, 0.85)',
        border: `1px solid ${color}`,
        borderRadius: 1,
        px: 1.5,
        py: 0.75,
        fontFamily: 'monospace',
        userSelect: 'none',
        pointerEvents: 'none',
        minWidth: 110,
      }}
    >
      <Typography variant="caption" sx={{ fontFamily: 'monospace', color, fontWeight: 700, fontSize: '0.85rem', display: 'block' }}>
        {fps} FPS
      </Typography>
      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', display: 'block' }}>
        avg <span style={{ color: avgColor }}>{avgFps}</span>  min <span style={{ color: minFps < 30 ? '#f87171' : 'rgba(255,255,255,0.5)' }}>{minFps === 999 ? '–' : minFps}</span>
      </Typography>
    </Box>
  )
}
