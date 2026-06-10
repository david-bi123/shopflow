import { z } from 'zod'

export const saleItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(200),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  price: z.number().min(0, 'Price must be non-negative'),
  subtotal: z.number().min(0, 'Subtotal must be non-negative'),
  productId: z.number().int().optional(),
})

export const createSaleSchema = z.object({
  customerName: z.string().max(200).optional().or(z.literal('')),
  customerPhone: z.string().max(50).optional().or(z.literal('')),
  customerId: z.string().optional().or(z.literal('')),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  total: z.number().min(0),
  paymentMethod: z.enum(['cash', 'card', 'mobile_money', 'bank_transfer', 'other']),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export const updateSaleSchema = createSaleSchema.partial()

export type CreateSaleInput = z.infer<typeof createSaleSchema>

export interface Sale {
  id: string
  saleNumber: string
  customerName?: string
  customerPhone?: string
  customerId?: string
  items: Array<{
    id?: string
    name: string
    quantity: number
    price: number
    subtotal: number
    productId?: number
  }>
  subtotal: number
  discount: number
  tax: number
  total: number
  paymentMethod: string
  notes?: string
  createdAt: string
  updatedAt: string
}
