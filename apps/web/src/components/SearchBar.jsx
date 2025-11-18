import { useState } from 'react'
import {
  Box,
  Button,
  FormControl,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  TextField,
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
  const [searchType, setSearchType] = useState(initialType)
  const [searchQuery, setSearchQuery] = useState('')

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
    // Notificar el cambio de tipo incluso sin búsqueda
    onSearch({ type: newType, query: searchQuery.trim() })
  }

  return (
    <Paper elevation={3} sx={{ p: 1.5, borderRadius: 3 }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {/* Input de búsqueda */}
        <TextField
          fullWidth
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={searchType === 'todo' ? 'Buscar edificio, sala, facultad o baño...' : `Buscar ${searchTypes.find(t => t.value === searchType)?.label.toLowerCase()}...`}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
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
        <FormControl sx={{ minWidth: 160 }}>
          <Select
            value={searchType}
            onChange={(e) => handleTypeChange(e.target.value)}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '& .MuiSvgIcon-root': {
                color: 'white',
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

        {/* Botón de búsqueda */}
        <Button
          variant="contained"
          size="large"
          onClick={handleSearch}
          disabled={!searchQuery.trim()}
          sx={{
            px: 4,
            minWidth: 120,
            height: 56,
            borderRadius: 2,
            fontWeight: 'bold',
          }}
        >
          Buscar
        </Button>
      </Box>
    </Paper>
  )
}
