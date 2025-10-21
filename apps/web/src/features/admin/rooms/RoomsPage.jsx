import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Avatar,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material"
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Search as SearchIcon,
  Image as ImageIcon,
} from "@mui/icons-material"
import api from "../../../lib/api"
import { queryClient } from "../../../lib/queryClient"

const roomSchema = z.object({
  id_piso: z.coerce.number().int(),
  nombre_sala: z.string().min(1).max(50),
  imagen: z.string().optional(),
  capacidad: z.coerce.number().int().min(1),
  tipo_sala: z.string().max(50),
  cord_latitud: z.coerce.number(),
  cord_longitud: z.coerce.number(),
  estado: z.coerce.boolean(),
  disponibilidad: z.string().max(20)
})

export default function RoomsPage() {
  const [search, setSearch] = useState("")
  const [selectedBuilding, setSelectedBuilding] = useState("")
  const [selectedFloor, setSelectedFloor] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [modalImg, setModalImg] = useState(null)
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)

  const { data: buildings } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const res = await api.get("/buildings")
      return res.data.data
    },
  })

  const { data: floors } = useQuery({
    queryKey: ["floors", selectedBuilding],
    queryFn: async () => {
      if (!selectedBuilding) return []
      const res = await api.get(`/buildings/${selectedBuilding}/floors`)
      return res.data.data
    },
    enabled: !!selectedBuilding,
  })

  const { data: rooms, isLoading } = useQuery({
    queryKey: ["rooms", selectedFloor, search],
    queryFn: async () => {
      if (!selectedFloor) return []
      const res = await api.get("/rooms", {
        params: { id_piso: selectedFloor, search },
      })
      return res.data.data
    },
    enabled: !!selectedFloor,
  })

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/rooms", payload, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["rooms"])
      setModalOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const res = await api.put(`/rooms/${id}`, payload, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["rooms"])
      setModalOpen(false)
      setEditItem(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/rooms/${id}`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["rooms"])
    },
  })

  const handleCreate = () => {
    setEditItem(null)
    setModalOpen(true)
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setModalOpen(true)
    setAnchorEl(null)
  }

  const handleDelete = (item) => {
    if (confirm("¿Borrar habitación " + item.nombre_sala + "?")) {
      deleteMutation.mutate(item.id_sala)
    }
    setAnchorEl(null)
  }

  const handleMenuOpen = (event, row) => {
    setAnchorEl(event.currentTarget)
    setSelectedRow(row)
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: "bold" }}>
          Habitaciones
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Gestiona las habitaciones del sistema.
        </Typography>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 3 }}>
          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel>Edificio</InputLabel>
            <Select
              value={selectedBuilding}
              onChange={(e) => {
                setSelectedBuilding(e.target.value)
                setSelectedFloor("")
              }}
              label="Edificio"
            >
              <MenuItem value="">
                <em>Ninguno</em>
              </MenuItem>
              {buildings?.map(b => (
                <MenuItem key={b.id_edificio} value={b.id_edificio}>
                  {b.nombre_edificio} ({b.acronimo})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }} size="small" disabled={!selectedBuilding}>
            <InputLabel>Piso</InputLabel>
            <Select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              label="Piso"
            >
              <MenuItem value="">
                <em>Ninguno</em>
              </MenuItem>
              {floors?.map(f => (
                <MenuItem key={f.id_piso} value={f.id_piso}>
                  {f.nombre_piso} (Piso {f.numero_piso})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            placeholder="Buscar habitaciones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: "action.active" }} />,
            }}
            disabled={!selectedFloor}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            disabled={!selectedFloor}
          >
            Crear Habitación
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} elevation={1}>
        {!selectedFloor ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <Typography variant="body1" color="text.secondary">
              Selecciona un edificio y piso para ver las habitaciones
            </Typography>
          </Box>
        ) : isLoading ? (
          <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: "bold" }}>ID</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Imagen</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Capacidad</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Coordenadas</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Disponibilidad</TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rooms?.map((row) => {
                const imageUrl = row.imagen && !/via\.placeholder\.com/.test(row.imagen)
                  ? (row.imagen.startsWith("http") ? row.imagen : `http://localhost:4000${row.imagen}`)
                  : null

                return (
                  <TableRow key={row.id_sala} hover>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
                      {row.id_sala}
                    </TableCell>
                    <TableCell>
                      {imageUrl ? (
                        <Avatar
                          src={imageUrl}
                          variant="rounded"
                          sx={{ width: 48, height: 48, cursor: "pointer" }}
                          onClick={() => setModalImg(imageUrl)}
                        >
                          <ImageIcon />
                        </Avatar>
                      ) : (
                        <Avatar variant="rounded" sx={{ width: 48, height: 48, bgcolor: "grey.300" }}>
                          <ImageIcon />
                        </Avatar>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: "medium" }}>{row.nombre_sala}</TableCell>
                    <TableCell>
                      <Chip label={row.tipo_sala} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{row.capacidad}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
                      {row.cord_latitud}, {row.cord_longitud}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.estado ? "Activo" : "Inactivo"}
                        color={row.estado ? "success" : "error"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.disponibilidad}
                        color={row.disponibilidad === "Disponible" ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, row)}>
                        <MoreIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => handleEdit(selectedRow)}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Editar
        </MenuItem>
        <MenuItem onClick={() => handleDelete(selectedRow)} sx={{ color: "error.main" }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Eliminar
        </MenuItem>
      </Menu>

      <RoomFormDialog
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditItem(null)
        }}
        editItem={editItem}
        floors={floors}
        selectedFloor={selectedFloor}
        onSubmit={(values) => {
          if (editItem) {
            updateMutation.mutate({ id: editItem.id_sala, ...values })
          } else {
            createMutation.mutate(values)
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog open={!!modalImg} onClose={() => setModalImg(null)} maxWidth="md" fullWidth>
        <DialogTitle>Imagen de la habitación</DialogTitle>
        <DialogContent>
          {modalImg && (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <img
                src={modalImg}
                alt="Habitación"
                style={{ maxWidth: "100%", maxHeight: "500px", objectFit: "contain" }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalImg(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function RoomFormDialog({ open, onClose, editItem, floors, selectedFloor, onSubmit, isLoading }) {
  const fileRef = useRef()
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      nombre_sala: "",
      tipo_sala: "Aula",
      capacidad: "",
      imagen: "",
      id_piso: selectedFloor || "",
      cord_latitud: "",
      cord_longitud: "",
      estado: true,
      disponibilidad: "Disponible"
    },
    resolver: zodResolver(roomSchema),
  })

  // Resetear el formulario cuando cambia editItem o se abre el modal
  useEffect(() => {
    if (open) {
      if (editItem) {
        reset({
          nombre_sala: editItem.nombre_sala || "",
          tipo_sala: editItem.tipo_sala || "Aula",
          capacidad: editItem.capacidad || "",
          imagen: editItem.imagen || "",
          id_piso: editItem.id_piso || selectedFloor || "",
          cord_latitud: editItem.cord_latitud || "",
          cord_longitud: editItem.cord_longitud || "",
          estado: editItem.estado ?? true,
          disponibilidad: editItem.disponibilidad || "Disponible"
        })
      } else {
        reset({
          nombre_sala: "",
          tipo_sala: "Aula",
          capacidad: "",
          imagen: "",
          id_piso: selectedFloor || "",
          cord_latitud: "",
          cord_longitud: "",
          estado: true,
          disponibilidad: "Disponible"
        })
      }
    }
  }, [open, editItem, selectedFloor, reset])

  const imagenUrl = editItem?.imagen && editItem.imagen.startsWith("/uploads")
    ? `http://localhost:4000${editItem.imagen}`
    : editItem?.imagen

  const handleFormSubmit = (values) => {
    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      if (key !== "imagen") formData.append(key, value)
    })

    if (fileRef.current?.files[0]) {
      formData.append("imagen", fileRef.current.files[0])
    } else if (values.imagen && values.imagen.startsWith("/uploads")) {
      formData.append("imagen", values.imagen)
    }

    onSubmit(formData)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editItem ? "Editar Habitación" : "Crear Habitación"}</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="Nombre"
              {...register("nombre_sala")}
              error={!!errors.nombre_sala}
              helperText={errors.nombre_sala?.message}
            />

            <Controller
              name="tipo_sala"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Tipo de Sala</InputLabel>
                  <Select {...field} label="Tipo de Sala">
                    <MenuItem value="Aula">Aula</MenuItem>
                    <MenuItem value="Laboratorio">Laboratorio</MenuItem>
                    <MenuItem value="Oficina">Oficina</MenuItem>
                    <MenuItem value="Auditorio">Auditorio</MenuItem>
                    <MenuItem value="Biblioteca">Biblioteca</MenuItem>
                    <MenuItem value="Baño">Baño</MenuItem>
                    <MenuItem value="Otro">Otro</MenuItem>
                  </Select>
                </FormControl>
              )}
            />

            <TextField
              fullWidth
              label="Capacidad"
              type="number"
              {...register("capacidad")}
              error={!!errors.capacidad}
              helperText={errors.capacidad?.message}
            />

            <Controller
              name="id_piso"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Piso</InputLabel>
                  <Select {...field} label="Piso">
                    {floors?.map(f => (
                      <MenuItem key={f.id_piso} value={f.id_piso}>
                        {f.nombre_piso} (Piso {f.numero_piso})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Imagen
              </Typography>
              <input type="file" ref={fileRef} accept="image/*" style={{ width: "100%" }} />
              {imagenUrl && (
                <Box sx={{ mt: 2 }}>
                  <img src={imagenUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: 120, objectFit: "contain" }} />
                </Box>
              )}
            </Box>

            <TextField
              fullWidth
              label="Latitud"
              type="number"
              inputProps={{ step: "any" }}
              {...register("cord_latitud")}
              error={!!errors.cord_latitud}
              helperText={errors.cord_latitud?.message}
            />

            <TextField
              fullWidth
              label="Longitud"
              type="number"
              inputProps={{ step: "any" }}
              {...register("cord_longitud")}
              error={!!errors.cord_longitud}
              helperText={errors.cord_longitud?.message}
            />

            <Controller
              name="estado"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select {...field} label="Estado">
                    <MenuItem value={true}>Activo</MenuItem>
                    <MenuItem value={false}>Inactivo</MenuItem>
                  </Select>
                </FormControl>
              )}
            />

            <TextField
              fullWidth
              label="Disponibilidad"
              {...register("disponibilidad")}
              error={!!errors.disponibilidad}
              helperText={errors.disponibilidad?.message}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading && <CircularProgress size={20} />}
          >
            {isLoading ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
