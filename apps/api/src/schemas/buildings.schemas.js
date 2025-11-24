import { z } from 'zod'

export const createBuildingSchema = z.object({
  nombre_edificio: z.string().min(1),
  acronimo: z.string().min(1),
  descripcion: z.string().optional(),
  cord_latitud: z.number(),
  cord_longitud: z.number(),
  estado: z.boolean().optional().default(true),
  disponibilidad: z.string().optional().default('Disponible'),
})

export const updateBuildingSchema = createBuildingSchema.partial()
