import { useState, useEffect } from 'react'
import {
  Box,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  TextField,
  useMediaQuery,
  useTheme,
  Backdrop,
  ClickAwayListener,
  Fade,
  Divider,
  FormControl
} from '@mui/material'
import {
  Search as SearchIcon,
  Business as BuildingIcon,
  MeetingRoom as RoomIcon,
  Wc as BathroomIcon,
  KeyboardArrowDown as ArrowDownIcon
} from '@mui/icons-material'

const searchTypes = [
  { value: 'todo', label: 'Todo', icon: <SearchIcon /> },
  { value: 'edificio', label: 'Edificio', icon: <BuildingIcon /> },
  { value: 'sala', label: 'Sala', icon: <RoomIcon /> },
  { value: 'bano', label: 'Baño', icon: <BathroomIcon /> },
]

export default function SearchBar({ onSearch, initialType = 'todo' }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [searchType, setSearchType] = useState(initialType)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  // Efecto para actualizar resultados en tiempo real mientras se escribe
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearch({ type: searchType, query: searchQuery.trim() })
    }, 300)

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
    onSearch({ type: newType, query: searchQuery.trim() })
  }

  return (
    <>
      
      <ClickAwayListener onClickAway={() => setIsFocused(false)}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5, // Increased padding
            borderRadius: 50,
            position: 'relative',
            zIndex: isFocused ? (theme) => theme.zIndex.drawer + 2 : (theme) => theme.zIndex.appBar - 1,
            background: isFocused 
              ? 'rgba(12, 36, 68, 0.95)'
              : 'rgba(12, 36, 68, 0.6)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${isFocused ? 'rgba(66, 165, 245, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
            boxShadow: isFocused 
              ? '0 0 0 4px rgba(33, 150, 243, 0.15), 0 12px 40px rgba(0, 0, 0, 0.5)' 
              : '0 8px 32px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: isFocused ? 'scale(1.02)' : 'none',
            display: 'flex',
            alignItems: 'center',
            maxWidth: isFocused ? 960 : 920, // Increased max width
            width: '100%',
            mx: 'auto'
          }}
        >
          {/* Icono de búsqueda con animación */}
          <Box sx={{ 
            pl: 2.5, // Increased padding
            display: 'flex', 
            alignItems: 'center',
            color: isFocused ? '#42a5f5' : 'rgba(255,255,255,0.5)',
            transition: 'color 0.3s'
          }}>
             <SearchIcon 
               sx={{ 
                 fontSize: 32, // Increased icon size
                 filter: isFocused ? 'drop-shadow(0 0 8px rgba(66, 165, 245, 0.6))' : 'none',
                 transition: 'all 0.3s' 
               }} 
             />
          </Box>

          {/* Input Field Simplificado */}
          <TextField
            fullWidth
            value={searchQuery}
            onFocus={() => setIsFocused(true)}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isMobile ? 'Buscar...' : 'Buscar edificios, salas y baños'}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: { 
                fontSize: isMobile ? '1.1rem' : '1.3rem', // Increased font size
                color: 'white',
                height: 56, // Increased height
                px: 2,
                '& .MuiInputBase-input': {
                  backgroundColor: 'transparent !important',
                  border: 'none !important',
                  outline: 'none !important',
                  boxShadow: 'none !important',
                },
                '& ::placeholder': {
                  color: 'rgba(255,255,255,0.4)',
                  opacity: 1
                }
              }
            }}
            sx={{ 
              flexGrow: 1,
              backgroundColor: 'transparent !important',
              borderRadius: '24px'
            }}
          />

          {/* Separador Vertical */}
          {!isMobile && (
            <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.1)', my: 1.5, mx: 1.5 }} />
          )}

          {/* Selector de Tipo Estilizado */}
          <FormControl sx={{ minWidth: isMobile ? 70 : 200 }}> 
            <Select
              value={searchType}
              onChange={(e) => handleTypeChange(e.target.value)}
              displayEmpty
              variant="standard"
              disableUnderline
              IconComponent={(props) => (
                <ArrowDownIcon {...props} style={{ color: 'white', marginRight: 12 }} />
              )}
              sx={{
                color: 'white',
                bgcolor: isFocused ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderRadius: 40,
                height: 56, // Increased height
                fontSize: isMobile ? '1rem' : '1.1rem', // Specific font size
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.1)',
                },
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  paddingRight: '40px !important',
                  paddingLeft: 2.5,
                  py: 1
                }
              }}
              renderValue={(selected) => {
                const selectedType = searchTypes.find(t => t.value === selected)
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {selectedType?.icon}
                    {!isMobile && (
                      <Box component="span">{selectedType?.label}</Box>
                    )}
                  </Box>
                )
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    bgcolor: '#0f172a',
                    backgroundImage: 'linear-gradient(to bottom, #0f172a, #1e293b)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    mt: 1,
                    borderRadius: 3,
                    '& .MuiMenuItem-root': {
                      color: 'rgba(255,255,255,0.9)',
                      gap: 1.5,
                      py: 1.5,
                      px: 2,
                      fontSize: '0.95rem',
                      '&:hover': {
                         bgcolor: 'rgba(66, 165, 245, 0.15)',
                         color: '#42a5f5'
                      },
                      '&.Mui-selected': {
                         bgcolor: 'rgba(66, 165, 245, 0.25) !important',
                         color: '#42a5f5',
                         fontWeight: 'bold'
                      }
                    }
                  }
                }
              }}
            >
              {searchTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: searchType === type.value ? '#42a5f5' : 'inherit'
                  }}>
                    {type.icon}
                  </Box>
                  <Box component="span">
                    {type.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>
      </ClickAwayListener>
      
      {/* Texto de Ayuda Animado (Fade In cuando hay foco) */}
      <Fade in={isFocused}>
        <Box sx={{ 
          position: 'absolute', 
          mt: 2, 
          left: 0, 
          right: 0, 
          textAlign: 'center', 
          zIndex: (theme) => theme.zIndex.drawer + 2 
        }}>
        </Box>
      </Fade>
    </>
  )
}
