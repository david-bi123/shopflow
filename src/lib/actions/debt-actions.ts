'use server'

import { revalidatePath } from 'next/cache'
import { customers, debtLedger } from '@/lib/db/schema'
import { and, desc, eq, sql } from 'drizzle-orm'
import { dbConnect } from '@/lib/db/connect'
import { toNum, serializeList } from '@/lib/db/helpers'
import { debtPaymentSchema, type DebtPaymentInput } from '@/lib/validations/debt'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/roles'
import { createAuditLog } from '@/lib/services/audit'
import { createNotification } from '@/lib/services/notification'
import { actionHandler } from '@/lib/utils/action-handler'
import { actionOk } from '@/lib/utils/action-result'

/**
 * Record a manual payment against a customer's outstanding debt.
 *
 * Inserts a negative-amount entry into debt_ledger and decrements the
 * cached `customers.totalDebt` balance.
 */
export async function recordDebtPayment(data: DebtPaymentInput) {
  return actionHandler('recordDebtPayment', { data }, async () => {
    const session = await auth()
    if (!session?.user) return { error: 'Unauthorized' }
    if (!hasPermission(session.user.role, PERMISSIONS.customers.update)) return { error: 'Forbidden' }

    const validated = debtPaymentSchema.safeParse(data)
    if (!validated.success) {
      const first = validated.error.issues[0]
      const path = (first.path ?? []).join('.')
      return { error: path ? `${path}: ${first.message}` : first.message }
    }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)
  const customerId = toNum(validated.data.customerId)
  const userId = toNum(session.user.id)
  const amount = Math.round(validated.data.amount * 100) / 100
  const now = new Date().toISOString()

  // Read the current balance + insert the payment entry + update the
  // cached customer balance in a single transaction. Doing it as three
  // separate queries can leave the ledger out of sync with the cached
  // total if any step fails.
  type TxResult =
    | { ok: true; entryId: number; balanceAfter: number; customerName: string }
    | { ok: false; error: string }

  const result: TxResult = await db.transaction(async (tx): Promise<TxResult> => {
    const [customer] = await tx.select().from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
      .limit(1)
    if (!customer) return { ok: false, error: 'Customer not found' }
    if (customer.totalDebt < 0.01) return { ok: false, error: 'Customer has no outstanding debt' }
    if (amount > customer.totalDebt + 0.001) {
      return { ok: false, error: `Payment exceeds outstanding debt of \u20b5${customer.totalDebt.toFixed(2)}` }
    }

    const newBalance = Math.max(0, Math.round((customer.totalDebt - amount) * 100) / 100)
    const [inserted] = await tx
      .insert(debtLedger)
      .values({
        tenantId,
        customerId,
        amount: -amount, // negative = payment
        type: 'manual_payment',
        referenceType: null,
        referenceId: null,
        notes: validated.data.notes || `Cash payment via ${validated.data.paymentMethod.replace('_', ' ')}`,
        balanceAfter: newBalance,
        createdBy: userId,
        createdAt: now,
      })
      .$returningId()

    await tx.update(customers)
      .set({
        totalDebt: newBalance,
        lastDebtActivityAt: now,
      })
      .where(eq(customers.id, customerId))

    return { ok: true, entryId: (inserted as { id: number }).id, balanceAfter: newBalance, customerName: customer.name }
  })

  if (!result.ok) {
    return { error: result.error }
  }

  await createAuditLog({
    tenantId,
    action: 'debt.paid',
    entity: 'Customer',
    entityId: String(customerId),
    performedBy: userId,
    performedByName: session.user.name || 'Unknown',
    details: { amount, paymentMethod: validated.data.paymentMethod, balanceAfter: result.balanceAfter },
  })

  await createNotification({
    tenantId,
    userId,
    type: 'debt.paid',
    title: 'Debt Payment Received',
    message: `${result.customerName} paid \u20b5${amount.toFixed(2)} toward their debt. Balance: \u20b5${result.balanceAfter.toFixed(2)}.`,
    link: `/customers/${customerId}`,
  })

  revalidatePath('/customers')
  revalidatePath(`/customers/${customerId}`)
  return actionOk({ entryId: result.entryId, balanceAfter: result.balanceAfter })
  })
}

/**
 * Full debt ledger history for one customer, oldest first. Includes a
 * running balance as a denormalised field on each row.
 */
export async function getCustomerDebtLedger(customerId: string) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)
  const numericId = toNum(customerId)

  const [customer] = await db.select().from(customers)
    .where(and(eq(customers.id, numericId), eq(customers.tenantId, tenantId)))
    .limit(1)
  if (!customer) return { error: 'Customer not found' }

  const entries = await db
    .select({
      id: debtLedger.id,
      amount: debtLedger.amount,
      type: debtLedger.type,
      referenceType: debtLedger.referenceType,
      referenceId: debtLedger.referenceId,
      notes: debtLedger.notes,
      balanceAfter: debtLedger.balanceAfter,
      createdBy: debtLedger.createdBy,
      createdAt: debtLedger.createdAt,
    })
    .from(debtLedger)
    .where(and(eq(debtLedger.tenantId, tenantId), eq(debtLedger.customerId, numericId)))
    .orderBy(debtLedger.createdAt, debtLedger.id)

  // Also list open (still-owed) sales + invoices attributed to this customer.
  const [openSales, openInvoices] = await Promise.all([
    db.select({
      id: sales.id,
      saleNumber: sales.saleNumber,
      total: sales.total,
      amountPaid: sales.amountPaid,
      amountOwed: sales.amountOwed,
      createdAt: sales.createdAt,
    })
      .from(sales)
      .where(and(
        eq(sales.tenantId, tenantId),
        eq(sales.customerId, numericId),
        sql`${sales.amountOwed} > 0`,
      ))
      .orderBy(desc(sales.createdAt)),
    db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      amountOwed: invoices.amountOwed,
      status: invoices.status,
      dueDate: invoices.dueDate,
      createdAt: invoices.createdAt,
    })
      .from(invoices)
      .where(and(
        eq(invoices.tenantId, tenantId),
        eq(invoices.customerId, numericId),
        sql`${invoices.amountOwed} > 0`,
      ))
      .orderBy(desc(invoices.createdAt)),
  ])

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      totalDebt: customer.totalDebt,
      firstDebtAt: customer.firstDebtAt,
      lastDebtActivityAt: customer.lastDebtActivityAt,
      totalSales: customer.totalSales,
      totalRevenue: customer.totalRevenue,
    },
    ledger: serializeList(entries as unknown as Record<string, unknown>[]),
    openSales,
    openInvoices,
  }
}

/**
 * List every customer who currently has an outstanding debt, ordered
 * by largest balance first. Backed by the cached `totalDebt` column
 * (kept in sync with debt_ledger by sale/invoice creation and the
 * recordDebtPayment action).
 */
export async function getDebtors() {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)

  const debtors = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      totalDebt: customers.totalDebt,
      totalSales: customers.totalSales,
      totalRevenue: customers.totalRevenue,
      firstDebtAt: customers.firstDebtAt,
      lastDebtActivityAt: customers.lastDebtActivityAt,
    })
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), sql`${customers.totalDebt} > 0`))
    .orderBy(desc(customers.totalDebt))

  return { debtors }
}

import { sales, invoices } from '@/lib/db/schema'
