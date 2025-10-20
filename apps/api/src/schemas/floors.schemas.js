import { z } from 'zod'


export const floorCreateSchema = z.object({
  id_edificio: z.coerce.number().int(),
  nombre_piso: z.string().min(1).max(100),
  imagen: z.string().max(200).optional(),
  codigo_qr: z.string().max(200),
  estado: z.coerce.boolean(),
  disponibilidad: z.string().max(20)
})

export const floorUpdateSchema = floorCreateSchema.partial()
