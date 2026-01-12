import { useState, useEffect } from 'react'
import { Box, IconButton, Typography, Button } from '@mui/material'
import { ChevronLeft, ChevronRight } from '@mui/icons-material'

const daysOfWeek = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']
const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function DateRangeCalendar({ startDate, endDate, onChange }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  // Al montar, si hay fecha de inicio, mostrar ese mes
  useEffect(() => {
    if (startDate) {
      // Asegurarse de parsear correctamente la fecha local (YYYY-MM-DD)
      const [year, month, day] = startDate.split('-').map(Number)
      setCurrentDate(new Date(year, month - 1, day))
    }
  }, [])

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDateClick = (day) => {
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const clickedDateStr = `${year}-${month}-${dayStr}`
    
    if (!startDate || (startDate && endDate)) {
      // Nueva selección (inicio)
      onChange(clickedDateStr, '')
    } else {
      // Completar selección (fin)
      if (clickedDateStr < startDate) {
        onChange(clickedDateStr, startDate) // Si clic es antes, intercambiar
      } else {
        onChange(startDate, clickedDateStr)
      }
    }
  }

  const isSelected = (day) => {
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const dateStr = `${year}-${month}-${dayStr}`
    return dateStr === startDate || dateStr === endDate
  }

  const isInRange = (day) => {
    if (!startDate || !endDate) return false
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const dateStr = `${year}-${month}-${dayStr}`
    return dateStr > startDate && dateStr < endDate
  }

  return (
    <Box sx={{ width: 320, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={handlePrevMonth} size="small" sx={{ color: 'white' }}><ChevronLeft /></IconButton>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ textTransform: 'capitalize', color: 'white' }}>
          {months[currentDate.getMonth()]} {currentDate.getFullYear()}
        </Typography>
        <IconButton onClick={handleNextMonth} size="small" sx={{ color: 'white' }}><ChevronRight /></IconButton>
      </Box>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 1 }}>
        {daysOfWeek.map(d => (
          <Typography key={d} variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }} fontWeight="bold" align="center">
            {d}
          </Typography>
        ))}
      </Box>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
        {/* Espacios vacíos */}
        {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, i) => (
          <Box key={`empty-${i}`} />
        ))}
        
        {/* Días */}
        {Array.from({ length: getDaysInMonth(currentDate) }).map((_, i) => {
          const day = i + 1
          const selected = isSelected(day)
          const inRange = isInRange(day)
          
          return (
            <Box
              key={day}
              onClick={() => handleDateClick(day)}
              sx={{
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                cursor: 'pointer',
                bgcolor: selected ? 'primary.main' : inRange ? 'rgba(25, 118, 210, 0.3)' : 'transparent',
                color: selected ? 'white' : inRange ? 'white' : 'white',
                fontWeight: selected ? 'bold' : 'normal',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: selected ? 'primary.dark' : 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <Typography variant="body2">{day}</Typography>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
