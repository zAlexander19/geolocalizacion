import { z } from 'zod'

export const createRoomSchema = z.object({
  id_piso: z.number().int().positive(),
  nombre_sala: z.string().min(1),
  acronimo: z.string().min(1),
  descripcion: z.string().optional(),
  capacidad: z.number().int().positive(),
  tipo_sala: z.string().min(1),
  cord_latitud: z.number(),
  cord_longitud: z.number(),
  estado: z.boolean().optional().default(true),
  disponibilidad: z.string().optional().default('Disponible'),
})

export const updateRoomSchema = createRoomSchema.partial()
