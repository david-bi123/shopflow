import { z } from 'zod'
import { CURRENCIES, TIMEZONES, PAYMENT_METHODS } from '@/lib/utils/constants'

// ISO-4217 codes for the currencies we expose in the UI. Mirrors the
// `CURRENCIES` array in `lib/utils/constants.ts` so any currency added
// there is automatically accepted here.
const currencyCodes = CURRENCIES.map((c) => c.code) as [string, ...string[]]
const timezoneIds = TIMEZONES as unknown as [string, ...string[]]
const paymentMethodValues = PAYMENT_METHODS.map((p) => p.value) as [string, ...string[]]

export const taxDefinitionSchema = z.object({
  name: z.string().min(1).max(50),
  rate: z.number().min(0).max(100),
  enabled: z.boolean(),
})

export const updateSettingsSchema = z.object({
  storeName: z.string().min(1, 'Store name is required').max(100),
  storePhone: z.string().max(50).nullable().optional().or(z.literal('')),
  storeEmail: z.string().email().nullable().optional().or(z.literal('')),
  storeAddress: z.string().max(500).nullable().optional().or(z.literal('')),
  storeDescription: z.string().max(500).nullable().optional().or(z.literal('')),
  taxNumber: z.string().max(100).nullable().optional().or(z.literal('')),
  logo: z.string().nullable().optional().or(z.literal('')),
  currency: z.enum(currencyCodes),
  timezone: z.enum(timezoneIds),
  taxRate: z.number().min(0).max(100),
  taxes: z.array(taxDefinitionSchema),
  receiptFooter: z.string().max(500).nullable().optional().or(z.literal('')),
  defaultPaymentMethods: z
    .array(z.enum(paymentMethodValues))
    .min(1, 'At least one default payment method is required'),
  showLogoOnReceipt: z.boolean().or(z.literal(0).or(z.literal(1))),
  showQrOnReceipt: z.boolean().or(z.literal(0).or(z.literal(1))),
})

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
export type TaxDefinition = z.infer<typeof taxDefinitionSchema>
