import { z } from 'zod'

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, 'Customer name is required').max(200),
  // Email is optional but if present must be a real address. Empty
  // string is treated as "no email" so the form can submit a blank.
  email: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export const updateCustomerSchema = createCustomerSchema
  .partial()
  // Reject completely-empty updates — there's nothing to save.
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: 'Provide at least one field to update' },
  )

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
