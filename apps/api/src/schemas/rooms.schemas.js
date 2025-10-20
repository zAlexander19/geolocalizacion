import { z } from 'zod'

const codeRegex = /^[A-Za-z0-9_-]{1,30}$/


export const roomCreateSchema = z.object({
  id_piso: z.coerce.number().int(),
  nombre_sala: z.string().min(1).max(50),
  imagen: z.string().max(200).optional(),
  capacidad: z.coerce.number().int().min(1),
  tipo_sala: z.string().max(50),
  cord_latitud: z.coerce.number(),
  cord_longitud: z.coerce.number(),
  estado: z.coerce.boolean(),
  disponibilidad: z.string().max(20)
})

export const roomUpdateSchema = roomCreateSchema.partial()
