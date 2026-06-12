'use server'

import { revalidatePath } from 'next/cache'
import { dbConnect } from '@/lib/db/connect'
import { sales, customers, tenants, settings, debtLedger } from '@/lib/db/schema'
import { eq, and, or, like, sql, desc, count } from 'drizzle-orm'
import { toNum, serializeRow, serializeList } from '@/lib/db/helpers'
import { createSaleSchema, type TaxItem } from '@/lib/validations/sale'
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
  const tenantId = toNum(session.user.tenantId!)

  // Server-side recalc: trust the line items, derive totals.
  const items = validated.data.items.map(item => ({
    ...item,
    subtotal: Math.round(item.quantity * item.price * 100) / 100,
  }))
  const calculatedSubtotal = items.reduce((sum, i) => sum + i.subtotal, 0)

  // Discount is a percentage of the subtotal.
  const discountPercent = validated.data.discountPercent ?? 0
  const calculatedDiscount = Math.round(calculatedSubtotal * discountPercent) / 100
  const afterDiscount = Math.max(0, calculatedSubtotal - calculatedDiscount)

  // Taxes are an array of {name, rate, amount}. Recompute amounts from
  // the post-discount base so the rate is applied to the real taxable
  // amount (matches how Ghana GRA treats discounts).
  const taxItems: TaxItem[] = (validated.data.taxItems ?? []).map(t => ({
    name: t.name,
    rate: t.rate,
    amount: Math.round(afterDiscount * t.rate) / 100,
  }))
  const calculatedTax = Math.round(taxItems.reduce((sum, t) => sum + t.amount, 0) * 100) / 100

  const calculatedTotal = Math.round((afterDiscount + calculatedTax) * 100) / 100

  // Debt handling: amountPaid defaults to total (paid in full). If the
  // customer paid less, the difference becomes a debt.
  const amountPaid = Math.min(calculatedTotal, validated.data.amountPaid ?? calculatedTotal)
  const amountOwed = Math.max(0, Math.round((calculatedTotal - amountPaid) * 100) / 100)
  const now = new Date().toISOString()

  const saleNumber = await getNextSaleNumber(tenantId)

  // Resolve the customer to attribute the debt to. We prefer the explicit
  // customerId; otherwise we look up by name (matching the existing logic).
  let debtorCustomerId: number | null = null
  if (validated.data.customerId) {
    debtorCustomerId = toNum(validated.data.customerId)
  } else if (validated.data.customerName) {
    const [existing] = await db.select().from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.name, validated.data.customerName)))
      .limit(1)
    if (existing) debtorCustomerId = existing.id
  }

  const result = await db.insert(sales).values({
    tenantId,
    saleNumber,
    customerName: (data.customerName as string | undefined) ?? null,
    customerPhone: (data.customerPhone as string | undefined) ?? null,
    customerId: debtorCustomerId,
    items,
    subtotal: calculatedSubtotal,
    discountPercent,
    discount: calculatedDiscount,
    tax: calculatedTax,
    taxItems,
    total: calculatedTotal,
    amountPaid,
    amountOwed,
    paymentMethod: validated.data.paymentMethod as 'cash' | 'card' | 'mobile_money' | 'bank_transfer' | 'other',
    notes: (data.notes as string | undefined) ?? null,
    createdBy: toNum(session.user.id),
    createdAt: now,
    updatedAt: now,
  })
  const [sale] = await db.select().from(sales).where(eq(sales.id, result[0].insertId))

  if (debtorCustomerId) {
    await db.update(customers)
      .set({
        totalSales: sql`${customers.totalSales} + 1`,
        totalRevenue: sql`${customers.totalRevenue} + ${calculatedTotal}`,
      })
      .where(eq(customers.id, debtorCustomerId))
  } else if (data.customerName) {
    // Walk-in / first-time customer. We create the row so the debt can
    // be attributed to it.
    const ts = now
    const ins = await db.insert(customers).values({
      tenantId,
      name: data.customerName,
      phone: data.customerPhone || null,
      createdBy: toNum(session.user.id),
      createdAt: ts,
      updatedAt: ts,
    }).$returningId()
    const newCustomerId = ins[0].id
    debtorCustomerId = newCustomerId
    // Backfill the FK on the sale so future reads link the two.
    await db.update(sales).set({ customerId: newCustomerId }).where(eq(sales.id, sale.id))
  }

  // Write a debt_ledger entry whenever the customer didn't pay in full,
  // and bump their cached totalDebt.
  if (amountOwed > 0 && debtorCustomerId) {
    const [last] = await db.select({ balance: debtLedger.balanceAfter })
      .from(debtLedger)
      .where(and(
        eq(debtLedger.tenantId, tenantId),
        eq(debtLedger.customerId, debtorCustomerId),
      ))
      .orderBy(desc(debtLedger.createdAt), desc(debtLedger.id))
      .limit(1)
    const previousBalance = last?.balance ?? 0
    const newBalance = Math.round((previousBalance + amountOwed) * 100) / 100
    await db.insert(debtLedger).values({
      tenantId,
      customerId: debtorCustomerId,
      amount: amountOwed,
      type: 'sale_created',
      referenceType: 'sale',
      referenceId: sale.id,
      notes: `Sale ${saleNumber} \u2014 paid ${amountPaid} of ${calculatedTotal}`,
      balanceAfter: newBalance,
      createdBy: toNum(session.user.id),
      createdAt: now,
    })
    await db.update(customers).set({
      totalDebt: newBalance,
      firstDebtAt: sql`COALESCE(${customers.firstDebtAt}, ${now})`,
      lastDebtActivityAt: now,
    }).where(eq(customers.id, debtorCustomerId))
  }

  await createAuditLog({
    tenantId,
    action: 'sale.created',
    entity: 'Sale',
    entityId: String(sale.id),
    performedBy: toNum(session.user.id),
    performedByName: session.user.name || 'Unknown',
    details: { saleNumber, total: calculatedTotal, amountPaid, amountOwed },
  })

  await createNotification({
    tenantId,
    userId: toNum(session.user.id),
    type: 'sale.created',
    title: 'Sale Created',
    message: amountOwed > 0
      ? `Sale #${saleNumber} \u2014 ${amountOwed} still owed`
      : `Sale #${saleNumber} for ${data.total} has been created`,
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
      discountPercent: sales.discountPercent,
      discount: sales.discount,
      tax: sales.tax,
      taxItems: sales.taxItems,
      total: sales.total,
      amountPaid: sales.amountPaid,
      amountOwed: sales.amountOwed,
      paymentMethod: sales.paymentMethod,
      notes: sales.notes,
      createdBy: sales.createdBy,
      createdAt: sales.createdAt,
      updatedAt: sales.updatedAt,
      currency: settings.currency,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
      storeName: settings.storeName,
      storePhone: settings.storePhone,
      storeEmail: settings.storeEmail,
      storeAddress: settings.storeAddress,
      storeDescription: settings.storeDescription,
      taxNumber: settings.taxNumber,
      receiptFooter: settings.receiptFooter,
    })
    .from(sales)
    .leftJoin(tenants, eq(sales.tenantId, tenants.id))
    .leftJoin(settings, eq(sales.tenantId, settings.tenantId))
    .where(eq(sales.saleNumber, saleNumber))
    .limit(1)

  if (!row) return null

  return {
    ...(serializeRow(row as unknown as Record<string, unknown>) as Record<string, unknown>),
    tenant: {
      name: row.storeName || row.tenantName || 'Store',
      slug: row.tenantSlug || '',
      phone: row.storePhone || '',
      email: row.storeEmail || '',
      address: row.storeAddress || '',
      description: row.storeDescription || '',
      taxNumber: row.taxNumber || '',
    },
  }
}
