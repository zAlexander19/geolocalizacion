import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  FormControl,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  Search as SearchIcon,
  Business as BuildingIcon,
  MeetingRoom as RoomIcon,
  School as SchoolIcon,
  Wc as BathroomIcon,
} from '@mui/icons-material'

const searchTypes = [
  { value: 'todo', label: 'Todo', icon: <SearchIcon /> },
  { value: 'edificio', label: 'Edificio', icon: <BuildingIcon /> },
  { value: 'sala', label: 'Sala', icon: <RoomIcon /> },
  { value: 'facultad', label: 'Facultad', icon: <SchoolIcon /> },
  { value: 'bano', label: 'Baño', icon: <BathroomIcon /> },
]

export default function SearchBar({ onSearch, initialType = 'todo' }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [searchType, setSearchType] = useState(initialType)
  const [searchQuery, setSearchQuery] = useState('')

  // Efecto para actualizar resultados en tiempo real mientras se escribe
  useEffect(() => {
    // Crear un debounce para evitar demasiadas búsquedas
    const timeoutId = setTimeout(() => {
      onSearch({ type: searchType, query: searchQuery.trim() })
    }, 300) // Esperar 300ms después de que el usuario deje de escribir

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchType, onSearch])

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch({ type: searchType, query: searchQuery.trim() })
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleTypeChange = (newType) => {
    setSearchType(newType)
    // Notificar el cambio de tipo con la query actual
    onSearch({ type: newType, query: searchQuery.trim() })
  }

  return (
    <Paper elevation={3} sx={{ p: isMobile ? 1 : 1.5, borderRadius: isMobile ? 2 : 3 }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column-reverse' : 'row',
        gap: isMobile ? 1.5 : 1, 
        alignItems: 'stretch',
      }}>
        {/* Input de búsqueda */}
        <TextField
          fullWidth
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isMobile 
            ? 'Buscar...' 
            : (searchType === 'todo' ? 'Buscar edificio, sala, facultad o baño...' : `Buscar ${searchTypes.find(t => t.value === searchType)?.label.toLowerCase()}...`)
          }
          size={isMobile ? "small" : "medium"}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" sx={{ fontSize: isMobile ? 20 : 24 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'white',
              '& fieldset': {
                border: 'none',
              },
            },
          }}
        />

        {/* Selector de tipo */}
        <FormControl sx={{ minWidth: isMobile ? '100%' : 160 }}>
          <Select
            value={searchType}
            onChange={(e) => handleTypeChange(e.target.value)}
            size={isMobile ? "small" : "medium"}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              borderRadius: isMobile ? 1.5 : 2,
              fontSize: isMobile ? '0.875rem' : '1rem',
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '& .MuiSvgIcon-root': {
                color: 'white',
                fontSize: isMobile ? 20 : 24,
              },
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
          >
            {searchTypes.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {type.icon}
                  {type.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Paper>
  )
}
