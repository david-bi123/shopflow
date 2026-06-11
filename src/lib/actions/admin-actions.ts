'use server'

import { revalidatePath } from 'next/cache'
import { dbConnect } from '@/lib/db/connect'
import { tenants, users, sales, invoices, announcements, auditLogs } from '@/lib/db/schema'
import { eq, desc, count } from 'drizzle-orm'
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

  const [totalTenants, activeTenants, pendingTenants, suspendedTenants, totalSales, totalInvoices, totalUsers] =
    await Promise.all([
      db.select({ total: count() }).from(tenants).then(r => r[0]?.total ?? 0),
      db.select({ total: count() }).from(tenants).where(eq(tenants.status, 'active')).then(r => r[0]?.total ?? 0),
      db.select({ total: count() }).from(tenants).where(eq(tenants.status, 'pending')).then(r => r[0]?.total ?? 0),
      db.select({ total: count() }).from(tenants).where(eq(tenants.status, 'suspended')).then(r => r[0]?.total ?? 0),
      db.select({ total: count() }).from(sales).then(r => r[0]?.total ?? 0),
      db.select({ total: count() }).from(invoices).then(r => r[0]?.total ?? 0),
      db.select({ total: count() }).from(users).then(r => r[0]?.total ?? 0),
    ])

  const allSales = await db.select({ total: sales.total }).from(sales)
  const totalRevenue = allSales.reduce((sum, s) => sum + s.total, 0)

  return {
    totalTenants,
    activeTenants,
    pendingTenants,
    suspendedTenants,
    totalSales,
    totalInvoices,
    totalRevenue,
    totalUsers,
  }
}

export async function getRecentPlatformActivity(limit = 10) {
  const session = await auth()
  if (session?.user?.role !== 'super_admin') return { error: 'Unauthorized' }

  const db = await dbConnect()

  const logs = await db.select({
    id: auditLogs.id,
    action: auditLogs.action,
    entity: auditLogs.entity,
    entityId: auditLogs.entityId,
    performedByName: auditLogs.performedByName,
    details: auditLogs.details,
    createdAt: auditLogs.createdAt,
  }).from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)

  return serializeList(logs)
}

export async function getAnnouncements() {
  const db = await dbConnect()

  const result = await db.select().from(announcements)
    .where(eq(announcements.active, 1))
    .orderBy(desc(announcements.createdAt))

  return serializeList(result)
}

export async function getTenantDetails(id: string) {
  const session = await auth()
  if (session?.user?.role !== 'super_admin') return { error: 'Unauthorized' }

  const db = await dbConnect()

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, toNum(id)))
  if (!tenant) return { error: 'Tenant not found' }

  const tenantUsers = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    status: users.status,
    lastLogin: users.lastLogin,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.tenantId, toNum(id)))

  return {
    tenant: serializeRow(tenant),
    users: serializeList(tenantUsers),
  }
}

export async function getTenantGrowth() {
  const session = await auth()
  if (session?.user?.role !== 'super_admin') return { error: 'Unauthorized' }

  const db = await dbConnect()
  const allTenants = await db.select({ createdAt: tenants.createdAt }).from(tenants).orderBy(tenants.createdAt)

  const monthlyMap: Record<string, number> = {}
  for (const t of allTenants) {
    const month = t.createdAt?.substring(0, 7) ?? 'unknown'
    monthlyMap[month] = (monthlyMap[month] ?? 0) + 1
  }

  const growth = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }))

  return { growth }
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
