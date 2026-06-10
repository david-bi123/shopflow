'use server'

import { revalidatePath } from 'next/cache'
import { dbConnect } from '@/lib/db/connect'
import { tenants, users, sales, invoices, announcements } from '@/lib/db/schema'
import { eq, desc, count, isNotNull } from 'drizzle-orm'
import { toNum, serializeRow, serializeList } from '@/lib/db/helpers'
import { auth } from '@/lib/auth/auth'

export async function getTenants(page = 1, limit = 20, status?: string) {
  const session = await auth()
  if (session?.user?.role !== 'super_admin') return { error: 'Unauthorized' }

  const db = await dbConnect()

  const conditions = []
  if (status) conditions.push(eq(tenants.status, status as 'pending' | 'active' | 'suspended' | 'rejected'))

  const whereClause = conditions.length > 0 ? conditions[0] : undefined

  const [totalResult] = await db.select({ total: count() }).from(tenants).where(whereClause)
  const total = totalResult?.total ?? 0

  const result = await db.select().from(tenants)
    .where(whereClause)
    .orderBy(desc(tenants.createdAt))
    .offset((page - 1) * limit)
    .limit(limit)

  return {
    tenants: serializeList(result),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export async function updateTenantStatus(id: string, status: 'pending' | 'active' | 'suspended' | 'rejected') {
  const session = await auth()
  if (session?.user?.role !== 'super_admin') return { error: 'Unauthorized' }

  const db = await dbConnect()

  await db.update(tenants).set({
    status,
    updatedAt: new Date().toISOString(),
  }).where(eq(tenants.id, toNum(id)))

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, toNum(id)))

  if (!tenant) return { error: 'Tenant not found' }

  revalidatePath('/admin/shops')
  return { success: true, tenant: serializeRow(tenant) }
}

export async function getPlatformStats() {
  const session = await auth()
  if (session?.user?.role !== 'super_admin') return { error: 'Unauthorized' }

  const db = await dbConnect()

  const [totalTenants, activeTenants, pendingTenants, totalSales, totalInvoices] =
    await Promise.all([
      db.select({ total: count() }).from(tenants).then(r => r[0]?.total ?? 0),
      db.select({ total: count() }).from(tenants).where(eq(tenants.status, 'active')).then(r => r[0]?.total ?? 0),
      db.select({ total: count() }).from(tenants).where(eq(tenants.status, 'pending')).then(r => r[0]?.total ?? 0),
      db.select({ total: count() }).from(sales).then(r => r[0]?.total ?? 0),
      db.select({ total: count() }).from(invoices).then(r => r[0]?.total ?? 0),
    ])

  const allSales = await db.select({ total: sales.total }).from(sales)
  const totalRevenue = allSales.reduce((sum, s) => sum + s.total, 0)

  return {
    totalTenants,
    activeTenants,
    pendingTenants,
    totalSales,
    totalInvoices,
    totalRevenue,
  }
}

export async function getAnnouncements() {
  const db = await dbConnect()

  const result = await db.select().from(announcements)
    .where(eq(announcements.active, 1))
    .orderBy(desc(announcements.createdAt))

  return serializeList(result)
}

export async function createAnnouncement(data: { title: string; message: string; priority: 'low' | 'medium' | 'high' }) {
  const session = await auth()
  if (session?.user?.role !== 'super_admin') return { error: 'Unauthorized' }

  const db = await dbConnect()

  await db.insert(announcements).values({
    title: data.title,
    message: data.message,
    priority: data.priority,
    createdBy: toNum(session.user.id),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  revalidatePath('/admin/announcements')
  return { success: true }
}
