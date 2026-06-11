import { z } from 'zod'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export interface Invoice {
  id: string
  invoiceNumber: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  customerAddress?: string
  items: Array<{
    name: string
    description?: string
    quantity: number
    price: number
    total: number
  }>
  subtotal: number
  discount: number
  tax: number
  total: number
  status: InvoiceStatus
  dueDate: string
  notes?: string
  createdAt: string
  createdBy: { name: string }
  currency?: string
  receiptFooter?: string
  tenant?: { id: string; name: string; slug: string; phone?: string; email?: string; address?: string }
  tenantId?: { id: string; name: string; slug: string }
}

export const invoiceItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(200),
  description: z.string().max(500).optional().or(z.literal('')),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  price: z.number().min(0, 'Price must be non-negative'),
  total: z.number().min(0, 'Total must be non-negative'),
})

export const createInvoiceSchema = z.object({
  customerId: z.string().optional().or(z.literal('')),
  customerName: z.string().min(1, 'Customer name is required').max(200),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().max(50).optional().or(z.literal('')),
  customerAddress: z.string().max(500).optional().or(z.literal('')),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  total: z.number().min(0),
  dueDate: z.string().min(1, 'Due date is required'),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
})

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
