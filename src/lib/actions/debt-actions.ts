'use server'

import { revalidatePath } from 'next/cache'
import { customers, debtLedger, sales, invoices } from '@/lib/db/schema'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { dbConnect } from '@/lib/db/connect'
import { toNum, serializeList } from '@/lib/db/helpers'
import { debtPaymentSchema, salePaymentSchema, type DebtPaymentInput, type SalePaymentInput } from '@/lib/validations/debt'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/roles'
import { createAuditLog } from '@/lib/services/audit'
import { createNotification } from '@/lib/services/notification'
import { actionHandler } from '@/lib/utils/action-handler'
import { actionOk } from '@/lib/utils/action-result'

/**
 * Record a manual payment against a customer's outstanding debt.
 *
 * The payment is distributed FIFO across the customer's open sales
 * (oldest first) and then their open invoices (oldest first). Each
 * distribution inserts a `manual_payment` debt_ledger entry linked to
 * the specific sale/invoice and updates that row's `amountPaid` /
 * `amountOwed`. This is what makes the public sale receipt able to
 * show updated payment status after the customer pays toward their
 * debt.
 *
 * If the payment exceeds total outstanding (overpayment), a single
 * unlinked `manual_payment` entry is recorded as a credit.
 *
 * The whole sequence — including the customers.totalDebt update — is
 * wrapped in a single transaction so the ledger and cached balance
 * never drift.
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
  const paymentAmount = Math.round(validated.data.amount * 100) / 100
  const now = new Date().toISOString()

  type DistributionEntry = {
    kind: 'sale' | 'invoice' | 'credit'
    referenceId: number | null
    amount: number // portion of the original payment
  }

  type TxResult =
    | { ok: true; balanceAfter: number; customerName: string; distributions: DistributionEntry[] }
    | { ok: false; error: string }

  const result: TxResult = await db.transaction(async (tx): Promise<TxResult> => {
    const [customer] = await tx.select().from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
      .limit(1)
    if (!customer) return { ok: false, error: 'Customer not found' }
    if (customer.totalDebt < 0.01) return { ok: false, error: 'Customer has no outstanding debt' }
    if (paymentAmount > customer.totalDebt + 0.001) {
      return { ok: false, error: `Payment exceeds outstanding debt of ${customer.totalDebt.toFixed(2)}` }
    }

    // FIFO across open sales (oldest first), then open invoices (oldest first).
    const openSales = await tx
      .select({
        id: sales.id,
        saleNumber: sales.saleNumber,
        amountOwed: sales.amountOwed,
        amountPaid: sales.amountPaid,
        total: sales.total,
      })
      .from(sales)
      .where(and(
        eq(sales.tenantId, tenantId),
        eq(sales.customerId, customerId),
        sql`${sales.amountOwed} > 0`,
      ))
      .orderBy(asc(sales.createdAt), asc(sales.id))

    const openInvoices = await tx
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        amountOwed: invoices.amountOwed,
        amountPaid: invoices.amountPaid,
        total: invoices.total,
      })
      .from(invoices)
      .where(and(
        eq(invoices.tenantId, tenantId),
        eq(invoices.customerId, customerId),
        sql`${invoices.amountOwed} > 0`,
      ))
      .orderBy(asc(invoices.createdAt), asc(invoices.id))

    const distributions: DistributionEntry[] = []
    let runningBalance = customer.totalDebt
    let remaining = paymentAmount
    const lastPaymentAt = now

    for (const sale of openSales) {
      if (remaining <= 0.005) break
      const owed = Math.round(sale.amountOwed * 100) / 100
      const apply = Math.min(remaining, owed)
      const newSalePaid = Math.round((sale.amountPaid + apply) * 100) / 100
      const newSaleOwed = Math.max(0, Math.round((owed - apply) * 100) / 100)
      await tx.update(sales)
        .set({ amountPaid: newSalePaid, amountOwed: newSaleOwed, updatedAt: now })
        .where(eq(sales.id, sale.id))
      await tx.insert(debtLedger).values({
        tenantId,
        customerId,
        amount: -apply,
        type: 'manual_payment',
        referenceType: 'sale',
        referenceId: sale.id,
        notes: `Payment toward ${sale.saleNumber}${validated.data.notes ? ` \u2014 ${validated.data.notes}` : ''}`,
        balanceAfter: Math.max(0, Math.round((runningBalance - apply) * 100) / 100),
        createdBy: userId,
        createdAt: lastPaymentAt,
      })
      runningBalance = Math.max(0, Math.round((runningBalance - apply) * 100) / 100)
      remaining = Math.max(0, Math.round((remaining - apply) * 100) / 100)
      distributions.push({ kind: 'sale', referenceId: sale.id, amount: apply })
    }

    for (const inv of openInvoices) {
      if (remaining <= 0.005) break
      const owed = Math.round(inv.amountOwed * 100) / 100
      const apply = Math.min(remaining, owed)
      const newInvPaid = Math.round((inv.amountPaid + apply) * 100) / 100
      const newInvOwed = Math.max(0, Math.round((owed - apply) * 100) / 100)
      await tx.update(invoices)
        .set({ amountPaid: newInvPaid, amountOwed: newInvOwed, updatedAt: now })
        .where(eq(invoices.id, inv.id))
      await tx.insert(debtLedger).values({
        tenantId,
        customerId,
        amount: -apply,
        type: 'manual_payment',
        referenceType: 'invoice',
        referenceId: inv.id,
        notes: `Payment toward ${inv.invoiceNumber}${validated.data.notes ? ` \u2014 ${validated.data.notes}` : ''}`,
        balanceAfter: Math.max(0, Math.round((runningBalance - apply) * 100) / 100),
        createdBy: userId,
        createdAt: lastPaymentAt,
      })
      runningBalance = Math.max(0, Math.round((runningBalance - apply) * 100) / 100)
      remaining = Math.max(0, Math.round((remaining - apply) * 100) / 100)
      distributions.push({ kind: 'invoice', referenceId: inv.id, amount: apply })
    }

    if (remaining > 0.005) {
      // Overpayment — record as unlinked credit.
      await tx.insert(debtLedger).values({
        tenantId,
        customerId,
        amount: -remaining,
        type: 'manual_payment',
        referenceType: null,
        referenceId: null,
        notes: `Credit from overpayment${validated.data.notes ? ` \u2014 ${validated.data.notes}` : ''}`,
        balanceAfter: Math.max(0, Math.round((runningBalance - remaining) * 100) / 100),
        createdBy: userId,
        createdAt: lastPaymentAt,
      })
      runningBalance = Math.max(0, Math.round((runningBalance - remaining) * 100) / 100)
      distributions.push({ kind: 'credit', referenceId: null, amount: remaining })
    }

    await tx.update(customers)
      .set({
        totalDebt: runningBalance,
        lastDebtActivityAt: now,
      })
      .where(eq(customers.id, customerId))

    return { ok: true, balanceAfter: runningBalance, customerName: customer.name, distributions }
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
    details: { amount: paymentAmount, balanceAfter: result.balanceAfter, distributions: result.distributions },
  })

  await createNotification({
    tenantId,
    userId,
    type: 'debt.paid',
    title: 'Debt Payment Received',
    message: `${result.customerName} paid ${paymentAmount.toFixed(2)} toward their debt. Balance: ${result.balanceAfter.toFixed(2)}.`,
    link: `/customers/${customerId}`,
  })

  revalidatePath('/customers')
  revalidatePath(`/customers/${customerId}`)
  // Receipt pages must reflect the new payment status immediately.
  revalidatePath(`/r/[token]`, 'page')
  revalidatePath(`/i/[token]`, 'page')
  return actionOk({ balanceAfter: result.balanceAfter, distributions: result.distributions })
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

  // Also list open (still-owed) sales attributed to this customer, plus
  // their full sale history for the customer page.
  const [openSales, allSales] = await Promise.all([
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
      id: sales.id,
      saleNumber: sales.saleNumber,
      items: sales.items,
      total: sales.total,
      amountPaid: sales.amountPaid,
      amountOwed: sales.amountOwed,
      createdAt: sales.createdAt,
    })
      .from(sales)
      .where(and(
        eq(sales.tenantId, tenantId),
        eq(sales.customerId, numericId),
      ))
      .orderBy(desc(sales.createdAt))
      .limit(50),
  ])

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      notes: customer.notes,
      totalDebt: customer.totalDebt,
      firstDebtAt: customer.firstDebtAt,
      lastDebtActivityAt: customer.lastDebtActivityAt,
      totalSales: customer.totalSales,
      totalRevenue: customer.totalRevenue,
    },
    ledger: serializeList(entries as unknown as Record<string, unknown>[]),
    openSales,
    allSales: serializeList(allSales as unknown as Record<string, unknown>[]),
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

/**
 * Record a payment against ONE specific sale from the sale-detail page.
 *
 * Unlike `recordDebtPayment` (which distributes FIFO across all of the
 * customer's open sales + invoices), this pays a targeted sale in full
 * or in part. It is the action that backs the "Record Payment" button
 * on the dashboard sale detail page.
 *
 * The whole sequence — sale.amountPaid/amountOwed update, debt_ledger
 * insert, and customers.totalDebt decrement — is wrapped in a single
 * transaction so the ledger stays reconciled with the cached balance.
 * Re-validates both the dashboard and the public receipt pages so the
 * new state shows up immediately.
 */
export async function recordSalePayment(saleId: string, data: SalePaymentInput) {
  return actionHandler('recordSalePayment', { saleId, data }, async () => {
    const session = await auth()
    if (!session?.user) return { error: 'Unauthorized' }
    if (!hasPermission(session.user.role, PERMISSIONS.sales.update)) return { error: 'Forbidden' }

    const validated = salePaymentSchema.safeParse(data)
    if (!validated.success) {
      const first = validated.error.issues[0]
      const path = (first.path ?? []).join('.')
      return { error: path ? `${path}: ${first.message}` : first.message }
    }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)
  const userId = toNum(session.user.id)
  const numericSaleId = toNum(saleId)
  const paymentAmount = Math.round(validated.data.amount * 100) / 100
  const now = new Date().toISOString()

  type TxResult =
    | { ok: true; balanceAfter: number; amountPaid: number; amountOwed: number; customerName: string; saleNumber: string }
    | { ok: false; error: string }

  const result: TxResult = await db.transaction(async (tx): Promise<TxResult> => {
    const [sale] = await tx
      .select()
      .from(sales)
      .where(and(eq(sales.id, numericSaleId), eq(sales.tenantId, tenantId)))
      .limit(1)
    if (!sale) return { ok: false, error: 'Sale not found' }
    if (!sale.customerId) return { ok: false, error: 'This sale has no linked customer. Add the customer first.' }
    const owed = Math.round((sale.amountOwed ?? 0) * 100) / 100
    if (owed <= 0.005) return { ok: false, error: 'This sale is already fully paid' }
    if (paymentAmount > owed + 0.001) {
      return { ok: false, error: `Payment exceeds outstanding balance of ${owed.toFixed(2)}` }
    }

    const [customer] = await tx
      .select({ id: customers.id, name: customers.name, totalDebt: customers.totalDebt })
      .from(customers)
      .where(and(eq(customers.id, sale.customerId), eq(customers.tenantId, tenantId)))
      .limit(1)
    if (!customer) return { ok: false, error: 'Customer not found' }

    const newSalePaid = Math.round((sale.amountPaid + paymentAmount) * 100) / 100
    const newSaleOwed = Math.max(0, Math.round((owed - paymentAmount) * 100) / 100)
    const newCustomerDebt = Math.max(0, Math.round((customer.totalDebt - paymentAmount) * 100) / 100)

    // Race-safe update: only succeed if the sale STILL has at least
    // `paymentAmount` outstanding. The WHERE-clause guard is what stops
    // two concurrent payments from both passing the read-then-write
    // window above and double-crediting the customer. If 0 rows are
    // affected, another transaction won the race and we abort.
    const updateResult = await tx
      .update(sales)
      .set({ amountPaid: newSalePaid, amountOwed: newSaleOwed, updatedAt: now })
      .where(and(
        eq(sales.id, numericSaleId),
        sql`${sales.amountOwed} >= ${paymentAmount}`,
      ))

    // mysql2 returns OkPacket with affectedRows; if 0, another caller
    // paid between our SELECT and our UPDATE.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const affected = (updateResult as any)?.affectedRows ?? (updateResult as any)?.[0]?.affectedRows ?? 0
    if (affected === 0) {
      return { ok: false, error: 'Payment could not be applied — the balance changed. Please retry.' }
    }

    await tx.insert(debtLedger).values({
      tenantId,
      customerId: customer.id,
      amount: -paymentAmount,
      type: 'manual_payment',
      referenceType: 'sale',
      referenceId: numericSaleId,
      notes: `Payment toward ${sale.saleNumber}${validated.data.notes ? ` \u2014 ${validated.data.notes}` : ''}`,
      balanceAfter: newCustomerDebt,
      createdBy: userId,
      createdAt: now,
    })

    await tx.update(customers)
      .set({ totalDebt: newCustomerDebt, lastDebtActivityAt: now })
      .where(eq(customers.id, customer.id))

    return {
      ok: true,
      balanceAfter: newCustomerDebt,
      amountPaid: newSalePaid,
      amountOwed: newSaleOwed,
      customerName: customer.name,
      saleNumber: sale.saleNumber,
    }
  })

  if (!result.ok) {
    return { error: result.error }
  }

  await createAuditLog({
    tenantId,
    action: 'sale.payment_recorded',
    entity: 'Sale',
    entityId: String(numericSaleId),
    performedBy: userId,
    performedByName: session.user.name || 'Unknown',
    details: { amount: paymentAmount, balanceAfter: result.balanceAfter },
  })

  await createNotification({
    tenantId,
    userId,
    type: 'sale.payment_recorded',
    title: 'Payment Recorded',
    message: `${result.customerName} paid ${paymentAmount.toFixed(2)} toward ${result.saleNumber}. Balance: ${result.amountOwed.toFixed(2)}.`,
    link: `/sales/${numericSaleId}`,
  })

  revalidatePath(`/sales/${numericSaleId}`)
  revalidatePath('/sales')
  revalidatePath('/customers')
  // Receipt pages must reflect the new payment status immediately.
  revalidatePath(`/r/[token]`, 'page')
  revalidatePath(`/i/[token]`, 'page')
  return actionOk({ amountPaid: result.amountPaid, amountOwed: result.amountOwed, balanceAfter: result.balanceAfter })
  })
}

/**
 * Linked debt_ledger history for a single sale, oldest first. Backed
 * by the `debt_ledger.referenceType='sale' + referenceId` index, scoped
 * to the verified tenant. Powers the "Payment History" table on the
 * dashboard sale detail page and the public receipt.
 */
export async function getSalePaymentHistory(saleId: string) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)
  const numericSaleId = toNum(saleId)

  const entries = await db
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
      eq(debtLedger.tenantId, tenantId),
      eq(debtLedger.referenceType, 'sale'),
      eq(debtLedger.referenceId, numericSaleId),
    ))
    .orderBy(asc(debtLedger.createdAt), asc(debtLedger.id))

  return { history: serializeList(entries as unknown as Record<string, unknown>[]) }
}
