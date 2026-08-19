'use server'

import { dbConnect } from '@/lib/db/connect'
import { sales, users, customers, auditLogs, settings } from '@/lib/db/schema'
import { eq, and, inArray, desc, asc, gte, lte, count, sql, isNotNull } from 'drizzle-orm'
import { toNum, serializeList } from '@/lib/db/helpers'
import { auth } from '@/lib/auth/auth'

/**
 * The sale's reporting date. Sales carry an explicit, user-editable
 * `sale_date` (`yyyy-mm-dd`); older rows backfilled from `created_at`.
 * Every date comparison below uses this expression so dashboards and
 * reports follow the sale's actual date rather than the day it was
 * recorded.
 */
const saleDay = sql`COALESCE(${sales.saleDate}, LEFT(${sales.createdAt}, 10))`

/** MySQL WEEKDAY() index -> display label (WEEKDAY: 0 = Monday .. 6 = Sunday). */
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Normalise a report range bound to `yyyy-mm-dd`. The reports page sends
 * date-only strings already; this also accepts full ISO timestamps.
 */
function toBound(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : toDateStr(new Date(value))
}

/** Shift a `yyyy-mm-dd` string by `days` (negative = backwards). */
function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

/** Days between two `yyyy-mm-dd` bounds inclusive. */
function periodDays(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00`) - Date.parse(`${start}T00:00:00`)) / 86400000) + 1
}

/** Percentage change helper: handles zero-baseline sensibly. */
function growth(current: number, previous: number): number {
  if (previous > 0) return ((current - previous) / previous) * 100
  return current > 0 ? 100 : 0
}

/**
 * Dashboard aggregates for a single tenant.
 *
 * Everything below is computed in SQL — we never `SELECT *` from the
 * sales table. Aggregates are bucketed by the sale's date (`sale_day`).
 */
export async function getDashboardStats() {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)

  const now = new Date()
  const startOfDayStr = toDateStr(now)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  const startOfWeekStr = toDateStr(startOfWeek)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfMonthStr = toDateStr(startOfMonth)

  // All aggregates in a single round trip using conditional SUM/COUNT.
  // This replaces a previous implementation that loaded the entire sales
  // table into Node memory and summed it in JS.
  //
  // NOTE: every `sql` template expression below uses an explicit `AS name`
  // because Drizzle's `select({ key: sql\`expr\` })` shortcut does not
  // always emit the alias in the generated SQL, and MySQL strict mode
  // rejects unaliased expressions in SELECT.
  const [aggregates] = await db
    .select({
      todayTotal: sql<number>`COALESCE(SUM(CASE WHEN ${saleDay} >= ${startOfDayStr} THEN ${sales.total} ELSE 0 END), 0)`.as('today_total'),
      todayCount: sql<number>`COUNT(CASE WHEN ${saleDay} >= ${startOfDayStr} THEN 1 END)`.as('today_count'),
      weeklyTotal: sql<number>`COALESCE(SUM(CASE WHEN ${saleDay} >= ${startOfWeekStr} THEN ${sales.total} ELSE 0 END), 0)`.as('weekly_total'),
      weeklyCount: sql<number>`COUNT(CASE WHEN ${saleDay} >= ${startOfWeekStr} THEN 1 END)`.as('weekly_count'),
      monthlyTotal: sql<number>`COALESCE(SUM(CASE WHEN ${saleDay} >= ${startOfMonthStr} THEN ${sales.total} ELSE 0 END), 0)`.as('monthly_total'),
      monthlyCount: sql<number>`COUNT(CASE WHEN ${saleDay} >= ${startOfMonthStr} THEN 1 END)`.as('monthly_count'),
      totalCount: sql<number>`COUNT(*)`.as('total_count'),
      allTimeRevenue: sql<number>`COALESCE(SUM(${sales.total}), 0)`.as('all_time_revenue'),
      firstSaleAt: sql<string | null>`MIN(${saleDay})`.as('first_sale_at'),
      lastSaleAt: sql<string | null>`MAX(${saleDay})`.as('last_sale_at'),
    })
    .from(sales)
    .where(eq(sales.tenantId, tenantId))

  // The remaining KPIs in parallel — they live in different tables.
  const [customerCount, staffCount, shopSettings] = await Promise.all([
    db
      .select({ total: count() })
      .from(customers)
      .where(eq(customers.tenantId, tenantId))
      .then((rows) => rows[0]?.total ?? 0),
    db
      .select({ total: count() })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), inArray(users.role, ['admin', 'staff'])))
      .then((rows) => rows[0]?.total ?? 0),
    db
      .select({ storeName: settings.storeName })
      .from(settings)
      .where(eq(settings.tenantId, tenantId))
      .limit(1)
      .then((rows) => rows[0]?.storeName ?? null),
  ])

  // Top products: still need to inspect the `items` JSON column, so we
  // pull just the items field for the most recent 1,000 sales. That
  // window is configurable here; the dashboard assumes "recent".
  const recent = await db
    .select({ items: sales.items })
    .from(sales)
    .where(eq(sales.tenantId, tenantId))
    .orderBy(desc(sales.createdAt))
    .limit(1000)

  const productMap: Record<string, { name: string; total: number; revenue: number }> = {}
  for (const row of recent) {
    const items = row.items as Array<{ name: string; quantity: number; subtotal: number }>
    for (const item of items) {
      if (!item || !item.name) continue
      if (!productMap[item.name]) {
        productMap[item.name] = { name: item.name, total: 0, revenue: 0 }
      }
      productMap[item.name].total += item.quantity
      productMap[item.name].revenue += item.subtotal
    }
  }
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const totalSalesCount = Number(aggregates?.totalCount ?? 0)
  const allTimeRevenue = Number(aggregates?.allTimeRevenue ?? 0)

  return {
    todaySales: Number(aggregates?.todayTotal ?? 0),
    todaySalesCount: Number(aggregates?.todayCount ?? 0),
    weeklySales: Number(aggregates?.weeklyTotal ?? 0),
    weeklySalesCount: Number(aggregates?.weeklyCount ?? 0),
    monthlySales: Number(aggregates?.monthlyTotal ?? 0),
    monthlySalesCount: Number(aggregates?.monthlyCount ?? 0),
    totalSalesCount,
    allTimeRevenue,
    averageSale: totalSalesCount > 0 ? allTimeRevenue / totalSalesCount : 0,
    firstSaleAt: aggregates?.firstSaleAt ?? null,
    lastSaleAt: aggregates?.lastSaleAt ?? null,
    totalCustomers: customerCount,
    totalStaff: staffCount,
    topProducts,
    shopName: shopSettings ?? 'IndFlow',
  }
}

/**
 * Per-day sales totals for the last `days` days. Grouped by the sale's
 * date (the `sale_date` column stores `yyyy-mm-dd` directly).
 */
export async function getSalesChartData(days = 30) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = toDateStr(startDate)

  const tenantId = toNum(session.user.tenantId!)

  // Use the unaliased expression in the WHERE clause — MySQL won't let a
  // select alias be referenced in WHERE ("Unknown column 'day'").
  const dayExpression = sql<string>`COALESCE(${sales.saleDate}, LEFT(${sales.createdAt}, 10))`
  const dayExpr = dayExpression.as('day')
  const rows = await db
    .select({
      date: dayExpr,
      sales: sql<number>`COALESCE(SUM(${sales.total}), 0)`.as('sales'),
      orders: sql<number>`COUNT(*)`.as('orders'),
    })
    .from(sales)
    .where(and(eq(sales.tenantId, tenantId), gte(dayExpression, startDateStr)))
    .groupBy(dayExpr)
    .orderBy(asc(dayExpr))

  return rows.map((r) => ({
    date: r.date,
    sales: Number(r.sales),
    orders: Number(r.orders),
  }))
}

interface ProductAgg {
  name: string
  quantity: number
  revenue: number
  saleIds: Set<number>
}

/** Aggregate the `items` JSON column across a row set (bounded scan). */
function aggregateProducts(rows: Array<{ id: number; items: unknown }>): ProductAgg[] {
  const map = new Map<string, ProductAgg>()
  for (const row of rows) {
    const items = row.items as Array<{ name: string; quantity: number; subtotal: number }>
    for (const item of items) {
      if (!item || !item.name) continue
      let entry = map.get(item.name)
      if (!entry) {
        entry = { name: item.name, quantity: 0, revenue: 0, saleIds: new Set() }
        map.set(item.name, entry)
      }
      entry.quantity += item.quantity
      entry.revenue += item.subtotal
      entry.saleIds.add(row.id)
    }
  }
  return Array.from(map.values())
}

/**
 * Detailed sales report over a date range. KPIs, payment breakdown,
 * previous-period comparison and charts are pure SQL aggregates; only
 * `topProducts` / units need the `items` JSON column, which falls back to
 * a bounded scan of the most recent matching sales.
 */
export async function getSalesReport(startDate: string, endDate: string) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)

  const start = toBound(startDate)
  const end = toBound(endDate)

  const where = and(
    eq(sales.tenantId, tenantId),
    gte(saleDay, start),
    lte(saleDay, end),
  )

  const dayExpr = sql<string>`COALESCE(${sales.saleDate}, LEFT(${sales.createdAt}, 10))`.as('day')

  const prevEnd = shiftDate(start, -1)
  const prevStart = shiftDate(prevEnd, -(periodDays(start, end) - 1))

  const [[kpis], daily, weekdayRows, [prevPeriod], customerRows] = await Promise.all([
    db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${sales.total}), 0)`.as('total_revenue'),
        totalSales: sql<number>`COUNT(*)`.as('total_sales'),
        totalDiscount: sql<number>`COALESCE(SUM(${sales.discount}), 0)`.as('total_discount'),
        totalTax: sql<number>`COALESCE(SUM(${sales.tax}), 0)`.as('total_tax'),
        collected: sql<number>`COALESCE(SUM(${sales.amountPaid}), 0)`.as('collected'),
        outstanding: sql<number>`COALESCE(SUM(${sales.amountOwed}), 0)`.as('outstanding'),
        paidFullCount: sql<number>`COUNT(CASE WHEN ${sales.amountOwed} <= 0 THEN 1 END)`.as('paid_full_count'),
        paidFullAmount: sql<number>`COALESCE(SUM(CASE WHEN ${sales.amountOwed} <= 0 THEN ${sales.amountPaid} END), 0)`.as('paid_full_amount'),
        paidPartialCount: sql<number>`COUNT(CASE WHEN ${sales.amountOwed} > 0 AND ${sales.amountPaid} > 0 THEN 1 END)`.as('paid_partial_count'),
        paidPartialAmount: sql<number>`COALESCE(SUM(CASE WHEN ${sales.amountOwed} > 0 AND ${sales.amountPaid} > 0 THEN ${sales.amountPaid} END), 0)`.as('paid_partial_amount'),
        unpaidCount: sql<number>`COUNT(CASE WHEN ${sales.amountOwed} > 0 AND ${sales.amountPaid} <= 0 THEN 1 END)`.as('unpaid_count'),
        unpaidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${sales.amountOwed} > 0 AND ${sales.amountPaid} <= 0 THEN ${sales.amountOwed} END), 0)`.as('unpaid_amount'),
      })
      .from(sales)
      .where(where),
    db
      .select({
        label: dayExpr,
        revenue: sql<number>`COALESCE(SUM(${sales.total}), 0)`.as('revenue'),
        sales: sql<number>`COUNT(*)`.as('sales'),
        collected: sql<number>`COALESCE(SUM(${sales.amountPaid}), 0)`.as('collected'),
        outstanding: sql<number>`COALESCE(SUM(${sales.amountOwed}), 0)`.as('outstanding'),
      })
      .from(sales)
      .where(where)
      .groupBy(dayExpr)
      .orderBy(asc(dayExpr)),
    db
      .select({
        dow: sql<number>`WEEKDAY(${saleDay})`.as('dow'),
        revenue: sql<number>`COALESCE(SUM(${sales.total}), 0)`.as('revenue'),
        sales: sql<number>`COUNT(*)`.as('sales'),
      })
      .from(sales)
      .where(where)
      .groupBy(sql`WEEKDAY(${saleDay})`)
      .orderBy(sql`WEEKDAY(${saleDay})`),
    db
      .select({
        revenue: sql<number>`COALESCE(SUM(${sales.total}), 0)`.as('prev_revenue'),
        sales: sql<number>`COUNT(*)`.as('prev_sales'),
      })
      .from(sales)
      .where(and(eq(sales.tenantId, tenantId), gte(saleDay, prevStart), lte(saleDay, prevEnd))),
    db
      .select({
        name: sales.customerName,
        count: sql<number>`COUNT(*)`.as('count'),
        revenue: sql<number>`COALESCE(SUM(${sales.total}), 0)`.as('revenue'),
        outstanding: sql<number>`COALESCE(SUM(${sales.amountOwed}), 0)`.as('outstanding'),
      })
      .from(sales)
      .where(and(where, isNotNull(sales.customerName), sql`${sales.customerName} <> ''`))
      .groupBy(sales.customerName)
      .orderBy(desc(sql`COALESCE(SUM(${sales.total}), 0)`))
      .limit(5),
  ])

  const totalRevenue = Number(kpis?.totalRevenue ?? 0)
  const totalSales = Number(kpis?.totalSales ?? 0)
  const prevRevenue = Number(prevPeriod?.revenue ?? 0)
  const prevSales = Number(prevPeriod?.sales ?? 0)

  // Top products + units still need the JSON column. Pull only the items
  // (and the id for uniqueness + day for the units chart) for the most
  // recent 5,000 sales in the window.
  const recent = await db
    .select({
      id: sales.id,
      day: sql<string>`COALESCE(${sales.saleDate}, LEFT(${sales.createdAt}, 10))`.as('day'),
      items: sales.items,
    })
    .from(sales)
    .where(where)
    .orderBy(desc(sales.createdAt))
    .limit(5000)

  const dayUnits = new Map<string, number>()
  const productAggs = aggregateProducts(recent)
  for (const row of recent) {
    const items = row.items as Array<{ quantity: number }>
    const units = items.reduce((sum, it) => sum + (it.quantity || 0), 0)
    if (row.day) dayUnits.set(row.day, (dayUnits.get(row.day) ?? 0) + units)
  }

  const topProducts = productAggs
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((p) => ({
      name: p.name,
      quantity: p.quantity,
      revenue: p.revenue,
      share: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0,
    }))

  const totalUnits = productAggs.reduce((sum, p) => sum + p.quantity, 0)

  return {
    totalRevenue,
    totalSales,
    averageSale: totalSales > 0 ? totalRevenue / totalSales : 0,
    totalUnits,
    totalDiscount: Number(kpis?.totalDiscount ?? 0),
    totalTax: Number(kpis?.totalTax ?? 0),
    collected: Number(kpis?.collected ?? 0),
    outstanding: Number(kpis?.outstanding ?? 0),
    collectionRate: totalRevenue > 0 ? ((Number(kpis?.collected ?? 0) / totalRevenue) * 100) : 0,
    paymentBreakdown: {
      paidFullCount: Number(kpis?.paidFullCount ?? 0),
      paidFullAmount: Number(kpis?.paidFullAmount ?? 0),
      paidPartialCount: Number(kpis?.paidPartialCount ?? 0),
      paidPartialAmount: Number(kpis?.paidPartialAmount ?? 0),
      unpaidCount: Number(kpis?.unpaidCount ?? 0),
      unpaidAmount: Number(kpis?.unpaidAmount ?? 0),
    },
    revenueGrowth: growth(totalRevenue, prevRevenue),
    salesGrowth: growth(totalSales, prevSales),
    prevRevenue,
    prevSales,
    chartData: daily.map((d) => ({
      label: d.label,
      revenue: Number(d.revenue),
      sales: Number(d.sales),
      collected: Number(d.collected),
      outstanding: Number(d.outstanding),
      units: dayUnits.get(d.label) ?? 0,
    })),
    weekdayData: weekdayRows.map((r) => ({
      label: WEEKDAY_LABELS[Number(r.dow)] ?? String(r.dow),
      revenue: Number(r.revenue),
      sales: Number(r.sales),
    })),
    topProducts,
    topCustomers: customerRows.map((c) => ({
      name: c.name,
      count: Number(c.count),
      revenue: Number(c.revenue),
      outstanding: Number(c.outstanding),
    })),
  }
}

/**
 * Product-level report: ranks every distinct line item across the range
 * by revenue, with quantity, share of total revenue, average unit price
 * and how many sales featured it.
 */
export async function getProductReport(startDate: string, endDate: string) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)

  const start = toBound(startDate)
  const end = toBound(endDate)

  const where = and(
    eq(sales.tenantId, tenantId),
    gte(saleDay, start),
    lte(saleDay, end),
  )

  const [kpis] = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(${sales.total}), 0)`.as('total_revenue'),
      totalSales: sql<number>`COUNT(*)`.as('total_sales'),
    })
    .from(sales)
    .where(where)

  const recent = await db
    .select({ id: sales.id, items: sales.items })
    .from(sales)
    .where(where)
    .orderBy(desc(sales.createdAt))
    .limit(5000)

  const totalRevenue = Number(kpis?.totalRevenue ?? 0)
  const totalSales = Number(kpis?.totalSales ?? 0)
  const productAggs = aggregateProducts(recent)

  const products = productAggs
    .map((p) => ({
      name: p.name,
      quantity: p.quantity,
      revenue: p.revenue,
      share: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0,
      avgPrice: p.quantity > 0 ? p.revenue / p.quantity : 0,
      salesCount: p.saleIds.size,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  return {
    totalRevenue,
    totalSales,
    totalUnits: products.reduce((sum, p) => sum + p.quantity, 0),
    productCount: products.length,
    topProduct: products[0]?.name ?? null,
    products,
  }
}

/**
 * Staff report: revenue and sales attributed to each team member who
 * recorded a sale in the range, joined against `users` for names.
 */
export async function getStaffReport(startDate: string, endDate: string) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)

  const start = toBound(startDate)
  const end = toBound(endDate)

  const where = and(
    eq(sales.tenantId, tenantId),
    gte(saleDay, start),
    lte(saleDay, end),
  )

  const [[kpis], staffRows] = await Promise.all([
    db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${sales.total}), 0)`.as('total_revenue'),
        totalSales: sql<number>`COUNT(*)`.as('total_sales'),
        outstanding: sql<number>`COALESCE(SUM(${sales.amountOwed}), 0)`.as('outstanding'),
      })
      .from(sales)
      .where(where),
    db
      .select({
        userId: sales.createdBy,
        name: users.name,
        count: sql<number>`COUNT(*)`.as('count'),
        revenue: sql<number>`COALESCE(SUM(${sales.total}), 0)`.as('revenue'),
        outstanding: sql<number>`COALESCE(SUM(${sales.amountOwed}), 0)`.as('outstanding'),
      })
      .from(sales)
      .leftJoin(users, eq(sales.createdBy, users.id))
      .where(where)
      .groupBy(sales.createdBy, users.name)
      .orderBy(desc(sql`COALESCE(SUM(${sales.total}), 0)`)),
  ])

  return {
    totalRevenue: Number(kpis?.totalRevenue ?? 0),
    totalSales: Number(kpis?.totalSales ?? 0),
    outstanding: Number(kpis?.outstanding ?? 0),
    activeStaff: staffRows.length,
    staff: staffRows.map((r) => ({
      userId: Number(r.userId),
      name: r.name ?? `User #${r.userId}`,
      salesCount: Number(r.count),
      revenue: Number(r.revenue),
      average: Number(r.count) > 0 ? Number(r.revenue) / Number(r.count) : 0,
      outstanding: Number(r.outstanding),
    })),
  }
}

export async function getActivities(limit = 50) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized', activities: [] }

  const db = await dbConnect()

  const logs = await db.select().from(auditLogs)
    .where(eq(auditLogs.tenantId, toNum(session.user.tenantId!)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)

  return { activities: serializeList(logs) }
}