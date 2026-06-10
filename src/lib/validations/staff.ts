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

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>
