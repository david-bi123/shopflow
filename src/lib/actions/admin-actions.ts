'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { dbConnect } from '@/lib/db/connect'
import {
  tenants,
  users,
  sales,
  announcements,
  auditLogs,
  settings as settingsTable,
  subscriptions,
} from '@/lib/db/schema'
import { eq, desc, count } from 'drizzle-orm'
import { toNum, serializeRow, serializeList } from '@/lib/db/helpers'
import { auth } from '@/lib/auth/auth'
import { slugify } from '@/lib/utils/format'
import { createShopSchema } from '@/lib/validations/admin'

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

/**
 * Create a brand-new shop directly from the super admin dashboard.
 *
 * The super admin supplies the shop name plus the default owner
 * credentials (email + password). A tenant row, its settings and
 * subscription are created, and the owner account is active
 * immediately — no pending-approval step, because an admin is the
 * one creating it. The owner can then sign in and manage the shop.
 */
export async function createTenant(data: { shopName: string; ownerEmail: string; ownerPassword: string }) {
  const session = await auth()
  if (session?.user?.role !== 'super_admin') return { error: 'Unauthorized' }

  const validated = createShopSchema.safeParse(data)
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? 'Invalid input' }
  }

  const db = await dbConnect()

  const email = validated.data.ownerEmail.toLowerCase().trim()

  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existingUser.length > 0) {
    return { error: 'An account with this email already exists' }
  }

  const slug = slugify(validated.data.shopName)
  const existingSlug = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1)
  if (existingSlug.length > 0) {
    return { error: 'A shop with this name already exists' }
  }

  const hashedPassword = await bcrypt.hash(validated.data.ownerPassword, 12)
  const now = new Date().toISOString()
  const ownerName = displayNameFromEmail(email)

  await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(tenants).values({
      name: validated.data.shopName,
      slug,
      status: 'active',
      subscriptionStatus: 'active',
      subscriptionPlan: 'business',
      createdAt: now,
      updatedAt: now,
    }).$returningId()

    const tenantId = inserted?.id
    if (!tenantId) throw new Error('Failed to create shop')

    await tx.insert(users).values({
      tenantId,
      name: ownerName,
      email,
      password: hashedPassword,
      role: 'owner',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })

    await tx.insert(settingsTable).values({
      tenantId,
      storeName: validated.data.shopName,
      currency: 'GHS',
      timezone: 'Africa/Accra',
      receiptFooter: 'Thank you for your purchase!',
      defaultPaymentMethods: ['cash', 'card', 'mobile_money'],
      taxes: [],
      createdAt: now,
      updatedAt: now,
    })

    await tx.insert(subscriptions).values({
      tenantId,
      plan: 'business',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
    })

    await tx.insert(auditLogs).values({
      tenantId,
      action: 'tenant.created',
      entity: 'Tenant',
      entityId: String(tenantId),
      performedBy: toNum(session.user.id),
      performedByName: session.user.name ?? session.user.email ?? 'Super Admin',
      details: { shopName: validated.data.shopName, slug, ownerEmail: email },
      createdAt: now,
    })
  })

  revalidatePath('/admin/shops')
  return { success: true, slug }
}

function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  const parts = local.split(/[._-]+/).filter(Boolean)
  const name = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ')
  return name || 'Shop Owner'
}

export async function getPlatformStats() {
  const session = await auth()
  if (session?.user?.role !== 'super_admin') return { error: 'Unauthorized' }

  const db = await dbConnect()

  const [totalTenants, activeTenants, pendingTenants, suspendedTenants, totalSales, totalUsers] =
    await Promise.all([
      db.select({ total: count() }).from(tenants).then(r => r[0]?.total ?? 0),
      db.select({ total: count() }).from(tenants).where(eq(tenants.status, 'active')).then(r => r[0]?.total ?? 0),
      db.select({ total: count() }).from(tenants).where(eq(tenants.status, 'pending')).then(r => r[0]?.total ?? 0),
      db.select({ total: count() }).from(tenants).where(eq(tenants.status, 'suspended')).then(r => r[0]?.total ?? 0),
      db.select({ total: count() }).from(sales).then(r => r[0]?.total ?? 0),
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
    ...serializeRow(tenant),
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
