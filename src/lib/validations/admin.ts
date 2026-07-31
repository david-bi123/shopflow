import { z } from 'zod'

export const createShopSchema = z.object({
  shopName: z
    .string()
    .min(2, 'Shop name must be at least 2 characters')
    .max(100, 'Shop name must be less than 100 characters'),
  ownerEmail: z.string().email('Invalid owner email address'),
  ownerPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export type CreateShopInput = z.infer<typeof createShopSchema>
