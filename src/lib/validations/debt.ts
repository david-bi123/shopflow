import { z } from 'zod'

export const debtPaymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  /** Positive amount being paid toward the debt. */
  amount: z.number().min(0.01, 'Amount must be greater than zero'),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export type DebtPaymentInput = z.infer<typeof debtPaymentSchema>

/**
 * Payment recorded against ONE specific sale from the sale-detail page.
 * The customer is derived from the sale, so it's not part of the input.
 */
export const salePaymentSchema = z.object({
  /** Positive amount being paid toward this sale. */
  amount: z.number().min(0.01, 'Amount must be greater than zero'),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export type SalePaymentInput = z.infer<typeof salePaymentSchema>
