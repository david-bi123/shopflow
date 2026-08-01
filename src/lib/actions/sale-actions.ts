'use server'

import { revalidatePath } from 'next/cache'
import { dbConnect } from '@/lib/db/connect'
import { sales, customers, tenants, settings, debtLedger } from '@/lib/db/schema'
import { eq, and, or, like, sql, desc, count, asc, isNull } from 'drizzle-orm'
import { toNum, serializeRow, serializeList } from '@/lib/db/helpers'
import { createSaleSchema, type TaxItem } from '@/lib/validations/sale'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/roles'
import { getNextSaleNumber } from '@/lib/services/counter'
import { createAuditLog } from '@/lib/services/audit'
import { createNotification } from '@/lib/services/notification'
import { actionHandler } from '@/lib/utils/action-handler'
import { actionOk } from '@/lib/utils/action-result'
import { buildPublicToken, verifyPublicToken } from '@/lib/services/public-token'
import type { CreateSaleInput } from '@/lib/validations/sale'

export async function createSale(data: CreateSaleInput) {
  return actionHandler('createSale', { data }, async () => {
    const session = await auth()
    if (!session?.user) return { error: 'Unauthorized' }
    if (!hasPermission(session.user.role, PERMISSIONS.sales.create)) return { error: 'Forbidden' }

    const validated = createSaleSchema.safeParse(data)
    if (!validated.success) {
      const first = validated.error.issues[0]
      const path = (first.path ?? []).join('.')
      return { error: path ? `${path}: ${first.message}` : first.message }
    }

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

  // Optional manual receipt/invoice number. When the user types one in
  // the sale form we honour it as the sale number, but only if it doesn't
  // collide with an existing number in this shop. Otherwise auto-generate.
  const manualNumber = (validated.data.receiptNumber ?? '').trim()
  let saleNumber: string
  if (manualNumber) {
    const [collision] = await db
      .select({ id: sales.id })
      .from(sales)
      .where(and(eq(sales.tenantId, tenantId), eq(sales.saleNumber, manualNumber)))
      .limit(1)
    if (collision) {
      return { error: `A receipt with number "${manualNumber}" already exists` }
    }
    saleNumber = manualNumber
  } else {
    saleNumber = await getNextSaleNumber(tenantId)
  }
  const userId = toNum(session.user.id)

  // The sale row, debt ledger, and cached customer balance must be
  // committed together. If any step fails, the whole thing rolls back so
  // the ledger stays consistent with `customers.totalDebt`.
  const sale = await db.transaction(async (tx) => {
    // Resolve the debtor customer inside the transaction so the lookup +
    // insert (for walk-ins) are consistent.
    let debtorCustomerId: number | null = null
    if (validated.data.customerId) {
      debtorCustomerId = toNum(validated.data.customerId)
    } else if (validated.data.customerName) {
      const [existing] = await tx.select().from(customers)
        .where(and(
          eq(customers.tenantId, tenantId),
          eq(customers.name, validated.data.customerName),
          isNull(customers.deletedAt),
        ))
        .limit(1)
      if (existing) debtorCustomerId = existing.id
    }

    const inserted = await tx.insert(sales).values({
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
      waybillNo: (data.waybillNo as string | undefined)?.trim() || null,
      companyRefNo: (data.companyRefNo as string | undefined)?.trim() || null,
      carNo: (data.carNo as string | undefined)?.trim() || null,
      // The sale's actual date, editable by the user. Blank defaults to
      // the day the sale was recorded.
      saleDate: (data.saleDate as string | undefined)?.trim() || now.slice(0, 10),
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    const [newSale] = await tx.select().from(sales).where(eq(sales.id, inserted[0].insertId))

    if (debtorCustomerId) {
      await tx.update(customers)
        .set({
          totalSales: sql`${customers.totalSales} + 1`,
          totalRevenue: sql`${customers.totalRevenue} + ${calculatedTotal}`,
        })
        .where(eq(customers.id, debtorCustomerId))
    } else if (data.customerName) {
      // Walk-in / first-time customer. We create the row so the debt can
      // be attributed to it.
      const ins = await tx.insert(customers).values({
        tenantId,
        name: data.customerName,
        phone: data.customerPhone || null,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      }).$returningId()
      const newCustomerId = ins[0].id
      debtorCustomerId = newCustomerId
      // Backfill the FK on the sale so future reads link the two.
      await tx.update(sales).set({ customerId: newCustomerId }).where(eq(sales.id, newSale.id))
    }

    // Write a debt_ledger entry whenever the customer didn't pay in full,
    // and bump their cached totalDebt.
    if (amountOwed > 0 && debtorCustomerId) {
      const [last] = await tx.select({ balance: debtLedger.balanceAfter })
        .from(debtLedger)
        .where(and(
          eq(debtLedger.tenantId, tenantId),
          eq(debtLedger.customerId, debtorCustomerId),
        ))
        .orderBy(desc(debtLedger.createdAt), desc(debtLedger.id))
        .limit(1)
      const previousBalance = last?.balance ?? 0
      const newBalance = Math.round((previousBalance + amountOwed) * 100) / 100
      await tx.insert(debtLedger).values({
        tenantId,
        customerId: debtorCustomerId,
        amount: amountOwed,
        type: 'sale_created',
        referenceType: 'sale',
        referenceId: newSale.id,
        notes: `Sale ${saleNumber} \u2014 paid ${amountPaid} of ${calculatedTotal}`,
        balanceAfter: newBalance,
        createdBy: userId,
        createdAt: now,
      })
      await tx.update(customers).set({
        totalDebt: newBalance,
        firstDebtAt: sql`COALESCE(${customers.firstDebtAt}, ${now})`,
        lastDebtActivityAt: now,
      }).where(eq(customers.id, debtorCustomerId))
    }

    return newSale
  })

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
  return actionOk(serializeRow(sale))
  })
}

export async function getSales(page = 1, limit = 20, filters?: Record<string, string>) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()
  const conditions = [eq(sales.tenantId, toNum(session.user.tenantId!))]

  if (filters?.search) {
    const term = `%${filters.search}%`
    // Match against sale number, customer name, OR any line item name
    // inside the JSON items array. The CAST-to-CHAR LIKE pattern is the
    // most reliable cross-version MySQL way to substring-match inside a
    // JSON column without needing a generated column / fulltext index.
    const searchCondition = or(
      like(sales.saleNumber, term),
      like(sales.customerName, term),
      sql`CAST(${sales.items} AS CHAR) LIKE ${term}`,
    )
    if (searchCondition) conditions.push(searchCondition)
  }
  if (filters?.paymentMethod) {
    conditions.push(eq(sales.paymentMethod, filters.paymentMethod as 'cash' | 'card' | 'mobile_money' | 'bank_transfer' | 'other'))
  }
  if (filters?.startDate) {
    conditions.push(sql`COALESCE(${sales.saleDate}, LEFT(${sales.createdAt}, 10)) >= ${filters.startDate}`)
  }
  if (filters?.endDate) {
    conditions.push(sql`COALESCE(${sales.saleDate}, LEFT(${sales.createdAt}, 10)) <= ${filters.endDate}`)
  }

  const where = and(...conditions)
  const [totalResult] = await db.select({ count: count() }).from(sales).where(where)
  const total = totalResult?.count ?? 0

  const salesList = await db.select().from(sales)
    .where(where)
    .orderBy(sql`COALESCE(${sales.saleDate}, LEFT(${sales.createdAt}, 10)) DESC`, desc(sales.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)

  return {
    sales: serializeList(salesList).map((s) => ({
      ...s,
      publicToken: buildPublicToken({ t: 's', tn: toNum(s.tenantId), id: toNum(s.id) }),
    })),
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

  const serialized = serializeRow(sale) as Record<string, unknown>
  return {
    sale: {
      ...serialized,
      publicToken: buildPublicToken({ t: 's', tn: toNum(serialized.tenantId as string), id: toNum(serialized.id as string) }),
    },
  }
}

/**
 * Update an existing sale. Reverses the old debt attribution (if any)
 * and re-applies it from scratch based on the new amount paid.
 */
export async function updateSale(id: string, data: CreateSaleInput) {
  return actionHandler('updateSale', { id, data }, async () => {
    const session = await auth()
    if (!session?.user) return { error: 'Unauthorized' }
    if (!hasPermission(session.user.role, PERMISSIONS.sales.update)) return { error: 'Forbidden' }

    const validated = createSaleSchema.safeParse(data)
    if (!validated.success) {
      const first = validated.error.issues[0]
      const path = (first.path ?? []).join('.')
      return { error: path ? `${path}: ${first.message}` : first.message }
    }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)
  const userId = toNum(session.user.id)
  const saleId = toNum(id)

  // Recompute totals
  const items = validated.data.items.map(item => ({
    ...item,
    subtotal: Math.round(item.quantity * item.price * 100) / 100,
  }))
  const calculatedSubtotal = items.reduce((sum, i) => sum + i.subtotal, 0)
  const discountPercent = validated.data.discountPercent ?? 0
  const calculatedDiscount = Math.round(calculatedSubtotal * discountPercent) / 100
  const afterDiscount = Math.max(0, calculatedSubtotal - calculatedDiscount)
  const taxItems: TaxItem[] = (validated.data.taxItems ?? []).map(t => ({
    name: t.name,
    rate: t.rate,
    amount: Math.round(afterDiscount * t.rate) / 100,
  }))
  const calculatedTax = Math.round(taxItems.reduce((sum, t) => sum + t.amount, 0) * 100) / 100
  const calculatedTotal = Math.round((afterDiscount + calculatedTax) * 100) / 100
  const amountPaid = Math.max(0, Math.min(calculatedTotal, validated.data.amountPaid ?? calculatedTotal))
  const amountOwed = Math.max(0, Math.round((calculatedTotal - amountPaid) * 100) / 100)
  const now = new Date().toISOString()

  // Load the old sale to capture the old debt attribution
  const [oldSale] = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, saleId), eq(sales.tenantId, tenantId)))
    .limit(1)
  if (!oldSale) return { error: 'Sale not found' }

  // Optional manual receipt/invoice number. On edit, only honour a change
  // if it doesn't collide with another sale in this shop.
  const manualNumber = (validated.data.receiptNumber ?? '').trim()
  let saleNumber = oldSale.saleNumber
  if (manualNumber && manualNumber !== oldSale.saleNumber) {
    const [collision] = await db
      .select({ id: sales.id })
      .from(sales)
      .where(and(eq(sales.tenantId, tenantId), eq(sales.saleNumber, manualNumber)))
      .limit(1)
    if (collision) {
      return { error: `A receipt with number "${manualNumber}" already exists` }
    }
    saleNumber = manualNumber
  }

  // Resolve the debtor customer: prefer explicit id, fall back to name lookup
  let debtorCustomerId: number | null = (oldSale.customerId as number | null) ?? null
  if (validated.data.customerId) {
    debtorCustomerId = toNum(validated.data.customerId)
    } else if (validated.data.customerName) {
      const [existing] = await db.select().from(customers)
        .where(and(
          eq(customers.tenantId, tenantId),
          eq(customers.name, validated.data.customerName),
          isNull(customers.deletedAt),
        ))
        .limit(1)
      if (existing) debtorCustomerId = existing.id
    }

  // All debt reversals + re-attributions + the sale update must commit
  // together. If we crash halfway, the ledger would no longer reconcile
  // with `customers.totalDebt`.
  await db.transaction(async (tx) => {
    // 1) Reverse the old debt attribution
    if ((oldSale.amountOwed ?? 0) > 0.01 && oldSale.customerId) {
      const [custRow] = await tx
        .select({ totalDebt: customers.totalDebt })
        .from(customers)
        .where(eq(customers.id, oldSale.customerId))
        .limit(1)
      const previousBalance = custRow?.totalDebt ?? 0
      const reversedBalance = Math.max(0, Math.round((previousBalance - (oldSale.amountOwed ?? 0)) * 100) / 100)
      await tx.insert(debtLedger).values({
        tenantId,
        customerId: oldSale.customerId,
        amount: -Math.abs(oldSale.amountOwed ?? 0),
        type: 'sale_voided',
        referenceType: 'sale',
        referenceId: saleId,
        notes: `Reversal: edited ${oldSale.saleNumber} (was owing ${oldSale.amountOwed?.toFixed(2)})`,
        balanceAfter: reversedBalance,
        createdBy: userId,
        createdAt: now,
      })
      await tx.update(customers)
        .set({ totalDebt: reversedBalance, lastDebtActivityAt: now })
        .where(eq(customers.id, oldSale.customerId))
    }

    // 2) Update the sale row
    await tx
      .update(sales)
      .set({
        saleNumber,
        customerName: (validated.data.customerName as string | undefined) ?? null,
        customerPhone: (validated.data.customerPhone as string | undefined) ?? null,
        customerId: debtorCustomerId as number | undefined,
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
        notes: (validated.data.notes as string | undefined) ?? null,
        waybillNo: (validated.data.waybillNo as string | undefined)?.trim() || null,
        companyRefNo: (validated.data.companyRefNo as string | undefined)?.trim() || null,
        carNo: (validated.data.carNo as string | undefined)?.trim() || null,
        // Editable sale date. Blank keeps the existing date; the form
        // always sends one, so this is mostly a safety net.
        saleDate: (validated.data.saleDate as string | undefined)?.trim()
          || oldSale.saleDate
          || now.slice(0, 10),
        updatedAt: now,
      })
      .where(and(eq(sales.id, saleId), eq(sales.tenantId, tenantId)))

    // 2.5) A new customer name entered on edit gets saved as a real
    // customer (same behaviour as creating a sale), so the debt can be
    // attributed to it and future sales can pick it from the picker.
    if (!debtorCustomerId && validated.data.customerName) {
      const ins = await tx.insert(customers).values({
        tenantId,
        name: validated.data.customerName,
        phone: validated.data.customerPhone || null,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      }).$returningId()
      debtorCustomerId = ins[0].id
      await tx.update(sales)
        .set({ customerId: debtorCustomerId })
        .where(and(eq(sales.id, saleId), eq(sales.tenantId, tenantId)))
    }

    // 3) Apply the new debt attribution
    if (amountOwed > 0.01 && debtorCustomerId) {
      const [custRow] = await tx
        .select({ totalDebt: customers.totalDebt })
        .from(customers)
        .where(eq(customers.id, debtorCustomerId))
        .limit(1)
      const previousBalance = custRow?.totalDebt ?? 0
      const newBalance = Math.round((previousBalance + amountOwed) * 100) / 100
      await tx.insert(debtLedger).values({
        tenantId,
        customerId: debtorCustomerId,
        amount: amountOwed,
        type: 'sale_created',
        referenceType: 'sale',
        referenceId: saleId,
        notes: `Edit: ${oldSale.saleNumber} \u2014 paid ${amountPaid} of ${calculatedTotal}`,
        balanceAfter: newBalance,
        createdBy: userId,
        createdAt: now,
      })
      await tx.update(customers)
        .set({
          totalDebt: newBalance,
          firstDebtAt: sql`COALESCE(${customers.firstDebtAt}, ${now})`,
          lastDebtActivityAt: now,
        })
        .where(eq(customers.id, debtorCustomerId))
    }
  })

  await createAuditLog({
    tenantId,
    action: 'sale.updated',
    entity: 'Sale',
    entityId: id,
    performedBy: userId,
    performedByName: session.user.name || 'Unknown',
    details: { saleNumber: oldSale.saleNumber, total: calculatedTotal, amountPaid, amountOwed },
  })

  revalidatePath('/sales')
  revalidatePath(`/sales/${id}`)
  return actionOk({ id })
  })
}

export async function deleteSale(id: string) {
  return actionHandler('deleteSale', { id }, async () => {
    const session = await auth()
    if (!session?.user) return { error: 'Unauthorized' }
    if (!hasPermission(session.user.role, PERMISSIONS.sales.delete)) return { error: 'Forbidden' }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)
  const userId = toNum(session.user.id)
  const saleId = toNum(id)

  const [sale] = await db.select().from(sales).where(
    and(eq(sales.id, saleId), eq(sales.tenantId, tenantId))
  )
  if (!sale) return { error: 'Sale not found' }

  // Reverse the debt attribution (if any) and delete the sale atomically.
  await db.transaction(async (tx) => {
    if ((sale.amountOwed ?? 0) > 0.01 && sale.customerId) {
      const [custRow] = await tx
        .select({ totalDebt: customers.totalDebt })
        .from(customers)
        .where(eq(customers.id, sale.customerId))
        .limit(1)
      const previousBalance = custRow?.totalDebt ?? 0
      const reversed = Math.max(0, Math.round((previousBalance - (sale.amountOwed ?? 0)) * 100) / 100)
      const now = new Date().toISOString()
      await tx.insert(debtLedger).values({
        tenantId,
        customerId: sale.customerId,
        amount: -Math.abs(sale.amountOwed ?? 0),
        type: 'sale_voided',
        referenceType: 'sale',
        referenceId: saleId,
        notes: `Reversal: deleted ${sale.saleNumber} (was owing ${sale.amountOwed?.toFixed(2)})`,
        balanceAfter: reversed,
        createdBy: userId,
        createdAt: now,
      })
      await tx.update(customers)
        .set({ totalDebt: reversed, lastDebtActivityAt: now })
        .where(eq(customers.id, sale.customerId))
    }

    await tx.delete(sales).where(
      and(eq(sales.id, saleId), eq(sales.tenantId, tenantId))
    )
  })

  await createAuditLog({
    tenantId,
    action: 'sale.deleted',
    entity: 'Sale',
    entityId: id,
    performedBy: userId,
    performedByName: session.user.name || 'Unknown',
    details: { saleNumber: sale.saleNumber },
  })

  revalidatePath('/sales')
  return actionOk({})
  })
}

/**
 * Public, unauthenticated lookup by signed token.
 *
 * The token encodes `s.<tenantId>.<id>` plus an HMAC. We verify the HMAC
 * first (constant-time) and only then issue a single primary-key lookup.
 * If the HMAC doesn't match, the function returns `null` without ever
 * touching the database. Never throws.
 *
 * Also returns the payment history (debt_ledger entries linked to this
 * sale) so the public receipt can show updated payment status after
 * the customer pays toward their debt. All lookups are tenant-scoped
 * using the verified token payload — no cross-tenant leakage.
 */
export async function getSaleByPublicToken(token: string) {
  if (!token || typeof token !== 'string') return null
  const payload = verifyPublicToken(token)
  if (!payload || payload.t !== 's') return null

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
      waybillNo: sales.waybillNo,
      companyRefNo: sales.companyRefNo,
      carNo: sales.carNo,
      saleDate: sales.saleDate,
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
    .where(and(eq(sales.id, payload.id), eq(sales.tenantId, payload.tn)))
    .limit(1)

  if (!row) return null

  const history = await db
    .select({
      id: debtLedger.id,
      type: debtLedger.type,
      amount: debtLedger.amount,
      notes: debtLedger.notes,
      balanceAfter: debtLedger.balanceAfter,
      createdAt: debtLedger.createdAt,
    })
    .from(debtLedger)
    .where(and(
      eq(debtLedger.tenantId, payload.tn),
      eq(debtLedger.referenceType, 'sale'),
      eq(debtLedger.referenceId, payload.id),
    ))
    .orderBy(asc(debtLedger.createdAt), asc(debtLedger.id))

  return {
    ...(serializeRow(row as unknown as Record<string, unknown>) as Record<string, unknown>),
    paymentHistory: serializeList(history as unknown as Record<string, unknown>[]),
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
