import fs from 'fs'
import path from 'path'
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim()
        const val = trimmed.slice(eqIdx + 1).trim()
        if (key) process.env[key] = val
      }
    }
  }
}

import { dbConnect } from '../src/lib/db/connect'
import { sales, settings } from '../src/lib/db/schema'
import { eq, and, gte, lte, sql } from 'drizzle-orm'

async function main() {
  const db = await dbConnect()

  // Pick the first tenant that has sales.
  const tenants = await db.select().from(settings)
  console.log('Settings rows:', tenants.length, tenants.map((t) => ({ id: t.tenantId, name: t.storeName })))

  const tenantId = tenants[0]?.tenantId ?? 1

  // Try the dashboard aggregates query directly
  console.log('\n--- Dashboard aggregates query (tenant', tenantId, ') ---')
  try {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [agg] = await db
      .select({
        todayTotal: sql<number>`COALESCE(SUM(CASE WHEN ${sales.createdAt} >= ${startOfDay} THEN ${sales.total} ELSE 0 END), 0)`.as('today_total'),
        monthTotal: sql<number>`COALESCE(SUM(CASE WHEN ${sales.createdAt} >= ${startOfMonth} THEN ${sales.total} ELSE 0 END), 0)`.as('month_total'),
        monthCount: sql<number>`COUNT(CASE WHEN ${sales.createdAt} >= ${startOfMonth} THEN 1 END)`.as('month_count'),
        totalCount: sql<number>`COUNT(*)`.as('total_count'),
        allTimeRevenue: sql<number>`COALESCE(SUM(${sales.total}), 0)`.as('all_time_revenue'),
        firstSaleAt: sql<string | null>`MIN(${sales.createdAt})`.as('first_sale_at'),
        lastSaleAt: sql<string | null>`MAX(${sales.createdAt})`.as('last_sale_at'),
      })
      .from(sales)
      .where(eq(sales.tenantId, tenantId))
    console.log('OK:', JSON.stringify(agg, null, 2))
  } catch (e) {
    console.error('THREW:', (e as Error).message)
  }

  // Try the chart data query directly
  console.log('\n--- Chart data query (tenant', tenantId, ') ---')
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 365)
    const startDateStr = startDate.toISOString()
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
      .orderBy(sql`${dayExpr} ASC`)
    console.log('OK:', rows.length, 'rows')
    console.log('Sample:', JSON.stringify(rows.slice(0, 5), null, 2))
  } catch (e) {
    console.error('THREW:', (e as Error).message)
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
