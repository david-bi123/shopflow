'use server'

import { revalidatePath } from 'next/cache'
import { dbConnect } from '@/lib/db/connect'
import { sales, customers, tenants, settings } from '@/lib/db/schema'
import { eq, and, or, like, sql, desc, count } from 'drizzle-orm'
import { toNum, serializeRow, serializeList } from '@/lib/db/helpers'
import { createSaleSchema } from '@/lib/validations/sale'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/roles'
import { getNextSaleNumber } from '@/lib/services/counter'
import { createAuditLog } from '@/lib/services/audit'
import { createNotification } from '@/lib/services/notification'
import type { CreateSaleInput } from '@/lib/validations/sale'

export async function createSale(data: CreateSaleInput) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  if (!hasPermission(session.user.role, PERMISSIONS.sales.create)) return { error: 'Forbidden' }

  const validated = createSaleSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0].message }

  const db = await dbConnect()

  // Recalculate totals server-side for security
  const items = validated.data.items.map(item => ({
    ...item,
    subtotal: Math.round(item.quantity * item.price * 100) / 100,
  }))
  const calculatedSubtotal = items.reduce((sum, i) => sum + i.subtotal, 0)
  const calculatedTotal = calculatedSubtotal - validated.data.discount + validated.data.tax

  const saleNumber = await getNextSaleNumber(toNum(session.user.tenantId!))

  const result = await db.insert(sales).values({
    tenantId: toNum(session.user.tenantId!),
    saleNumber,
    customerName: data.customerName || undefined,
    customerPhone: data.customerPhone || undefined,
    customerId: data.customerId ? toNum(data.customerId) : undefined,
    items,
    subtotal: calculatedSubtotal,
    discount: validated.data.discount ?? 0,
    tax: validated.data.tax ?? 0,
    total: calculatedTotal,
    paymentMethod: validated.data.paymentMethod,
    notes: data.notes || undefined,
    createdBy: toNum(session.user.id),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  const [sale] = await db.select().from(sales).where(eq(sales.id, result[0].insertId))

  if (data.customerId) {
    await db.update(customers).set({
      totalSales: sql`${customers.totalSales} + 1`,
      totalRevenue: sql`${customers.totalRevenue} + ${calculatedTotal}`,
    }).where(eq(customers.id, toNum(data.customerId)))
  }

  if (data.customerName && !data.customerId) {
    const [existing] = await db.select().from(customers).where(
      and(
        eq(customers.tenantId, toNum(session.user.tenantId!)),
        eq(customers.name, data.customerName)
      )
    ).limit(1)

    if (existing) {
      await db.update(customers).set({
        totalSales: sql`${customers.totalSales} + 1`,
        totalRevenue: sql`${customers.totalRevenue} + ${calculatedTotal}`,
      }).where(eq(customers.id, existing.id))
    }
  }

  await createAuditLog({
    tenantId: toNum(session.user.tenantId!),
    action: 'sale.created',
    entity: 'Sale',
    entityId: String(sale.id),
    performedBy: toNum(session.user.id),
    performedByName: session.user.name || 'Unknown',
    details: { saleNumber, total: calculatedTotal },
  })

  await createNotification({
    tenantId: toNum(session.user.tenantId!),
    userId: toNum(session.user.id),
    type: 'sale.created',
    title: 'Sale Created',
    message: `Sale #${saleNumber} for ${data.total} has been created`,
    link: `/sales/${sale.id}`,
  })

  revalidatePath('/sales')
  return { success: true, sale: serializeRow(sale) }
}

export async function getSales(page = 1, limit = 20, filters?: Record<string, string>) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()

  const conditions = [eq(sales.tenantId, toNum(session.user.tenantId!))]

  if (filters?.search) {
    const searchCondition = or(
      like(sales.saleNumber, `%${filters.search}%`),
      like(sales.customerName, `%${filters.search}%`)
    )
    if (searchCondition) conditions.push(searchCondition)
  }

  if (filters?.paymentMethod) {
    conditions.push(eq(sales.paymentMethod, filters.paymentMethod as 'cash' | 'card' | 'mobile_money' | 'bank_transfer' | 'other'))
  }

  if (filters?.startDate) {
    conditions.push(sql`${sales.createdAt} >= ${filters.startDate}`)
  }

  if (filters?.endDate) {
    conditions.push(sql`${sales.createdAt} <= ${filters.endDate}`)
  }

  const where = and(...conditions)

  const [totalResult] = await db.select({ count: count() }).from(sales).where(where)
  const total = totalResult?.count ?? 0

  const salesList = await db.select().from(sales)
    .where(where)
    .orderBy(desc(sales.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)

  return {
    sales: serializeList(salesList),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function getSaleById(id: string) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()

  const [sale] = await db.select().from(sales).where(
    and(eq(sales.id, toNum(id)), eq(sales.tenantId, toNum(session.user.tenantId!)))
  ).limit(1)

  if (!sale) return { error: 'Sale not found' }

  return { sale: serializeRow(sale) }
}

export async function deleteSale(id: string) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  if (!hasPermission(session.user.role, PERMISSIONS.sales.delete)) return { error: 'Forbidden' }

  const db = await dbConnect()

  const [sale] = await db.select().from(sales).where(
    and(eq(sales.id, toNum(id)), eq(sales.tenantId, toNum(session.user.tenantId!)))
  )
  await db.delete(sales).where(
    and(eq(sales.id, toNum(id)), eq(sales.tenantId, toNum(session.user.tenantId!)))
  )

  if (!sale) return { error: 'Sale not found' }

  await createAuditLog({
    tenantId: toNum(session.user.tenantId!),
    action: 'sale.deleted',
    entity: 'Sale',
    entityId: id,
    performedBy: toNum(session.user.id),
    performedByName: session.user.name || 'Unknown',
    details: { saleNumber: sale.saleNumber },
  })

  revalidatePath('/sales')
  return { success: true }
}

export async function getSaleByNumber(saleNumber: string) {
  const db = await dbConnect()

  const [row] = await db
    .select({
      id: sales.id,
      tenantId: sales.tenantId,
      saleNumber: sales.saleNumber,
      customerName: sales.customerName,
      customerPhone: sales.customerPhone,
      customerId: sales.customerId,
      items: sales.items,
      subtotal: sales.subtotal,
      discount: sales.discount,
      tax: sales.tax,
      total: sales.total,
      paymentMethod: sales.paymentMethod,
      notes: sales.notes,
      createdBy: sales.createdBy,
      createdAt: sales.createdAt,
      updatedAt: sales.updatedAt,
      currency: settings.currency,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
      tenantPhone: settings.storePhone,
      tenantEmail: settings.storeEmail,
      tenantAddress: settings.storeAddress,
    })
    .from(sales)
    .leftJoin(tenants, eq(sales.tenantId, tenants.id))
    .leftJoin(settings, eq(sales.tenantId, settings.tenantId))
    .where(eq(sales.saleNumber, saleNumber))
    .limit(1)

  if (!row) return null

  return {
    ...(serializeRow(row as unknown as Record<string, unknown>) as Record<string, unknown>),
    currency: row.currency || 'GHS',
    tenant: {
      name: row.tenantName || 'Store',
      slug: row.tenantSlug || '',
      phone: row.tenantPhone || '',
      email: row.tenantEmail || '',
      address: row.tenantAddress || '',
    },
  }
}
