import { useState, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../../../lib/api'
import { queryClient } from '../../../lib/queryClient'
import Badge from '../../../components/ui/badge'
import Button from '../../../components/ui/button'
import SearchInput from '../../../components/ui/search-input'
import ActionsMenu from '../../../components/ui/actions-menu'
import Modal from '../../../components/Modal'
import FormField from '../../../components/FormField'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'


const floorSchema = z.object({
  id_edificio: z.coerce.number().int(),
  nombre_piso: z.string().min(1).max(100),
  imagen: z.string().max(200),
  codigo_qr: z.string().max(200),
  estado: z.coerce.boolean(),
  disponibilidad: z.string().max(20)
})

export default function FloorsPage() {
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const { data: buildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => {
      const res = await api.get('/buildings')
      return res.data.data
    },
  })

  const { data: floors, isLoading } = useQuery({
    queryKey: ['floors', selectedBuilding],
    queryFn: async () => {
      if (!selectedBuilding) return []
      const res = await api.get(`/buildings/${selectedBuilding}/floors`)
      return res.data.data
    },
    enabled: !!selectedBuilding,
  })

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      // payload es FormData
      const res = await api.post('/floors', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['floors'])
      setModalOpen(false)
      alert('Created!')
    },
    onError: (err) => alert('Error: ' + (err.response?.data?.error || err.message)),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const res = await api.put(`/floors/${id}`, payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['floors'])
      setModalOpen(false)
      setEditItem(null)
      alert('Updated!')
    },
    onError: (err) => alert('Error: ' + (err.response?.data?.error || err.message)),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/floors/${id}`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['floors'])
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
    if (confirm('¿Borrar piso ' + item.nombre_piso + '?')) {
      deleteMutation.mutate(item.id_piso)
    }
  }

  const columns = [
    { key: 'id_piso', label: 'ID' },
    { key: 'id_edificio', label: 'Edificio' },
    { key: 'nombre_piso', label: 'Nombre' },
    { 
      key: 'imagen', 
      label: 'Imagen',
      render: (row) => {
        const placeholder = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="100%" height="100%" fill="%23222"/><text x="50%" y="50%" dy=".3em" text-anchor="middle" font-size="10" fill="%23aaa">Sin img</text></svg>'
        if (!row.imagen || /via\.placeholder\.com/.test(row.imagen)) {
          return <img src={placeholder} alt="Sin imagen" style={{ maxWidth: 80, maxHeight: 80, objectFit: 'cover', borderRadius: 4 }} />
        }
        const imageUrl = row.imagen.startsWith('http') 
          ? row.imagen 
          : `http://localhost:4000${row.imagen}`
        return (
          <img 
            src={imageUrl} 
            alt="Piso" 
            style={{ maxWidth: 80, maxHeight: 80, objectFit: 'cover', borderRadius: 4 }}
            onError={(e) => {
              e.currentTarget.src = placeholder
            }}
          />
        )
      }
    },
    { key: 'codigo_qr', label: 'Código QR' },
    { 
      key: 'estado', 
      label: 'Estado',
      render: (row) => row.estado ? 'Activo' : 'Inactivo'
    },
    { key: 'disponibilidad', label: 'Disponibilidad' },
  ]

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-1">Pisos</h1>
        <p className="text-base text-gray-600 mb-4">Gestiona los pisos de los edificios.</p>
        <div className="flex items-center gap-2 mb-2">
          <select
            value={selectedBuilding}
            onChange={e => setSelectedBuilding(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm w-64"
          >
            <option value="">-- Selecciona edificio --</option>
            {buildings?.map((b) => (
              <option key={b.id_edificio} value={b.id_edificio}>{b.nombre_edificio}</option>
            ))}
          </select>
          <Button onClick={handleCreate} disabled={!selectedBuilding}>+ Crear piso</Button>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        {!selectedBuilding ? (
          <p className="p-6 text-gray-500">Selecciona un edificio para ver los pisos</p>
        ) : isLoading ? (
          <p className="p-6 text-gray-500">Cargando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">ID</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Edificio</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Nombre</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Imagen</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Código QR</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Estado</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Disponibilidad</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {floors.map(row => {
                const placeholder = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="100%" height="100%" rx="12" fill="%23e5e7eb"/><rect x="12" y="12" width="24" height="24" rx="4" fill="%23222"/><rect x="18" y="18" width="6" height="6" fill="%23fff"/><rect x="24" y="18" width="6" height="6" fill="%23fff"/><rect x="18" y="24" width="6" height="6" fill="%23fff"/><rect x="24" y="24" width="6" height="6" fill="%23fff"/></svg>'
                const imageUrl = !row.imagen || /via\.placeholder\.com/.test(row.imagen)
                  ? placeholder
                  : (row.imagen.startsWith('http') ? row.imagen : `http://localhost:4000${row.imagen}`)
                return (
                  <tr key={row.id_piso} className="border-b last:border-b-0">
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">{row.id_piso}</td>
                    <td className="px-4 py-2 text-gray-900 font-medium">{row.id_edificio}</td>
                    <td className="px-4 py-2 text-gray-900 font-medium">{row.nombre_piso}</td>
                    <td className="px-4 py-2">
                      <img src={imageUrl} alt="Piso" style={{ maxWidth: 48, maxHeight: 48, objectFit: 'cover', borderRadius: 12, background: '#e5e7eb' }} />
                      {!row.imagen && <span className="text-xs text-gray-400 ml-2">Sin imagen</span>}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">{row.codigo_qr}</td>
                    <td className="px-4 py-2">
                      <Badge color={row.estado ? 'green' : 'red'}>{row.estado ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      <Badge color={row.disponibilidad === 'Disponible' ? 'green' : 'gray'}>{row.disponibilidad}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      <ActionsMenu onEdit={() => handleEdit(row)} onDelete={() => handleDelete(row)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Editar piso' : 'Crear piso'}>
          <FloorForm
            buildings={buildings || []}
            initialData={editItem || { id_edificio: selectedBuilding, nombre_piso: '', imagen: '', codigo_qr: '', estado: true, disponibilidad: 'Disponible' }}
            onSubmit={(values) => {
              if (editItem) {
                updateMutation.mutate({ id: editItem.id_piso, ...values })
              } else {
                createMutation.mutate(values)
              }
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </Modal>
      </div>
    </div>
  )
}

function FloorForm({ buildings, initialData, onSubmit, isLoading }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: initialData,
  })
  const fileRef = useRef()
  const imagenUrl = initialData?.imagen && initialData.imagen.startsWith('/uploads')
    ? `${window.location.origin}${initialData.imagen}`
    : initialData?.imagen

  const handleFormSubmit = (values) => {
    const formData = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      if (key !== 'imagen') formData.append(key, value)
    })
      // Solo agregar imagen si hay un archivo seleccionado
      if (fileRef.current?.files[0]) {
        formData.append('imagen', fileRef.current.files[0])
      }
      // Si no hay archivo pero hay una URL existente (al editar), mantenerla
      else if (values.imagen && values.imagen.startsWith('/uploads')) {
        formData.append('imagen', values.imagen)
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
      <FormField label="Nombre del Piso" error={errors.nombre_piso?.message}>
        <input {...register('nombre_piso')} style={{ width: '100%', padding: '0.5rem' }} />
      </FormField>
      <FormField label="Imagen">
        <input type="file" ref={fileRef} accept="image/*" style={{ width: '100%', padding: '0.5rem' }} />
        {imagenUrl && (
          <div style={{ marginTop: 8 }}>
            <img src={imagenUrl} alt="Imagen" style={{ maxWidth: '100%', maxHeight: 120 }} />
          </div>
        )}
      </FormField>
      <FormField label="Código QR" error={errors.codigo_qr?.message}>
        <input {...register('codigo_qr')} style={{ width: '100%', padding: '0.5rem' }} />
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

