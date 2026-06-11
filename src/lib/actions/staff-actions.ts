'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { dbConnect } from '@/lib/db/connect'
import { users } from '@/lib/db/schema'
import { eq, and, inArray, desc, count } from 'drizzle-orm'
import { toNum, serializeRow, serializeList } from '@/lib/db/helpers'
import { inviteStaffSchema, updateStaffSchema } from '@/lib/validations/staff'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/roles'
import { generatePassword } from '@/lib/utils/format'
import { createAuditLog } from '@/lib/services/audit'
import type { InviteStaffInput } from '@/lib/validations/staff'

export async function inviteStaff(data: InviteStaffInput) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  if (!hasPermission(session.user.role, PERMISSIONS.staff.create)) return { error: 'Forbidden' }

  const validated = inviteStaffSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0].message }

  const db = await dbConnect()

  const tenantId = toNum(session.user.tenantId!)

  const [existing] = await db.select().from(users)
    .where(and(eq(users.email, data.email), eq(users.tenantId, tenantId)))
    .limit(1)

  if (existing) return { error: 'A staff member with this email already exists' }

  const tempPassword = generatePassword()

  const hashedPassword = await bcrypt.hash(tempPassword, 12)

  const result = await db.insert(users).values({
    tenantId,
    name: data.name,
    email: data.email,
    password: hashedPassword,
    role: data.role,
    permissions: data.permissions || [],
    status: 'invited',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  const [staff] = await db.select().from(users).where(eq(users.id, result[0].insertId))

  await createAuditLog({
    tenantId,
    action: 'staff.invited',
    entity: 'User',
    entityId: String(staff.id),
    performedBy: toNum(session.user.id),
    performedByName: session.user.name || 'Unknown',
    details: { staffName: data.name, staffEmail: data.email, role: data.role },
  })

  revalidatePath('/staff')
  return { success: true, tempPassword }
}

export async function getStaff(page = 1, limit = 20) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  if (!hasPermission(session.user.role, PERMISSIONS.staff.read)) return { error: 'Forbidden' }

  const db = await dbConnect()

  const tenantId = toNum(session.user.tenantId!)
  const whereClause = and(
    eq(users.tenantId, tenantId),
    inArray(users.role, ['admin', 'staff']),
  )

  const [totalResult] = await db.select({ total: count() }).from(users).where(whereClause)
  const total = totalResult?.total ?? 0

  const result = await db.select({
    id: users.id,
    tenantId: users.tenantId,
    name: users.name,
    email: users.email,
    role: users.role,
    permissions: users.permissions,
    status: users.status,
    lastLogin: users.lastLogin,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  }).from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt))
    .offset((page - 1) * limit)
    .limit(limit)

  return {
    staff: serializeList(result),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export async function updateStaff(id: string, data: Record<string, unknown>) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  if (!hasPermission(session.user.role, PERMISSIONS.staff.update)) return { error: 'Forbidden' }

  const validated = updateStaffSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0].message }

  const db = await dbConnect()

  await db.update(users).set({
    ...validated.data,
    updatedAt: new Date().toISOString(),
  }).where(and(eq(users.id, toNum(id)), eq(users.tenantId, toNum(session.user.tenantId!))))
  const [staff] = await db.select({
    id: users.id,
    tenantId: users.tenantId,
    name: users.name,
    email: users.email,
    role: users.role,
    permissions: users.permissions,
    status: users.status,
    lastLogin: users.lastLogin,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  }).from(users).where(and(eq(users.id, toNum(id)), eq(users.tenantId, toNum(session.user.tenantId!))))

  if (!staff) return { error: 'Staff member not found' }

  revalidatePath('/staff')
  return { success: true, staff: serializeRow(staff) }
}

export async function deleteStaff(id: string) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  if (!hasPermission(session.user.role, PERMISSIONS.staff.delete)) return { error: 'Forbidden' }

  const db = await dbConnect()

  const tenantId = toNum(session.user.tenantId!)

  const [staff] = await db.select().from(users)
    .where(and(
      eq(users.id, toNum(id)),
      eq(users.tenantId, tenantId),
      inArray(users.role, ['admin', 'staff']),
    ))
  await db.delete(users)
    .where(and(
      eq(users.id, toNum(id)),
      eq(users.tenantId, tenantId),
      inArray(users.role, ['admin', 'staff']),
    ))

  if (!staff) return { error: 'Staff member not found' }

  await createAuditLog({
    tenantId,
    action: 'staff.removed',
    entity: 'User',
    entityId: id,
    performedBy: toNum(session.user.id),
    performedByName: session.user.name || 'Unknown',
    details: { staffName: staff.name },
  })

  revalidatePath('/staff')
  return { success: true }
}
