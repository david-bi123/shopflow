import { z } from 'zod'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export interface TaxItem {
  name: string
  rate: number
  amount: number
}

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
  discountPercent: number
  discount: number
  tax: number
  taxItems: TaxItem[]
  total: number
  amountPaid: number
  amountOwed: number
  status: InvoiceStatus
  dueDate: string
  notes?: string
  createdAt: string
  createdBy: { name: string }
  currency?: string
  receiptFooter?: string
  tenant?: {
    id: string
    name: string
    slug: string
    phone?: string
    email?: string
    address?: string
    description?: string
    taxNumber?: string
  }
  tenantId?: { id: string; name: string; slug: string }
}

export const invoiceItemSchema = z.object({
  name: z.string().max(200).default('Item'),
  description: z.string().max(500).optional().or(z.literal('')),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  price: z.number().min(0, 'Price must be non-negative'),
  total: z.number().min(0, 'Total must be non-negative'),
})

export const taxItemSchema = z.object({
  name: z.string().min(1).max(50),
  rate: z.number().min(0).max(100),
  amount: z.number().min(0),
})

export const createInvoiceSchema = z.object({
  customerId: z.string().optional().or(z.literal('')),
  customerName: z.string().max(200).optional().or(z.literal('')),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().max(50).optional().or(z.literal('')),
  customerAddress: z.string().max(500).optional().or(z.literal('')),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  subtotal: z.number().min(0),
  discountPercent: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  taxItems: z.array(taxItemSchema).default([]),
  total: z.number().min(0),
  amountPaid: z.number().min(0).default(0),
  dueDate: z.string().min(1, 'Due date is required'),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
})

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
