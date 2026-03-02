import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  TableChart as TableIcon,
  Layers as LayersIcon,
  MeetingRoom as RoomIcon,
  Wc as BathroomIcon,
} from '@mui/icons-material'
import api from '../../../lib/api'

// ─── Definición de campos por tipo ────────────────────────────────────────────

const SCHEMAS = {
  pisos: {
    label: 'Pisos',
    icon: <LayersIcon />,
    endpoint: (row) => `/buildings/${row.id_edificio}/floors`,
    columns: [
      { key: 'id_edificio',   label: 'id_edificio',   required: true,  type: 'number', hint: 'ID del edificio (ver lista abajo)' },
      { key: 'nombre_piso',   label: 'nombre_piso',   required: true,  type: 'text',   hint: 'Ej: Piso 1, Planta Baja' },
      { key: 'numero_piso',   label: 'numero_piso',   required: false, type: 'number', hint: 'Número entero. Ej: 1, 2, -1' },
      { key: 'disponibilidad',label: 'disponibilidad',required: false, type: 'text',   hint: 'Disponible / No Disponible' },
    ],
    example: { id_edificio: 1, nombre_piso: 'Piso 1', numero_piso: 1, disponibilidad: 'Disponible' },
  },
  salas: {
    label: 'Salas',
    icon: <RoomIcon />,
    endpoint: () => '/rooms',
    columns: [
      { key: 'id_edificio',   label: 'id_edificio',   required: true,  type: 'number', hint: 'ID del edificio' },
      { key: 'id_piso',       label: 'id_piso',       required: true,  type: 'number', hint: 'ID del piso donde se ubica la sala' },
      { key: 'nombre_sala',   label: 'nombre_sala',   required: true,  type: 'text',   hint: 'Ej: Sala A-101' },
      { key: 'acronimo',      label: 'acronimo',      required: false, type: 'text',   hint: 'Ej: A-101' },
      { key: 'descripcion',   label: 'descripcion',   required: false, type: 'text',   hint: 'Descripción breve' },
      { key: 'capacidad',     label: 'capacidad',     required: false, type: 'number', hint: 'Número de personas. Ej: 30' },
      { key: 'tipo_sala',     label: 'tipo_sala',     required: false, type: 'text',   hint: 'Ej: Laboratorio, Aula, Oficina' },
      { key: 'cord_latitud',  label: 'cord_latitud',  required: false, type: 'number', hint: 'Ej: -20.2134' },
      { key: 'cord_longitud', label: 'cord_longitud', required: false, type: 'number', hint: 'Ej: -70.1521' },
      { key: 'disponibilidad',label: 'disponibilidad',required: false, type: 'text',   hint: 'Disponible / No Disponible' },
    ],
    example: { id_edificio: 1, id_piso: 1, nombre_sala: 'Sala A-101', acronimo: 'A-101', descripcion: 'Laboratorio de cómputo', capacidad: 30, tipo_sala: 'Laboratorio', cord_latitud: -20.2134, cord_longitud: -70.1521, disponibilidad: 'Disponible' },
  },
  banos: {
    label: 'Baños',
    icon: <BathroomIcon />,
    endpoint: () => '/bathrooms',
    columns: [
      { key: 'id_edificio',        label: 'id_edificio',        required: true,  type: 'number', hint: 'ID del edificio' },
      { key: 'id_piso',            label: 'id_piso',            required: true,  type: 'number', hint: 'ID del piso' },
      { key: 'identificador',      label: 'identificador',      required: true,  type: 'text',   hint: 'Código único. Ej: B1-P1' },
      { key: 'nombre',             label: 'nombre',             required: false, type: 'text',   hint: 'Ej: Baño Hombres Piso 1' },
      { key: 'descripcion',        label: 'descripcion',        required: false, type: 'text',   hint: 'Descripción breve' },
      { key: 'capacidad',          label: 'capacidad',          required: false, type: 'number', hint: 'Número de personas. Ej: 5' },
      { key: 'tipo',               label: 'tipo',               required: false, type: 'text',   hint: 'h / m / mixto' },
      { key: 'acceso_discapacidad',label: 'acceso_discapacidad',required: false, type: 'text',   hint: 'sí / no' },
      { key: 'cord_latitud',       label: 'cord_latitud',       required: false, type: 'number', hint: 'Ej: -20.2134' },
      { key: 'cord_longitud',      label: 'cord_longitud',      required: false, type: 'number', hint: 'Ej: -70.1521' },
      { key: 'disponibilidad',     label: 'disponibilidad',     required: false, type: 'text',   hint: 'Disponible / No Disponible' },
    ],
    example: { id_edificio: 1, id_piso: 1, identificador: 'B1-P1', nombre: 'Baño Hombres Piso 1', descripcion: '', capacidad: 5, tipo: 'h', acceso_discapacidad: 'no', cord_latitud: -20.2134, cord_longitud: -70.1521, disponibilidad: 'Disponible' },
  },
}

const STEPS = ['Seleccionar tipo', 'Descargar plantilla', 'Subir archivo', 'Revisar y confirmar']

// ─── Componente principal ─────────────────────────────────────────────────────

export default function BulkUploadPage() {
  const [tab, setTab] = useState('pisos')
  const [step, setStep] = useState(0)
  const [rows, setRows] = useState([])
  const [rowResults, setRowResults] = useState([]) // {status:'pending'|'ok'|'error', message}
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [fileError, setFileError] = useState(null)
  const fileInputRef = useRef()

  const schema = SCHEMAS[tab]

  // Cargar edificios y pisos para mostrar referencias
  const { data: buildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => (await api.get('/buildings')).data.data,
  })

  const { data: allFloors } = useQuery({
    queryKey: ['all-floors-bulk'],
    queryFn: async () => {
      if (!buildings) return []
      const res = await Promise.all(buildings.map(b => api.get(`/buildings/${b.id_edificio}/floors`)))
      return res.flatMap(r => r.data.data)
    },
    enabled: !!buildings,
  })

  // ── Cambio de tab ──────────────────────────────────────────────────────────
  const handleTabChange = (_, newVal) => {
    setTab(newVal)
    resetUpload()
  }

  const resetUpload = () => {
    setRows([])
    setRowResults([])
    setDone(false)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Descargar plantilla ───────────────────────────────────────────────────
  const downloadTemplate = () => {
    const sch = SCHEMAS[tab]
    const wsData = [
      // Fila 1: labels de columna
      sch.columns.map(c => c.label),
      // Fila 2: hints (comentarios de ayuda)
      sch.columns.map(c => `[${c.required ? 'OBLIGATORIO' : 'opcional'}] ${c.hint}`),
      // Fila 3: ejemplo
      sch.columns.map(c => sch.example[c.key] ?? ''),
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Ancho de columnas automático
    ws['!cols'] = sch.columns.map(c => ({ wch: Math.max(c.label.length + 4, c.hint.length + 2) }))

    // Estilo de la fila de cabecera (fondo, negrita) — sólo disponible con xlsx-style, aquí usamos comentarios
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sch.label)

    XLSX.writeFile(wb, `plantilla_${tab}.xlsx`)
  }

  // ── Parsear archivo Excel ─────────────────────────────────────────────────
  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileError(null)
    setRows([])
    setRowResults([])
    setDone(false)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        // Buscar la fila de cabeceras (primera fila que tenga un campo requerido)
        const sch = SCHEMAS[tab]
        const requiredKeys = sch.columns.filter(c => c.required).map(c => c.label)
        const headerRowIdx = raw.findIndex(row =>
          requiredKeys.every(k => row.map(v => String(v).trim()).includes(k))
        )

        if (headerRowIdx === -1) {
          setFileError('No se encontraron las columnas requeridas. Usa la plantilla descargada.')
          return
        }

        const headers = raw[headerRowIdx].map(v => String(v).trim())
        const dataRows = raw.slice(headerRowIdx + 1).filter(row =>
          // filtrar filas de hint o completamente vacías
          row.some(v => v !== '') &&
          !String(row[0]).startsWith('[')
        )

        const parsed = dataRows.map(row => {
          const obj = {}
          headers.forEach((h, i) => { obj[h] = row[i] ?? '' })
          return obj
        })

        if (parsed.length === 0) {
          setFileError('El archivo no tiene filas de datos.')
          return
        }

        setRows(parsed)
        setRowResults(parsed.map(() => ({ status: 'pending', message: '' })))
        setStep(3)
      } catch {
        setFileError('Error al leer el archivo. Asegúrate de que sea un .xlsx válido.')
      }
    }
    reader.readAsBinaryString(file)
  }

  // ── Validar una fila ──────────────────────────────────────────────────────
  const validateRow = (row) => {
    const sch = SCHEMAS[tab]
    for (const col of sch.columns.filter(c => c.required)) {
      if (!row[col.label] && row[col.label] !== 0) {
        return `Campo obligatorio vacío: ${col.label}`
      }
    }
    return null
  }

  // ── Subir todas las filas ─────────────────────────────────────────────────
  const handleUpload = async () => {
    setUploading(true)
    setDone(false)
    const sch = SCHEMAS[tab]
    const results = [...rowResults]

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      // Validación local
      const validationError = validateRow(row)
      if (validationError) {
        results[i] = { status: 'error', message: validationError }
        setRowResults([...results])
        continue
      }

      // Construir payload con los nombres de campo reales (key del schema)
      const payload = { estado: 'true' } // siempre activo por defecto
      sch.columns.forEach(col => {
        const val = row[col.label]
        if (val !== '' && val !== undefined) {
          payload[col.key] = col.type === 'number' ? Number(val) : String(val)
        }
      })

      // Enviar como FormData (compatible con el middleware multer del backend)
      const formData = new FormData()
      Object.entries(payload).forEach(([k, v]) => formData.append(k, v))

      try {
        const endpoint = sch.endpoint(payload)
        await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        results[i] = { status: 'ok', message: 'Creado correctamente' }
      } catch (err) {
        const msg = err?.response?.data?.message || err.message || 'Error desconocido'
        results[i] = { status: 'error', message: msg }
      }

      setRowResults([...results])
    }

    setUploading(false)
    setDone(true)
  }

  // ── Helpers de UI ─────────────────────────────────────────────────────────
  const successCount = rowResults.filter(r => r.status === 'ok').length
  const errorCount = rowResults.filter(r => r.status === 'error').length
  const pendingCount = rowResults.filter(r => r.status === 'pending').length

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TableIcon fontSize="large" /> Carga Masiva
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5, color: 'rgba(255,255,255,0.6)' }}>
          Descarga la plantilla Excel, complétala y súbela para crear múltiples registros de una sola vez.
        </Typography>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={step} sx={{ mb: 4, display: { xs: 'none', md: 'flex' } }}>
        {STEPS.map(label => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={handleTabChange}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {Object.entries(SCHEMAS).map(([key, s]) => (
          <Tab
            key={key}
            value={key}
            label={s.label}
            icon={s.icon}
            iconPosition="start"
          />
        ))}
      </Tabs>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>

        {/* Panel izquierdo: instrucciones + acciones */}
        <Box sx={{ flex: '0 0 340px', minWidth: 0 }}>

          {/* Paso 1: Descargar plantilla */}
          <Paper sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              1 — Descarga la plantilla
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.6)' }}>
              Contiene las columnas necesarias y una fila de ejemplo para guiarte.
            </Typography>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => { downloadTemplate(); if (step < 1) setStep(1) }}
              fullWidth
            >
              Descargar plantilla_{tab}.xlsx
            </Button>
          </Paper>

          {/* Paso 2: Subir archivo */}
          <Paper sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              2 — Sube el archivo completado
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.6)' }}>
              Acepta archivos <strong>.xlsx</strong>. Elimina las filas de ayuda (fila en gris) y deja solo los datos reales.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              component="label"
              fullWidth
            >
              Seleccionar archivo .xlsx
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                hidden
                onChange={(e) => { handleFile(e); setStep(2) }}
              />
            </Button>
            {fileError && (
              <Alert severity="error" sx={{ mt: 1.5 }}>{fileError}</Alert>
            )}
          </Paper>

          {/* Columnas requeridas */}
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Columnas de la plantilla
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: 'white' }}>Campo</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'white' }}>Descripción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {SCHEMAS[tab].columns.map(col => (
                  <TableRow key={col.key}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <code style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>{col.label}</code>
                        {col.required && <Chip label="requerido" size="small" color="error" sx={{ height: 16, fontSize: 10 }} />}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{col.hint}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>

        {/* Panel derecho: tabla de previsualización */}
        <Box sx={{ flex: 1, minWidth: 0 }}>

          {/* Referencia de IDs */}
          {(tab === 'pisos' || tab === 'banos' || tab === 'salas') && buildings && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Edificios disponibles (usa su id_edificio en la plantilla)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {buildings.map(b => (
                  <Chip 
                    key={b.id_edificio} 
                    label={`${b.id_edificio} — ${b.nombre_edificio}`} 
                    size="small" 
                    variant="outlined" 
                    sx={{ 
                      color: 'rgba(255,255,255,0.9)', 
                      borderColor: 'rgba(255,255,255,0.3)',
                      bgcolor: 'rgba(255,255,255,0.05)'
                    }} 
                  />
                ))}
              </Box>
            </Paper>
          )}

          {(tab === 'salas' || tab === 'banos') && allFloors && allFloors.length > 0 && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Pisos disponibles (usa su id_piso en la plantilla)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 120, overflowY: 'auto' }}>
                {allFloors.map(f => {
                  const b = buildings?.find(b => b.id_edificio === f.id_edificio)
                  const bName = b ? b.nombre_edificio : `Edificio ${f.id_edificio}`
                  return (
                    <Chip 
                      key={f.id_piso} 
                      label={`${f.id_piso} — ${f.nombre_piso} (${bName})`} 
                      size="small" 
                      variant="outlined" 
                      sx={{ 
                        color: 'rgba(255,255,255,0.9)', 
                        borderColor: 'rgba(255,255,255,0.3)',
                        bgcolor: 'rgba(255,255,255,0.05)'
                      }} 
                    />
                  )
                })}
              </Box>
            </Paper>
          )}

          {/* Sin datos aún */}
          {rows.length === 0 && !fileError && (
            <Paper sx={{ p: 4, textAlign: 'center', border: '2px dashed', borderColor: 'divider' }}>
              <UploadIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>
                Descarga la plantilla, complétala y súbela para ver la previsualización aquí.
              </Typography>
            </Paper>
          )}

          {/* Tabla de previsualización + resultados */}
          {rows.length > 0 && (
            <>
              {/* Resumen */}
              {done && (
                <Alert
                  severity={errorCount === 0 ? 'success' : successCount === 0 ? 'error' : 'warning'}
                  sx={{ mb: 2 }}
                >
                  Proceso terminado — <strong>{successCount} creados</strong>, <strong>{errorCount} errores</strong>.
                </Alert>
              )}

              {!done && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    {rows.length} fila(s) detectadas.
                  </Typography>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
                    onClick={handleUpload}
                    disabled={uploading}
                  >
                    {uploading ? `Subiendo... ${successCount + errorCount}/${rows.length}` : `Crear ${rows.length} registro(s)`}
                  </Button>
                </Box>
              )}

              {uploading && (
                <LinearProgress
                  variant="determinate"
                  value={((successCount + errorCount) / rows.length) * 100}
                  sx={{ mb: 2 }}
                />
              )}

              {done && (
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button variant="outlined" onClick={resetUpload}>
                    Nueva carga
                  </Button>
                </Box>
              )}

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700, color: 'white' }}>#</TableCell>
                      {SCHEMAS[tab].columns.map(col => (
                        <TableCell key={col.key} sx={{ fontWeight: 700, whiteSpace: 'nowrap', color: 'white' }}>
                          {col.label}
                          {col.required && <span style={{ color: '#f87171' }}> *</span>}
                        </TableCell>
                      ))}
                      <TableCell sx={{ fontWeight: 700, color: 'white' }}>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, idx) => {
                      const result = rowResults[idx]
                      const rowBg =
                        result?.status === 'ok' ? 'rgba(46,125,50,0.08)' :
                        result?.status === 'error' ? 'rgba(211,47,47,0.08)' :
                        'inherit'
                      return (
                        <TableRow key={idx} sx={{ bgcolor: rowBg }}>
                          <TableCell sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{idx + 1}</TableCell>
                          {SCHEMAS[tab].columns.map(col => (
                            <TableCell key={col.key} sx={{ fontSize: 12, whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.85)' }}>
                              {String(row[col.label] ?? '')}
                            </TableCell>
                          ))}
                          <TableCell>
                            {result?.status === 'pending' && (
                              <Chip label="pendiente" size="small" />
                            )}
                            {result?.status === 'ok' && (
                              <Tooltip title="Creado correctamente">
                                <CheckIcon color="success" fontSize="small" />
                              </Tooltip>
                            )}
                            {result?.status === 'error' && (
                              <Tooltip title={result.message}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <ErrorIcon color="error" fontSize="small" />
                                  <Typography variant="caption" color="error" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {result.message}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      </Box>
    </Box>
  )
}
