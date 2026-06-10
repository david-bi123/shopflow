import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  sku: z.string().max(100).optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  price: z.coerce.number().min(0, 'Price must be 0 or more'),
  costPrice: z.coerce.number().min(0, 'Cost price must be 0 or more').default(0),
  stockQuantity: z.coerce.number().int().min(0, 'Stock must be 0 or more').default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(10),
  category: z.string().max(100).optional().or(z.literal('')),
  unit: z.string().max(50).default('pcs'),
  barcode: z.string().max(100).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active'),
})

export const updateProductSchema = createProductSchema.partial()

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
