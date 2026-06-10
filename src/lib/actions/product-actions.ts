'use server'

import { revalidatePath } from 'next/cache'
import { dbConnect } from '@/lib/db/connect'
import { products, auditLogs } from '@/lib/db/schema'
import { eq, and, or, like, desc, count, asc } from 'drizzle-orm'
import { toNum, serializeRow, serializeList } from '@/lib/db/helpers'
import { createProductSchema, updateProductSchema } from '@/lib/validations/product'
import { auth } from '@/lib/auth/auth'
import type { CreateProductInput } from '@/lib/validations/product'

export async function getProducts(params: {
  search?: string
  category?: string
  status?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}): Promise<{ data: any[]; total: number; pages: number }> {
  const session = await auth()
  if (!session?.user) return { data: [], total: 0, pages: 0 }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)
  const { search, category, status, page = 1, pageSize = 20, sortBy = 'createdAt', sortOrder = 'desc' } = params

  const conditions = [eq(products.tenantId, tenantId)]

  if (search) {
    const searchCondition = or(
      like(products.name, `%${search}%`),
      like(products.sku, `%${search}%`),
    )
    if (searchCondition) conditions.push(searchCondition)
  }

  if (category) {
    conditions.push(eq(products.category, category))
  }

  if (status) {
    conditions.push(eq(products.status, status))
  }

  const whereClause = and(...conditions)

  const [totalResult] = await db.select({ total: count() }).from(products).where(whereClause)
  const total = totalResult?.total ?? 0

  const sortColumn = (products as any)[sortBy] ?? products.createdAt
  const orderFn = sortOrder === 'asc' ? asc : desc

  const result = await db.select().from(products)
    .where(whereClause)
    .orderBy(orderFn(sortColumn))
    .offset((page - 1) * pageSize)
    .limit(pageSize)

  return {
    data: serializeList(result as unknown as Record<string, unknown>[]),
    total,
    pages: Math.ceil(total / pageSize),
  }
}

export async function getProduct(id: number): Promise<any | null> {
  const session = await auth()
  if (!session?.user) return null

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)

  const [product] = await db.select().from(products)
    .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
    .limit(1)

  return product ? serializeRow(product as unknown as Record<string, unknown>) : null
}

export async function createProduct(data: any): Promise<{ error?: string; product?: any }> {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const validated = createProductSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0].message }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)
  const userId = toNum(session.user.id)
  const now = new Date().toISOString()

  const result = await db.insert(products).values({
    tenantId,
    ...validated.data,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  })

  const [product] = await db.select().from(products).where(eq(products.id, result[0].insertId))

  await db.insert(auditLogs).values({
    tenantId,
    action: 'create',
    entity: 'product',
    entityId: String(result[0].insertId),
    performedBy: userId,
    performedByName: session.user.name ?? 'Unknown',
    details: { name: validated.data.name },
    createdAt: now,
  })

  revalidatePath('/dashboard/products')
  return { product: serializeRow(product as unknown as Record<string, unknown>) }
}

export async function updateProduct(id: number, data: any): Promise<{ error?: string; product?: any }> {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const validated = updateProductSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0].message }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)
  const now = new Date().toISOString()

  await db.update(products).set({
    ...validated.data,
    updatedAt: now,
  }).where(and(eq(products.id, id), eq(products.tenantId, tenantId)))

  const [product] = await db.select().from(products).where(and(eq(products.id, id), eq(products.tenantId, tenantId)))

  if (!product) return { error: 'Product not found' }

  await db.insert(auditLogs).values({
    tenantId,
    action: 'update',
    entity: 'product',
    entityId: String(id),
    performedBy: toNum(session.user.id),
    performedByName: session.user.name ?? 'Unknown',
    details: { name: product.name },
    createdAt: now,
  })

  revalidatePath('/dashboard/products')
  return { product: serializeRow(product as unknown as Record<string, unknown>) }
}

export async function deleteProduct(id: number): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)
  const now = new Date().toISOString()

  const [product] = await db.select().from(products)
    .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))

  if (!product) return { error: 'Product not found' }

  await db.delete(products).where(and(eq(products.id, id), eq(products.tenantId, tenantId)))

  await db.insert(auditLogs).values({
    tenantId,
    action: 'delete',
    entity: 'product',
    entityId: String(id),
    performedBy: toNum(session.user.id),
    performedByName: session.user.name ?? 'Unknown',
    details: { name: product.name },
    createdAt: now,
  })

  revalidatePath('/dashboard/products')
  return {}
}

export async function getProductCategories(): Promise<string[]> {
  const session = await auth()
  if (!session?.user) return []

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)

  const result = await db.select({ category: products.category })
    .from(products)
    .where(eq(products.tenantId, tenantId))
    .groupBy(products.category)

  return result.map((r) => r.category!).filter(Boolean)
}

export async function getLowStockProducts(): Promise<any[]> {
  const session = await auth()
  if (!session?.user) return []

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)

  const result = await db.select().from(products)
    .where(and(
      eq(products.tenantId, tenantId),
      eq(products.status, 'active'),
    ))
    .orderBy(asc(products.stockQuantity))

  return serializeList(
    result.filter((p) => p.stockQuantity <= p.lowStockThreshold) as unknown as Record<string, unknown>[]
  )
}
