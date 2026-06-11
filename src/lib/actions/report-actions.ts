'use server'

import { dbConnect } from '@/lib/db/connect'
import { sales, invoices, users, customers, auditLogs, settings } from '@/lib/db/schema'
import { eq, and, inArray, desc, asc, gte, lte, count, sql } from 'drizzle-orm'
import { toNum, serializeList } from '@/lib/db/helpers'
import { auth } from '@/lib/auth/auth'

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

  const [shopSettings] = await db.select({ storeName: settings.storeName }).from(settings)
    .where(eq(settings.tenantId, tenantId))
    .limit(1)

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
    shopName: shopSettings?.storeName ?? 'IndFlow',
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
    .map(([date, vals]) => ({ date, sales: vals.total, orders: vals.count }))
}

export async function getSalesReport(startDate: string, endDate: string) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)

  const result = await db.select().from(sales)
    .where(and(
      eq(sales.tenantId, tenantId),
      gte(sales.createdAt, new Date(startDate).toISOString()),
      lte(sales.createdAt, new Date(endDate).toISOString()),
    ))
    .orderBy(desc(sales.createdAt))

  const totalRevenue = result.reduce((sum, s) => sum + s.total, 0)
  const totalSales = result.length
  const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0

  const chartGrouped: Record<string, { revenue: number; sales: number }> = {}
  for (const record of result) {
    const date = record.createdAt.slice(0, 10)
    if (!chartGrouped[date]) chartGrouped[date] = { revenue: 0, sales: 0 }
    chartGrouped[date].revenue += record.total
    chartGrouped[date].sales += 1
  }
  const chartData = Object.entries(chartGrouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, vals]) => ({ label, ...vals }))

  const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {}
  for (const sale of result) {
    const items = sale.items as Array<{ name: string; quantity: number; subtotal: number }>
    for (const item of items) {
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

  const paymentGrouped: Record<string, { method: string; count: number; total: number }> = {}
  for (const sale of result) {
    const method = sale.paymentMethod
    if (!paymentGrouped[method]) paymentGrouped[method] = { method, count: 0, total: 0 }
    paymentGrouped[method].count += 1
    paymentGrouped[method].total += sale.total
  }
  const paymentMethods = Object.values(paymentGrouped)

  return {
    totalRevenue,
    totalSales,
    averageSale: avgSale,
    chartData,
    topProducts,
    paymentMethods,
    sales: serializeList(result),
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
