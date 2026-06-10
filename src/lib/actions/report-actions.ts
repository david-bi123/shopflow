'use server'

import { dbConnect } from '@/lib/db/connect'
import { sales, invoices, users, customers, auditLogs } from '@/lib/db/schema'
import { eq, and, inArray, desc, asc, gte, lte, count } from 'drizzle-orm'
import { toNum, serializeList } from '@/lib/db/helpers'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/roles'

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

  const allSales = await db.select().from(sales).where(eq(sales.tenantId, tenantId))

  const todaySales = allSales.filter(s => s.createdAt >= startOfDay)
  const weeklySales = allSales.filter(s => s.createdAt >= startOfWeekStr)
  const monthlySales = allSales.filter(s => s.createdAt >= startOfMonth)

  const calcAgg = (list: typeof allSales) => ({
    total: list.reduce((sum, s) => sum + s.total, 0),
    count: list.length,
  })

  const today = calcAgg(todaySales)
  const weekly = calcAgg(weeklySales)
  const monthly = calcAgg(monthlySales)

  const totalSalesCount = allSales.length

  const [totalInvoices] = await db.select({ total: count() }).from(invoices)
    .where(eq(invoices.tenantId, tenantId))

  const [totalCustomers] = await db.select({ total: count() }).from(customers)
    .where(eq(customers.tenantId, tenantId))

  const [totalStaff] = await db.select({ total: count() }).from(users)
    .where(and(
      eq(users.tenantId, tenantId),
      inArray(users.role, ['admin', 'staff']),
    ))

  const productMap: Record<string, { name: string; total: number; revenue: number }> = {}
  for (const sale of allSales) {
    const items = sale.items as Array<{ name: string; quantity: number; subtotal: number }>
    for (const item of items) {
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

  return {
    todaySales: today.total,
    todaySalesCount: today.count,
    weeklySales: weekly.total,
    weeklySalesCount: weekly.count,
    monthlySales: monthly.total,
    monthlySalesCount: monthly.count,
    totalSalesCount,
    totalInvoices: totalInvoices?.total ?? 0,
    totalCustomers: totalCustomers?.total ?? 0,
    totalStaff: totalStaff?.total ?? 0,
    topProducts,
  }
}

export async function getSalesChartData(days = 30) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString()

  const tenantId = toNum(session.user.tenantId!)

  const records = await db.select().from(sales)
    .where(and(
      eq(sales.tenantId, tenantId),
      gte(sales.createdAt, startDateStr),
    ))
    .orderBy(asc(sales.createdAt))

  const grouped: Record<string, { total: number; count: number }> = {}
  for (const record of records) {
    const date = record.createdAt.slice(0, 10)
    if (!grouped[date]) grouped[date] = { total: 0, count: 0 }
    grouped[date].total += record.total
    grouped[date].count += 1
  }

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, total: vals.total, count: vals.count }))
}

export async function getSalesReport(startDate: string, endDate: string) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()

  const result = await db.select().from(sales)
    .where(and(
      eq(sales.tenantId, toNum(session.user.tenantId!)),
      gte(sales.createdAt, new Date(startDate).toISOString()),
      lte(sales.createdAt, new Date(endDate).toISOString()),
    ))
    .orderBy(desc(sales.createdAt))

  const totalRevenue = result.reduce((sum, s) => sum + s.total, 0)
  const totalSales = result.length
  const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0

  return {
    sales: serializeList(result),
    summary: { totalRevenue, totalSales, avgSale },
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
