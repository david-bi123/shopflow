import { z } from 'zod'

export const updateSettingsSchema = z.object({
  storeName: z.string().min(1, 'Store name is required').max(100),
  storePhone: z.string().max(50).optional().or(z.literal('')),
  storeEmail: z.string().email().optional().or(z.literal('')),
  storeAddress: z.string().max(500).optional().or(z.literal('')),
  logo: z.string().optional().or(z.literal('')),
  currency: z.string().min(1, 'Currency is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  taxRate: z.number().min(0).max(100),
  receiptFooter: z.string().max(500).optional().or(z.literal('')),
  defaultPaymentMethods: z.array(z.string()).min(1),
  showLogoOnReceipt: z.boolean(),
  showQrOnReceipt: z.boolean(),
})

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
