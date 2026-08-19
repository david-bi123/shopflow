import { and, asc, count, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import * as schema from '@/lib/db/schema'
import { customers, sales, debtLedger } from '@/lib/db/schema'

export interface CustomerAggregates {
  totalSales: number
  totalRevenue: number
  totalDebt: number
  firstDebtAt: string | null
  lastDebtActivityAt: string | null
}

type DbClient = Pick<MySql2Database<typeof schema>, 'select' | 'update'>

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Compute a customer's lifetime aggregates straight from the source
 * tables (sales + debt_ledger) instead of trusting the cached columns
 * on `customers`. The cached columns drift (sale edits/deletes never
 * adjust `totalRevenue`/`totalSales`, and debt created on a brand-new
 * customer is attributed before the row is incremented), so reading the
 * source of truth keeps the customer pages accurate.
 *
 * - `totalSales` / `totalRevenue` are derived from the `sales` table.
 * - `totalDebt` is the algebraic sum of every `debt_ledger` entry, which
 *   covers both sales and invoice debt plus manual payments.
 * - `firstDebtAt` / `lastDebtActivityAt` are the earliest positive ledger
 *   entry and the most recent ledger entry respectively.
 */
export async function computeCustomerAggregates(
  db: DbClient,
  tenantId: number,
  customerId: number,
): Promise<CustomerAggregates> {
  const [salesAgg] = await db
    .select({
      totalSales: count(),
      totalRevenue: sql<number>`COALESCE(SUM(${sales.total}), 0)`,
    })
    .from(sales)
    .where(and(eq(sales.tenantId, tenantId), eq(sales.customerId, customerId)))

  const [debtAgg] = await db
    .select({
      totalDebt: sql<number>`COALESCE(SUM(${debtLedger.amount}), 0)`,
    })
    .from(debtLedger)
    .where(and(eq(debtLedger.tenantId, tenantId), eq(debtLedger.customerId, customerId)))

  const [first] = await db
    .select({ createdAt: debtLedger.createdAt })
    .from(debtLedger)
    .where(and(
      eq(debtLedger.tenantId, tenantId),
      eq(debtLedger.customerId, customerId),
      sql`${debtLedger.amount} > 0`,
    ))
    .orderBy(asc(debtLedger.createdAt), asc(debtLedger.id))
    .limit(1)

  const [last] = await db
    .select({ createdAt: debtLedger.createdAt })
    .from(debtLedger)
    .where(and(eq(debtLedger.tenantId, tenantId), eq(debtLedger.customerId, customerId)))
    .orderBy(desc(debtLedger.createdAt), desc(debtLedger.id))
    .limit(1)

  return {
    totalSales: salesAgg?.totalSales ?? 0,
    totalRevenue: round2(Number(salesAgg?.totalRevenue ?? 0)),
    totalDebt: round2(Number(debtAgg?.totalDebt ?? 0)),
    firstDebtAt: first?.createdAt ?? null,
    lastDebtActivityAt: last?.createdAt ?? null,
  }
}

/** Refresh the cached aggregate columns for one customer from source data. */
export async function recomputeCustomerTotals(
  db: DbClient,
  tenantId: number,
  customerId: number,
): Promise<void> {
  const agg = await computeCustomerAggregates(db, tenantId, customerId)
  await db
    .update(customers)
    .set({
      totalSales: agg.totalSales,
      totalRevenue: agg.totalRevenue,
      totalDebt: agg.totalDebt,
      firstDebtAt: agg.firstDebtAt,
      lastDebtActivityAt: agg.lastDebtActivityAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(customers.id, customerId))
}

/**
 * Grouped variant for list pages: returns the fresh aggregates for every
 * customer id in `customerIds` in one round trip (per table).
 */
export async function computeCustomerAggregatesForMany(
  db: Pick<MySql2Database<typeof schema>, 'select'>,
  tenantId: number,
  customerIds: number[],
): Promise<Map<string, CustomerAggregates>> {
  const result = new Map<string, CustomerAggregates>()
  if (customerIds.length === 0) return result

  const [salesRows, debtRows] = await Promise.all([
    db
      .select({
        customerId: sales.customerId,
        totalSales: count(),
        totalRevenue: sql<number>`COALESCE(SUM(${sales.total}), 0)`,
      })
      .from(sales)
      .where(and(
        eq(sales.tenantId, tenantId),
        isNotNull(sales.customerId),
        inArray(sales.customerId, customerIds),
      ))
      .groupBy(sales.customerId),
    db
      .select({
        customerId: debtLedger.customerId,
        totalDebt: sql<number>`COALESCE(SUM(${debtLedger.amount}), 0)`,
        firstDebtAt: sql<string | null>`MIN(CASE WHEN ${debtLedger.amount} > 0 THEN ${debtLedger.createdAt} END)`,
        lastDebtActivityAt: sql<string | null>`MAX(${debtLedger.createdAt})`,
      })
      .from(debtLedger)
      .where(and(
        eq(debtLedger.tenantId, tenantId),
        inArray(debtLedger.customerId, customerIds),
      ))
      .groupBy(debtLedger.customerId),
  ])

  const seed = (id: number): CustomerAggregates => ({
    totalSales: 0,
    totalRevenue: 0,
    totalDebt: 0,
    firstDebtAt: null,
    lastDebtActivityAt: null,
  })

  for (const id of customerIds) {
    result.set(String(id), seed(id))
  }
  for (const r of salesRows) {
    const agg = result.get(String(r.customerId))
    if (agg) {
      agg.totalSales = r.totalSales
      agg.totalRevenue = round2(Number(r.totalRevenue ?? 0))
    }
  }
  for (const r of debtRows) {
    const agg = result.get(String(r.customerId))
    if (agg) {
      agg.totalDebt = round2(Number(r.totalDebt ?? 0))
      agg.firstDebtAt = r.firstDebtAt ?? null
      agg.lastDebtActivityAt = r.lastDebtActivityAt ?? null
    }
  }
  return result
}