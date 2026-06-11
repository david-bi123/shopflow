import { z } from 'zod'

export const taxDefinitionSchema = z.object({
  name: z.string().min(1).max(50),
  rate: z.number().min(0).max(100),
  enabled: z.boolean(),
})

export const updateSettingsSchema = z.object({
  storeName: z.string().min(1, 'Store name is required').max(100),
  storePhone: z.string().max(50).optional().or(z.literal('')),
  storeEmail: z.string().email().optional().or(z.literal('')),
  storeAddress: z.string().max(500).optional().or(z.literal('')),
  storeDescription: z.string().max(500).optional().or(z.literal('')),
  taxNumber: z.string().max(100).optional().or(z.literal('')),
  logo: z.string().optional().or(z.literal('')),
  currency: z.string().min(1, 'Currency is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  taxRate: z.number().min(0).max(100),
  taxes: z.array(taxDefinitionSchema),
  receiptFooter: z.string().max(500).optional().or(z.literal('')),
  defaultPaymentMethods: z.array(z.string()).min(1),
  showLogoOnReceipt: z.boolean(),
  showQrOnReceipt: z.boolean(),
})

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
export type TaxDefinition = z.infer<typeof taxDefinitionSchema>
