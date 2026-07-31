import { z } from 'zod'

export const inviteStaffSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'staff']),
  permissions: z.array(z.string()).optional(),
})

export const updateStaffSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'staff']).optional(),
  permissions: z.array(z.string()).optional(),
  status: z.enum(['active', 'suspended']).optional(),
})

export const resetStaffPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>
