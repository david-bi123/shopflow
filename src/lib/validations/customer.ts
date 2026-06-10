import { z } from 'zod'

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export const updateCustomerSchema = createCustomerSchema.partial()

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
