import { z } from 'zod'

export const saleItemSchema = z.object({
  // Item name is required. The previous default of `'Item'` silently
  // saved an empty line entry when the form was submitted blank.
  name: z
    .string()
    .trim()
    .min(1, 'Item name is required')
    .max(200, 'Item name must be 200 characters or fewer'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  price: z.number().min(0, 'Price must be non-negative'),
  subtotal: z.number().min(0, 'Subtotal must be non-negative'),
})

export const taxItemSchema = z.object({
  name: z.string().min(1).max(50),
  rate: z.number().min(0).max(100),
  amount: z.number().min(0),
})

export type TaxItem = z.infer<typeof taxItemSchema>

export const createSaleSchema = z.object({
  customerName: z.string().max(200).optional().or(z.literal('')),
  customerPhone: z.string().max(50).optional().or(z.literal('')),
  customerId: z.string().optional().or(z.literal('')),
  /**
   * Optional custom receipt / invoice number. When provided it is used
   * as the sale's `saleNumber` (subject to a uniqueness check within the
   * tenant); when blank the sale number is auto-generated.
   */
  receiptNumber: z.string().max(50).optional().or(z.literal('')),
  /** Optional waybill / delivery note number. */
  waybillNo: z.string().max(100).optional().or(z.literal('')),
  /** Optional company / PO reference number. */
  companyRefNo: z.string().max(100).optional().or(z.literal('')),
  /** Optional vehicle registration number. */
  carNo: z.string().max(100).optional().or(z.literal('')),
  /** The date the sale took place, `yyyy-mm-dd`. Blank defaults to today. */
  saleDate: z.string().max(50).optional().or(z.literal('')),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  /**
   * The following five fields are computed server-side from `items` +
   * `discountPercent` + `taxItems`. They're optional in the schema so
   * the client form's react-hook-form resolver doesn't fail on the
   * fields that aren't registered as inputs; the action recomputes
   * and overwrites them.
   */
  subtotal: z.number().min(0).optional(),
  /** Discount as a percentage of the subtotal (e.g. 10 for 10%). 0 = no discount. */
  discountPercent: z.number().min(0).max(100).default(0),
  /** Computed discount amount in the tenant's currency. */
  discount: z.number().min(0).default(0),
  /** Sum of all tax lines. */
  tax: z.number().min(0).default(0),
  /** Per-tax breakdown (NHIS, VAT, GET Fund, ...). Empty array = no taxes. */
  taxItems: z.array(taxItemSchema).default([]),
  /** Total — recomputed server-side. Optional so the form passes. */
  total: z.number().positive('Sale total must be greater than zero').optional(),
  /** Amount paid at sale time. Defaults to total (paid in full). */
  amountPaid: z.number().min(0).default(0),
  paymentMethod: z.string().max(50).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export type CreateSaleInput = z.infer<typeof createSaleSchema>

export interface Sale {
  id: string
  saleNumber: string
  receiptNumber?: string
  waybillNo?: string
  companyRefNo?: string
  carNo?: string
  /** The date the sale took place (`yyyy-mm-dd`). */
  saleDate?: string
  customerName?: string
  customerPhone?: string
  customerId?: string
  items: Array<{
    id?: string
    name: string
    quantity: number
    price: number
    subtotal: number
  }>
  subtotal: number
  discountPercent: number
  discount: number
  tax: number
  taxItems: TaxItem[]
  total: number
  amountPaid: number
  amountOwed: number
  paymentMethod: string
  notes?: string
  createdAt: string
  updatedAt: string
  /** Signed public token for unguessable share links. */
  publicToken?: string
}
