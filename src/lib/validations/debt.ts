import { z } from 'zod'

export const debtPaymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  /** Positive amount being paid toward the debt. */
  amount: z.number().min(0.01, 'Amount must be greater than zero'),
  paymentMethod: z.enum(['cash', 'card', 'mobile_money', 'bank_transfer', 'other']).default('cash'),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export type DebtPaymentInput = z.infer<typeof debtPaymentSchema>
