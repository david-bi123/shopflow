'use server'

import { revalidatePath } from 'next/cache'
import { dbConnect } from '@/lib/db/connect'
import { notifications } from '@/lib/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import { toNum, serializeList } from '@/lib/db/helpers'
import { auth } from '@/lib/auth/auth'

export async function getNotifications(page = 1, limit = 20) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()

  const tenantId = toNum(session.user.tenantId!)
  const userId = toNum(session.user.id)
  const whereClause = and(eq(notifications.tenantId, tenantId), eq(notifications.userId, userId))

  const [totalResult] = await db.select({ total: count() }).from(notifications).where(whereClause)
  const total = totalResult?.total ?? 0

  const result = await db.select().from(notifications)
    .where(whereClause)
    .orderBy(desc(notifications.createdAt))
    .offset((page - 1) * limit)
    .limit(limit)

  return {
    notifications: serializeList(result),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export async function getUnreadCount() {
  const session = await auth()
  if (!session?.user) return 0

  const db = await dbConnect()

  const [result] = await db.select({ total: count() }).from(notifications)
    .where(and(
      eq(notifications.tenantId, toNum(session.user.tenantId!)),
      eq(notifications.userId, toNum(session.user.id)),
      eq(notifications.read, 0),
    ))

  return result?.total ?? 0
}

export async function markNotificationRead(id: string) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()

  await db.update(notifications).set({ read: 1 })
    .where(and(
      eq(notifications.id, toNum(id)),
      eq(notifications.tenantId, toNum(session.user.tenantId!)),
      eq(notifications.userId, toNum(session.user.id)),
    ))

  revalidatePath('/dashboard/notifications')
  return { success: true }
}

export async function markAllNotificationsRead() {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()

  await db.update(notifications).set({ read: 1 })
    .where(and(
      eq(notifications.tenantId, toNum(session.user.tenantId!)),
      eq(notifications.userId, toNum(session.user.id)),
      eq(notifications.read, 0),
    ))

  revalidatePath('/dashboard/notifications')
  return { success: true }
}
