import { z } from 'zod'

const codeRegex = /^[A-Za-z0-9_-]{1,30}$/


export const buildingCreateSchema = z.object({
  nombre_edificio: z.string().min(1).max(100),
  acronimo: z.string().min(1).max(50),
  imagen: z.string().max(200).optional(),
  cord_latitud: z.coerce.number(),
  cord_longitud: z.coerce.number(),
  estado: z.coerce.boolean(),
  disponibilidad: z.string().max(20)
})

export const buildingUpdateSchema = buildingCreateSchema.partial()
