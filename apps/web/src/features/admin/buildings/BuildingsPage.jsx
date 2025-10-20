import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../../../lib/api'
import { queryClient } from '../../../lib/queryClient'
import DataTable from '../../../components/DataTable'
import Modal from '../../../components/Modal'
import FormField from '../../../components/FormField'
import Button from '../../../components/ui/button'
import Card from '../../../components/ui/card'
import Badge from '../../../components/ui/badge'
import SearchInput from '../../../components/ui/search-input'
import ActionsMenu from '../../../components/ui/actions-menu'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'


const buildingSchema = z.object({
  nombre_edificio: z.string().min(1).max(100),
  acronimo: z.string().min(1).max(50),
  imagen: z.string().max(200),
  cord_latitud: z.coerce.number(),
  cord_longitud: z.coerce.number(),
  estado: z.coerce.boolean(),
  disponibilidad: z.string().max(20)
})

export default function BuildingsPage() {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['buildings', search],
    queryFn: async () => {
      const res = await api.get('/buildings', { params: { search } })
      return res.data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      // payload es FormData
      const res = await api.post('/buildings', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['buildings'])
      setModalOpen(false)
      alert('Created!')
    },
    onError: (err) => alert('Error: ' + (err.response?.data?.error || err.message)),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const res = await api.put(`/buildings/${id}`, payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['buildings'])
      setModalOpen(false)
      setEditItem(null)
      alert('Updated!')
    },
    onError: (err) => alert('Error: ' + (err.response?.data?.error || err.message)),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/buildings/${id}`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['buildings'])
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
    if (confirm('¿Borrar edificio ' + item.nombre_edificio + '?')) {
      deleteMutation.mutate(item.id_edificio)
    }
  }


  const columns = [
    { key: 'id_edificio', label: 'ID' },
    { key: 'nombre_edificio', label: 'Nombre' },
    { key: 'acronimo', label: 'Acrónimo' },
    { 
      key: 'imagen', 
      label: 'Imagen',
      render: (row) => {
        const placeholder = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="100%" height="100%" fill="%23222"/><text x="50%" y="50%" dy=".3em" text-anchor="middle" font-size="10" fill="%23aaa">Sin img</text></svg>'
        // Si viene una URL de via.placeholder.com (del seed antiguo), evitar pedirla
        if (!row.imagen || /via\.placeholder\.com/.test(row.imagen)) {
          return <img src={placeholder} alt="Sin imagen" style={{ maxWidth: 80, maxHeight: 80, objectFit: 'cover', borderRadius: 4 }} />
        }
        const imageUrl = row.imagen.startsWith('http') 
          ? row.imagen 
          : `http://localhost:4000${row.imagen}`
        return (
          <img 
            src={imageUrl} 
            alt="Edificio" 
            style={{ maxWidth: 80, maxHeight: 80, objectFit: 'cover', borderRadius: 4 }}
            onError={(e) => { e.currentTarget.src = placeholder }}
          />
        )
      }
    },
    { key: 'cord_latitud', label: 'Latitud' },
    { key: 'cord_longitud', label: 'Longitud' },
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
        <h1 className="text-3xl font-semibold text-gray-900 mb-1">Edificios</h1>
        <p className="text-base text-gray-600 mb-4">Gestiona los edificios del sistema.</p>
        <div className="flex items-center gap-2 mb-2">
          <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar edificios..." className="w-64" />
          <Button onClick={handleCreate} className="ml-auto">+ Crear edificio</Button>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        {isLoading ? (
          <p className="p-6 text-gray-500">Cargando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">IDENTIFICACIÓN</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Nombre</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Acrónimo</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Imagen</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Coordenadas</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Estado</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Disponibilidad</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => {
                const placeholder = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="100%" height="100%" rx="12" fill="%23e5e7eb"/><rect x="12" y="12" width="24" height="24" rx="4" fill="%23222"/><rect x="18" y="18" width="6" height="6" fill="%23fff"/><rect x="24" y="18" width="6" height="6" fill="%23fff"/><rect x="18" y="24" width="6" height="6" fill="%23fff"/><rect x="24" y="24" width="6" height="6" fill="%23fff"/></svg>'
                const imageUrl = !row.imagen || /via\.placeholder\.com/.test(row.imagen)
                  ? placeholder
                  : (row.imagen.startsWith('http') ? row.imagen : `http://localhost:4000${row.imagen}`)
                return (
                  <tr key={row.id_edificio} className="border-b last:border-b-0">
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">{row.id_edificio}</td>
                    <td className="px-4 py-2 text-gray-900 font-medium">{row.nombre_edificio}</td>
                    <td className="px-4 py-2"><Badge color="outline">{row.acronimo}</Badge></td>
                    <td className="px-4 py-2">
                      <img src={imageUrl} alt="Edificio" style={{ maxWidth: 48, maxHeight: 48, objectFit: 'cover', borderRadius: 12, background: '#e5e7eb' }} />
                      {!row.imagen && <span className="text-xs text-gray-400 ml-2">Sin imagen</span>}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">{row.cord_latitud}, {row.cord_longitud}</td>
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
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Editar edificio' : 'Crear edificio'}>
          <BuildingForm
            initialData={editItem}
            onSubmit={(values) => {
              if (editItem) {
                updateMutation.mutate({ id: editItem.id_edificio, ...values })
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



import { useRef } from 'react'

function BuildingForm({ initialData, onSubmit, isLoading }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    defaultValues: initialData || {
      nombre_edificio: '',
      acronimo: '',
      imagen: '',
      cord_latitud: '',
      cord_longitud: '',
      estado: true,
      disponibilidad: 'Disponible',
    },
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
      <FormField label="Nombre" error={errors.nombre_edificio?.message}>
        <input {...register('nombre_edificio')} style={{ width: '100%', padding: '0.5rem' }} />
      </FormField>
      <FormField label="Acrónimo" error={errors.acronimo?.message}>
        <input {...register('acronimo')} style={{ width: '100%', padding: '0.5rem' }} />
      </FormField>
      <FormField label="Imagen">
        <input type="file" ref={fileRef} accept="image/*" style={{ width: '100%', padding: '0.5rem' }} />
        {imagenUrl && (
          <div style={{ marginTop: 8 }}>
            <img src={imagenUrl} alt="Imagen" style={{ maxWidth: '100%', maxHeight: 120 }} />
          </div>
        )}
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
