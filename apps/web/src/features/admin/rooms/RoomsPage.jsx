import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../../../lib/api'
import { queryClient } from '../../../lib/queryClient'
import DataTable from '../../../components/DataTable'
import Modal from '../../../components/Modal'
import FormField from '../../../components/FormField'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'


const roomSchema = z.object({
  id_piso: z.coerce.number().int(),
  nombre_sala: z.string().min(1).max(50),
  imagen: z.string().max(200),
  capacidad: z.coerce.number().int().min(1),
  tipo_sala: z.string().max(50),
  cord_latitud: z.coerce.number(),
  cord_longitud: z.coerce.number(),
  estado: z.coerce.boolean(),
  disponibilidad: z.string().max(20)
})

export default function RoomsPage() {
  const [search, setSearch] = useState('')
  const [filterBuilding, setFilterBuilding] = useState('')
  const [filterFloor, setFilterFloor] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const { data: buildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => {
      const res = await api.get('/buildings')
      return res.data.data
    },
  })

  const { data: floors } = useQuery({
    queryKey: ['floors', filterBuilding],
    queryFn: async () => {
      if (!filterBuilding) return []
      const res = await api.get(`/buildings/${filterBuilding}/floors`)
      return res.data.data
    },
    enabled: !!filterBuilding,
  })

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms', filterBuilding, filterFloor, search],
    queryFn: async () => {
      const res = await api.get('/rooms', {
        params: { id_piso: filterFloor || undefined, search },
      })
      return res.data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      // payload puede ser FormData
      const res = await api.post('/rooms', payload, payload instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rooms'])
      setModalOpen(false)
      alert('Created!')
    },
    onError: (err) => alert('Error: ' + (err.response?.data?.error || err.message)),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const res = await api.put(`/rooms/${id}`, payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rooms'])
      setModalOpen(false)
      setEditItem(null)
      alert('Updated!')
    },
    onError: (err) => alert('Error: ' + (err.response?.data?.error || err.message)),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/rooms/${id}`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rooms'])
      alert('Deleted!')
    },
    onError: (err) => alert('Error: ' + (err.response?.data?.error || err.message)),
  })

  const handleCreate = () => {
    setEditItem(null)
    setModalOpen(true)
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setModalOpen(true)
  }

  const handleDelete = (item) => {
    if (confirm('¿Borrar sala ' + item.nombre_sala + '?')) {
      deleteMutation.mutate(item.id_sala)
    }
  }

  const columns = [
    { key: 'id_sala', label: 'ID' },
    { key: 'id_piso', label: 'Piso' },
    { key: 'nombre_sala', label: 'Nombre' },
    { 
      key: 'imagen', 
      label: 'Imagen',
      render: (row) => {
        const placeholder = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="100%" height="100%" fill="%23222"/><text x="50%" y="50%" dy=".3em" text-anchor="middle" font-size="10" fill="%23aaa">Sin img</text></svg>'
  if (!row.imagen || /via\.placeholder\.com/.test(row.imagen)) return <img src={placeholder} alt="Sin imagen" style={{ maxWidth: 80, maxHeight: 80, objectFit: 'cover', borderRadius: 4 }} />
        const imageUrl = row.imagen.startsWith('http') ? row.imagen : `http://localhost:4000${row.imagen}`
        return (
          <img src={imageUrl} alt="Sala" style={{ maxWidth: 80, maxHeight: 80, objectFit: 'cover', borderRadius: 4 }} onError={(e) => { e.currentTarget.src = placeholder }} />
        )
      }
    },
    { key: 'capacidad', label: 'Capacidad' },
    { key: 'tipo_sala', label: 'Tipo' },
    { key: 'cord_latitud', label: 'Latitud' },
    { key: 'cord_longitud', label: 'Longitud' },
    { key: 'estado', label: 'Estado' },
    { key: 'disponibilidad', label: 'Disponibilidad' },
  ]

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-1">Habitaciones</h1>
        <p className="text-base text-gray-600 mb-4">Gestiona las salas o habitaciones por edificio y piso.</p>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm text-gray-700">Edificio:</label>
          <select
            value={filterBuilding}
            onChange={(e) => {
              setFilterBuilding(e.target.value)
              setFilterFloor('')
            }}
            className="border border-gray-300 rounded px-3 py-2 text-sm w-64"
          >
            <option value="">Todo</option>
            {buildings?.map((b) => (
              <option key={b.id_edificio} value={b.id_edificio}>
                {b.nombre_edificio}
              </option>
            ))}
          </select>
          {filterBuilding && (
            <>
              <label className="text-sm text-gray-700">Piso:</label>
              <select
                value={filterFloor}
                onChange={(e) => setFilterFloor(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm w-48"
              >
                <option value="">Todos</option>
                {floors?.map((f) => (
                  <option key={f.id_piso} value={f.id_piso}>
                    {f.nombre_piso}
                  </option>
                ))}
              </select>
            </>
          )}
          <input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm w-64"
          />
          <button onClick={handleCreate} className="px-3 py-2 text-sm rounded border border-gray-300">Crear sala</button>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        {isLoading ? (
          <p className="p-6 text-gray-500">Cargando...</p>
        ) : (
          <DataTable columns={columns} data={rooms} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Editar sala' : 'Crear sala'}>
        <RoomForm
          buildings={buildings || []}
          initialData={editItem || { id_piso: '', nombre_sala: '', imagen: '', capacidad: 1, tipo_sala: '', cord_latitud: '', cord_longitud: '', estado: true, disponibilidad: 'Disponible' }}
          onSubmit={(values) => {
            if (editItem) {
              updateMutation.mutate({ id: editItem.id_sala, ...values })
            } else {
              createMutation.mutate(values)
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </div>
  )
}


function RoomForm({ buildings, initialData, onSubmit, isLoading }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(roomSchema),
    defaultValues: initialData,
  })

  // Selección de edificio y pisos
  const selectedBuilding = watch('id_edificio')
  const { data: floors } = useQuery({
    queryKey: ['floors', selectedBuilding],
    queryFn: async () => {
      if (!selectedBuilding) return []
      const res = await api.get(`/buildings/${selectedBuilding}/floors`)
      return res.data.data
    },
    enabled: !!selectedBuilding,
  })

  const fileRef = useRef()

  const handleFormSubmit = (values) => {
    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      if (key !== 'imagen') formData.append(key, value)
    })
    if (fileRef.current?.files[0]) {
      formData.append('imagen', fileRef.current.files[0])
    }
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} encType="multipart/form-data">
      <FormField label="Edificio" error={errors.id_edificio?.message}>
        <select {...register('id_edificio')} style={{ width: '100%', padding: '0.5rem' }}>
          <option value="">-- Selecciona --</option>
          {buildings.map((b) => (
            <option key={b.id_edificio} value={b.id_edificio}>
              {b.nombre_edificio}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Piso" error={errors.id_piso?.message}>
        <select {...register('id_piso')} style={{ width: '100%', padding: '0.5rem' }} disabled={!selectedBuilding}>
          <option value="">-- Selecciona --</option>
          {floors?.map((f) => (
            <option key={f.id_piso} value={f.id_piso}>
              {f.nombre_piso}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Nombre de Sala" error={errors.nombre_sala?.message}>
        <input {...register('nombre_sala')} style={{ width: '100%', padding: '0.5rem' }} />
      </FormField>
      <FormField label="Imagen" error={errors.imagen?.message}>
        <input type="file" ref={fileRef} accept="image/*" style={{ width: '100%', padding: '0.5rem' }} />
      </FormField>
      <FormField label="Capacidad" error={errors.capacidad?.message}>
        <input type="number" {...register('capacidad')} style={{ width: '100%', padding: '0.5rem' }} />
      </FormField>
      <FormField label="Tipo de Sala" error={errors.tipo_sala?.message}>
        <select {...register('tipo_sala')} style={{ width: '100%', padding: '0.5rem' }}>
          <option value="">-- Selecciona --</option>
          <option value="Laboratorio">Laboratorio</option>
          <option value="Cátedra">Cátedra</option>
          <option value="Sala de reuniones">Sala de reuniones</option>
        </select>
      </FormField>
      <FormField label="Latitud" error={errors.cord_latitud?.message}>
        <input type="number" step="any" {...register('cord_latitud')} style={{ width: '100%', padding: '0.5rem' }} />
      </FormField>
      <FormField label="Longitud" error={errors.cord_longitud?.message}>
        <input type="number" step="any" {...register('cord_longitud')} style={{ width: '100%', padding: '0.5rem' }} />
      </FormField>
      <FormField label="Estado" error={errors.estado?.message}>
        <select {...register('estado')} style={{ width: '100%', padding: '0.5rem' }}>
          <option value={true}>Activo</option>
          <option value={false}>Inactivo</option>
        </select>
      </FormField>
      <FormField label="Disponibilidad" error={errors.disponibilidad?.message}>
        <input {...register('disponibilidad')} style={{ width: '100%', padding: '0.5rem' }} />
      </FormField>
      <button type="submit" disabled={isLoading} style={{ padding: '0.5rem 1rem' }}>
        {isLoading ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  )
}
