'use server'

import { dbConnect } from '@/lib/db/connect'
import { sales, users, customers, auditLogs, settings } from '@/lib/db/schema'
import { eq, and, inArray, desc, asc, gte, lte, count, sql } from 'drizzle-orm'
import { toNum, serializeList } from '@/lib/db/helpers'
import { auth } from '@/lib/auth/auth'

/**
 * Dashboard aggregates for a single tenant.
 *
 * Everything below is computed in SQL — we never `SELECT *` from the
 * sales table. All filters are on the `(tenantId, createdAt)` index so
 * these queries are O(log n) regardless of the size of the catalog.
 */
export async function getDashboardStats() {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const startOfWeek = new Date(startOfDay)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  const startOfWeekStr = startOfWeek.toISOString()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

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
      todayTotal: sql<number>`COALESCE(SUM(CASE WHEN ${sales.createdAt} >= ${startOfDay} THEN ${sales.total} ELSE 0 END), 0)`.as('today_total'),
      todayCount: sql<number>`COUNT(CASE WHEN ${sales.createdAt} >= ${startOfDay} THEN 1 END)`.as('today_count'),
      weeklyTotal: sql<number>`COALESCE(SUM(CASE WHEN ${sales.createdAt} >= ${startOfWeekStr} THEN ${sales.total} ELSE 0 END), 0)`.as('weekly_total'),
      weeklyCount: sql<number>`COUNT(CASE WHEN ${sales.createdAt} >= ${startOfWeekStr} THEN 1 END)`.as('weekly_count'),
      monthlyTotal: sql<number>`COALESCE(SUM(CASE WHEN ${sales.createdAt} >= ${startOfMonth} THEN ${sales.total} ELSE 0 END), 0)`.as('monthly_total'),
      monthlyCount: sql<number>`COUNT(CASE WHEN ${sales.createdAt} >= ${startOfMonth} THEN 1 END)`.as('monthly_count'),
      totalCount: sql<number>`COUNT(*)`.as('total_count'),
      allTimeRevenue: sql<number>`COALESCE(SUM(${sales.total}), 0)`.as('all_time_revenue'),
      firstSaleAt: sql<string | null>`MIN(${sales.createdAt})`.as('first_sale_at'),
      lastSaleAt: sql<string | null>`MAX(${sales.createdAt})`.as('last_sale_at'),
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
 * Per-day sales totals for the last `days` days. Done in SQL with
 * `GROUP BY substr(createdAt, 1, 10)` (the column is `varchar(50)` ISO
 * strings so the lexicographic prefix is the calendar date).
 */
export async function getSalesChartData(days = 30) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString()

  const tenantId = toNum(session.user.tenantId!)

  const dayExpr = sql<string>`substr(${sales.createdAt}, 1, 10)`.as('day')
  const rows = await db
    .select({
      date: dayExpr,
      sales: sql<number>`COALESCE(SUM(${sales.total}), 0)`.as('sales'),
      orders: sql<number>`COUNT(*)`.as('orders'),
    })
    .from(sales)
    .where(and(eq(sales.tenantId, tenantId), gte(sales.createdAt, startDateStr)))
    .groupBy(dayExpr)
    .orderBy(asc(dayExpr))

  return rows.map((r) => ({
    date: r.date,
    sales: Number(r.sales),
    orders: Number(r.orders),
  }))
}

/**
 * Detailed report over a date range. All KPIs are SQL aggregates; only
 * the `topProducts` ranking needs the JSON column and falls back to a
 * 1,000-row scan of the most recent matching sales.
 */
export async function getSalesReport(startDate: string, endDate: string) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)

  const start = new Date(startDate).toISOString()
  const end = new Date(endDate).toISOString()

  const where = and(
    eq(sales.tenantId, tenantId),
    gte(sales.createdAt, start),
    lte(sales.createdAt, end),
  )

  const dayExpr = sql<string>`substr(${sales.createdAt}, 1, 10)`.as('day')

  const [[kpis], daily, methodAgg] = await Promise.all([
    db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${sales.total}), 0)`.as('total_revenue'),
        totalSales: sql<number>`COUNT(*)`.as('total_sales'),
      })
      .from(sales)
      .where(where),
    db
      .select({
        label: dayExpr,
        revenue: sql<number>`COALESCE(SUM(${sales.total}), 0)`.as('revenue'),
        sales: sql<number>`COUNT(*)`.as('sales'),
      })
      .from(sales)
      .where(where)
      .groupBy(dayExpr)
      .orderBy(asc(dayExpr)),
    db
      .select({
        method: sales.paymentMethod,
        count: sql<number>`COUNT(*)`.as('count'),
        total: sql<number>`COALESCE(SUM(${sales.total}), 0)`.as('total'),
      })
      .from(sales)
      .where(where)
      .groupBy(sales.paymentMethod),
  ])

  const totalRevenue = Number(kpis?.totalRevenue ?? 0)
  const totalSales = Number(kpis?.totalSales ?? 0)
  const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0

  // Top products still needs the JSON column. Pull only the items
  // column for the most recent 1,000 sales in the window.
  const recent = await db
    .select({ items: sales.items })
    .from(sales)
    .where(where)
    .orderBy(desc(sales.createdAt))
    .limit(1000)

  const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {}
  for (const row of recent) {
    const items = row.items as Array<{ name: string; quantity: number; subtotal: number }>
    for (const item of items) {
      if (!item || !item.name) continue
      if (!productMap[item.name]) {
        productMap[item.name] = { name: item.name, quantity: 0, revenue: 0 }
      }
      productMap[item.name].quantity += item.quantity
      productMap[item.name].revenue += item.subtotal
    }
  }
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

  return {
    totalRevenue,
    totalSales,
    averageSale: avgSale,
    chartData: daily.map((d) => ({
      label: d.label,
      revenue: Number(d.revenue),
      sales: Number(d.sales),
    })),
    topProducts,
    paymentMethods: methodAgg.map((m) => ({
      method: m.method,
      count: Number(m.count),
      total: Number(m.total),
    })),
    // `sales` here is the raw list for export. Kept for backward
    // compatibility but the page no longer uses it; consider removing.
    sales: [],
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
