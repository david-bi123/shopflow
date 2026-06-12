'use server'

import { revalidatePath } from 'next/cache'
import { dbConnect } from '@/lib/db/connect'
import { invoices, customers, users, tenants, settings, debtLedger } from '@/lib/db/schema'
import { eq, and, or, like, sql, desc } from 'drizzle-orm'
import { toNum, serializeRow } from '@/lib/db/helpers'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/roles'
import { getNextInvoiceNumber } from '@/lib/services/counter'
import { createAuditLog } from '@/lib/services/audit'
import { createNotification } from '@/lib/services/notification'
import { createInvoiceSchema, updateInvoiceStatusSchema } from '@/lib/validations/invoice'
import type { CreateInvoiceInput, InvoiceStatus, Invoice, TaxItem } from '@/lib/validations/invoice'

export async function createInvoice(data: CreateInvoiceInput) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  if (!hasPermission(session.user.role, PERMISSIONS.invoices.create)) return { error: 'Forbidden' }

  const validated = createInvoiceSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0].message }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)
  const createdBy = toNum(session.user.id)
  const invoiceNumber = await getNextInvoiceNumber(tenantId)

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

  const amountPaid = Math.min(calculatedTotal, validated.data.amountPaid ?? calculatedTotal)
  const amountOwed = Math.max(0, Math.round((calculatedTotal - amountPaid) * 100) / 100)
  const now = new Date().toISOString()

  const debtorCustomerId = data.customerId ? toNum(data.customerId) : null

  const result = await db.insert(invoices).values({
    tenantId,
    invoiceNumber,
    customerId: debtorCustomerId,
    customerName: data.customerName,
    customerEmail: data.customerEmail || null,
    customerPhone: data.customerPhone || null,
    customerAddress: data.customerAddress || null,
    items,
    subtotal: calculatedSubtotal,
    discountPercent,
    discount: calculatedDiscount,
    tax: calculatedTax,
    taxItems,
    total: calculatedTotal,
    amountPaid,
    amountOwed,
    dueDate: new Date(data.dueDate).toISOString(),
    notes: data.notes || null,
    createdBy,
    createdAt: now,
    updatedAt: now,
  })
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, result[0].insertId))

  if (debtorCustomerId) {
    await db.update(customers)
      .set({
        totalSales: sql`total_sales + 1`,
        totalRevenue: sql`total_revenue + ${calculatedTotal}`,
        updatedAt: now,
      })
      .where(eq(customers.id, debtorCustomerId))
  }

  // Debt attribution (only if customer is selected and amount not fully paid)
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
      type: 'invoice_created',
      referenceType: 'invoice',
      referenceId: invoice.id,
      notes: `Invoice ${invoiceNumber} \u2014 paid ${amountPaid} of ${calculatedTotal}`,
      balanceAfter: newBalance,
      createdBy,
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
    action: 'invoice.created',
    entity: 'Invoice',
    entityId: String(invoice.id),
    performedBy: createdBy,
    performedByName: session.user.name || 'Unknown',
    details: { invoiceNumber, total: calculatedTotal, amountPaid, amountOwed },
  })

  await createNotification({
    tenantId,
    userId: createdBy,
    type: 'invoice.created',
    title: 'Invoice Created',
    message: amountOwed > 0
      ? `Invoice #${invoiceNumber} \u2014 ${amountOwed} still owed`
      : `Invoice #${invoiceNumber} for ${data.total} has been created`,
    link: `/invoices/${invoice.id}`,
  })

  revalidatePath('/invoices')
  return { success: true, invoice: serializeRow(invoice as unknown as Record<string, unknown>) as unknown as Invoice }
}

export async function getInvoices(page = 1, limit = 20, filters?: Record<string, string>) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)
  const conditions = [eq(invoices.tenantId, tenantId)]

  if (filters?.search) {
    const pattern = `%${filters.search}%`
    const searchCondition = or(
      like(invoices.invoiceNumber, pattern),
      like(invoices.customerName, pattern),
    )
    if (searchCondition) conditions.push(searchCondition)
  }
  if (filters?.status) {
    conditions.push(eq(invoices.status, filters.status as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'))
  }
  if (filters?.startDate) {
    conditions.push(sql`${invoices.createdAt} >= ${filters.startDate}`)
  }
  if (filters?.endDate) {
    conditions.push(sql`${invoices.createdAt} <= ${filters.endDate}`)
  }

  const where = and(...conditions)
  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(where)

  const total = totalRow?.count ?? 0

  const rows = await db
    .select({
      id: invoices.id,
      tenantId: invoices.tenantId,
      invoiceNumber: invoices.invoiceNumber,
      customerId: invoices.customerId,
      customerName: invoices.customerName,
      customerEmail: invoices.customerEmail,
      customerPhone: invoices.customerPhone,
      customerAddress: invoices.customerAddress,
      items: invoices.items,
      subtotal: invoices.subtotal,
      discountPercent: invoices.discountPercent,
      discount: invoices.discount,
      tax: invoices.tax,
      taxItems: invoices.taxItems,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      amountOwed: invoices.amountOwed,
      status: invoices.status,
      dueDate: invoices.dueDate,
      notes: invoices.notes,
      createdById: invoices.createdBy,
      createdByName: users.name,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
    })
    .from(invoices)
    .leftJoin(users, eq(invoices.createdBy, users.id))
    .where(where)
    .orderBy(desc(invoices.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)

  const invoiceList = rows.map(row => ({
    id: String(row.id),
    tenantId: String(row.tenantId),
    invoiceNumber: row.invoiceNumber,
    customerId: row.customerId != null ? String(row.customerId) : null,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    customerAddress: row.customerAddress,
    items: row.items,
    subtotal: row.subtotal,
    discountPercent: row.discountPercent,
    discount: row.discount,
    tax: row.tax,
    taxItems: (row.taxItems as TaxItem[]) ?? [],
    total: row.total,
    amountPaid: row.amountPaid,
    amountOwed: row.amountOwed,
    status: row.status,
    dueDate: row.dueDate,
    notes: row.notes,
    createdBy: { name: row.createdByName },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }))

  return {
    invoices: invoiceList,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export async function getInvoiceById(id: string) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)

  const [row] = await db
    .select({
      id: invoices.id,
      tenantId: invoices.tenantId,
      invoiceNumber: invoices.invoiceNumber,
      customerId: invoices.customerId,
      customerName: invoices.customerName,
      customerEmail: invoices.customerEmail,
      customerPhone: invoices.customerPhone,
      customerAddress: invoices.customerAddress,
      items: invoices.items,
      subtotal: invoices.subtotal,
      discountPercent: invoices.discountPercent,
      discount: invoices.discount,
      tax: invoices.tax,
      taxItems: invoices.taxItems,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      amountOwed: invoices.amountOwed,
      status: invoices.status,
      dueDate: invoices.dueDate,
      notes: invoices.notes,
      createdById: invoices.createdBy,
      createdByName: users.name,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
    })
    .from(invoices)
    .leftJoin(users, eq(invoices.createdBy, users.id))
    .where(and(eq(invoices.id, toNum(id)), eq(invoices.tenantId, tenantId)))

  if (!row) return { error: 'Invoice not found' }

  const invoice = {
    id: String(row.id),
    tenantId: String(row.tenantId),
    invoiceNumber: row.invoiceNumber,
    customerId: row.customerId != null ? String(row.customerId) : null,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    customerAddress: row.customerAddress,
    items: row.items,
    subtotal: row.subtotal,
    discountPercent: row.discountPercent,
    discount: row.discount,
    tax: row.tax,
    taxItems: (row.taxItems as TaxItem[]) ?? [],
    total: row.total,
    amountPaid: row.amountPaid,
    amountOwed: row.amountOwed,
    status: row.status,
    dueDate: row.dueDate,
    notes: row.notes,
    createdBy: { name: row.createdByName },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }

  return { invoice: invoice as unknown as Invoice }
}

export async function updateInvoiceStatus(id: string, status: string) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  if (!hasPermission(session.user.role, PERMISSIONS.invoices.update)) return { error: 'Forbidden' }

  const validated = updateInvoiceStatusSchema.safeParse({ status })
  if (!validated.success) return { error: validated.error.issues[0].message }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)

  await db
    .update(invoices)
    .set({
      status: validated.data.status,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(invoices.id, toNum(id)), eq(invoices.tenantId, tenantId)))
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, toNum(id)), eq(invoices.tenantId, tenantId)))

  if (!invoice) return { error: 'Invoice not found' }

  await createAuditLog({
    tenantId,
    action: `invoice.${validated.data.status}`,
    entity: 'Invoice',
    entityId: id,
    performedBy: toNum(session.user.id),
    performedByName: session.user.name || 'Unknown',
    details: { invoiceNumber: invoice.invoiceNumber, newStatus: validated.data.status },
  })

  revalidatePath('/invoices')
  return { success: true, invoice: serializeRow(invoice as unknown as Record<string, unknown>) as unknown as Invoice }
}

export async function deleteInvoice(id: string) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  if (!hasPermission(session.user.role, PERMISSIONS.invoices.delete)) return { error: 'Forbidden' }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)
  const userId = toNum(session.user.id)
  const invoiceId = toNum(id)

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)))
  if (!invoice) return { error: 'Invoice not found' }

  // Reverse any outstanding debt attribution before deleting
  if ((invoice.amountOwed ?? 0) > 0.01 && invoice.customerId) {
    const [custRow] = await db
      .select({ totalDebt: customers.totalDebt })
      .from(customers)
      .where(eq(customers.id, invoice.customerId))
      .limit(1)
    const previousBalance = custRow?.totalDebt ?? 0
    const reversed = Math.max(0, Math.round((previousBalance - (invoice.amountOwed ?? 0)) * 100) / 100)
    const now = new Date().toISOString()
    await db.insert(debtLedger).values({
      tenantId,
      customerId: invoice.customerId,
      amount: -Math.abs(invoice.amountOwed ?? 0),
      type: 'invoice_voided',
      referenceType: 'invoice',
      referenceId: invoiceId,
      notes: `Reversal: deleted ${invoice.invoiceNumber} (was owing ${invoice.amountOwed?.toFixed(2)})`,
      balanceAfter: reversed,
      createdBy: userId,
      createdAt: now,
    })
    await db.update(customers)
      .set({ totalDebt: reversed, lastDebtActivityAt: now })
      .where(eq(customers.id, invoice.customerId))
  }

  await db
    .delete(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)))

  revalidatePath('/invoices')
  return { success: true }
}

/**
 * Update an existing invoice. Reverses the old debt attribution (if any)
 * and re-applies it from scratch based on the new amount paid.
 */
export async function updateInvoice(id: string, data: CreateInvoiceInput) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  if (!hasPermission(session.user.role, PERMISSIONS.invoices.update)) return { error: 'Forbidden' }

  const validated = createInvoiceSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0].message }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)
  const userId = toNum(session.user.id)
  const invoiceId = toNum(id)

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

  const [oldInvoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)))
    .limit(1)
  if (!oldInvoice) return { error: 'Invoice not found' }

  const debtorCustomerId = validated.data.customerId ? toNum(validated.data.customerId) : oldInvoice.customerId

  // 1) Reverse old debt attribution
  if ((oldInvoice.amountOwed ?? 0) > 0.01 && oldInvoice.customerId) {
    const [custRow] = await db
      .select({ totalDebt: customers.totalDebt })
      .from(customers)
      .where(eq(customers.id, oldInvoice.customerId))
      .limit(1)
    const previousBalance = custRow?.totalDebt ?? 0
    const reversed = Math.max(0, Math.round((previousBalance - (oldInvoice.amountOwed ?? 0)) * 100) / 100)
    await db.insert(debtLedger).values({
      tenantId,
      customerId: oldInvoice.customerId,
      amount: -Math.abs(oldInvoice.amountOwed ?? 0),
      type: 'invoice_voided',
      referenceType: 'invoice',
      referenceId: invoiceId,
      notes: `Reversal: edited ${oldInvoice.invoiceNumber} (was owing ${oldInvoice.amountOwed?.toFixed(2)})`,
      balanceAfter: reversed,
      createdBy: userId,
      createdAt: now,
    })
    await db.update(customers)
      .set({ totalDebt: reversed, lastDebtActivityAt: now })
      .where(eq(customers.id, oldInvoice.customerId))
  }

  // 2) Update the invoice row
  await db
    .update(invoices)
    .set({
      customerId: debtorCustomerId,
      customerName: data.customerName,
      customerEmail: (data.customerEmail as string | undefined) ?? null,
      customerPhone: (data.customerPhone as string | undefined) ?? null,
      customerAddress: (data.customerAddress as string | undefined) ?? null,
      items,
      subtotal: calculatedSubtotal,
      discountPercent,
      discount: calculatedDiscount,
      tax: calculatedTax,
      taxItems,
      total: calculatedTotal,
      amountPaid,
      amountOwed,
      dueDate: new Date(data.dueDate).toISOString(),
      notes: (data.notes as string | undefined) ?? null,
      updatedAt: now,
    })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)))

  // 3) Apply the new debt attribution
  if (amountOwed > 0.01 && debtorCustomerId) {
    const [custRow] = await db
      .select({ totalDebt: customers.totalDebt })
      .from(customers)
      .where(eq(customers.id, debtorCustomerId))
      .limit(1)
    const previousBalance = custRow?.totalDebt ?? 0
    const newBalance = Math.round((previousBalance + amountOwed) * 100) / 100
    await db.insert(debtLedger).values({
      tenantId,
      customerId: debtorCustomerId,
      amount: amountOwed,
      type: 'invoice_created',
      referenceType: 'invoice',
      referenceId: invoiceId,
      notes: `Edit: ${oldInvoice.invoiceNumber} \u2014 paid ${amountPaid} of ${calculatedTotal}`,
      balanceAfter: newBalance,
      createdBy: userId,
      createdAt: now,
    })
    await db.update(customers)
      .set({
        totalDebt: newBalance,
        firstDebtAt: sql`COALESCE(${customers.firstDebtAt}, ${now})`,
        lastDebtActivityAt: now,
      })
      .where(eq(customers.id, debtorCustomerId))
  }

  await createAuditLog({
    tenantId,
    action: 'invoice.updated',
    entity: 'Invoice',
    entityId: id,
    performedBy: userId,
    performedByName: session.user.name || 'Unknown',
    details: { invoiceNumber: oldInvoice.invoiceNumber, total: calculatedTotal, amountPaid, amountOwed },
  })

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  return { success: true, id }
}

export async function getInvoiceByNumber(invoiceNumber: string) {
  const db = await dbConnect()

  const [row] = await db
    .select({
      id: invoices.id,
      tenantId: invoices.tenantId,
      invoiceNumber: invoices.invoiceNumber,
      customerId: invoices.customerId,
      customerName: invoices.customerName,
      customerEmail: invoices.customerEmail,
      customerPhone: invoices.customerPhone,
      customerAddress: invoices.customerAddress,
      items: invoices.items,
      subtotal: invoices.subtotal,
      discountPercent: invoices.discountPercent,
      discount: invoices.discount,
      tax: invoices.tax,
      taxItems: invoices.taxItems,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      amountOwed: invoices.amountOwed,
      status: invoices.status,
      dueDate: invoices.dueDate,
      notes: invoices.notes,
      createdBy: invoices.createdBy,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
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
    .from(invoices)
    .leftJoin(tenants, eq(invoices.tenantId, tenants.id))
    .leftJoin(settings, eq(invoices.tenantId, settings.tenantId))
    .where(eq(invoices.invoiceNumber, invoiceNumber))
    .limit(1)

  if (!row) return null

  const invoice: Invoice = {
    id: String(row.id),
    invoiceNumber: row.invoiceNumber,
    customerName: row.customerName,
    customerEmail: row.customerEmail || undefined,
    customerPhone: row.customerPhone || undefined,
    customerAddress: row.customerAddress || undefined,
    items: row.items as Array<{ name: string; description?: string; quantity: number; price: number; total: number }>,
    subtotal: row.subtotal,
    discountPercent: row.discountPercent,
    discount: row.discount,
    tax: row.tax,
    taxItems: (row.taxItems as TaxItem[]) ?? [],
    total: row.total,
    amountPaid: row.amountPaid,
    amountOwed: row.amountOwed,
    status: row.status as InvoiceStatus,
    dueDate: row.dueDate,
    notes: row.notes || undefined,
    createdAt: row.createdAt,
    createdBy: { name: String(row.createdBy) },
    currency: row.currency || 'GHS',
    receiptFooter: row.receiptFooter || '',
    tenant: {
      id: String(row.tenantId),
      name: row.storeName || row.tenantName || 'Store',
      slug: row.tenantSlug || '',
      phone: row.storePhone || '',
      email: row.storeEmail || '',
      address: row.storeAddress || '',
      description: row.storeDescription || '',
      taxNumber: row.taxNumber || '',
    },
  }

  return invoice
}
