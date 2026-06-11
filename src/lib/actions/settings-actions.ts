'use server'

import { revalidatePath } from 'next/cache'
import { dbConnect } from '@/lib/db/connect'
import { settings as settingsTable } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { toNum, serializeRow } from '@/lib/db/helpers'
import { updateSettingsSchema } from '@/lib/validations/settings'
import { auth } from '@/lib/auth/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/roles'
import { createAuditLog } from '@/lib/services/audit'
import type { UpdateSettingsInput } from '@/lib/validations/settings'

const DEFAULT_TAXES = [
  { name: 'VAT', rate: 15, enabled: true },
  { name: 'NHIS', rate: 2.5, enabled: false },
  { name: 'GET Fund', rate: 2.5, enabled: false },
]

export async function getSettings() {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)

  let [settings] = await db.select().from(settingsTable)
    .where(eq(settingsTable.tenantId, tenantId))
    .limit(1)

  if (!settings) {
    await db.insert(settingsTable).values({
      tenantId,
      storeName: 'My Store',
      storeDescription: null,
      taxNumber: null,
      receiptFooter: 'Thank you for your purchase!',
      defaultPaymentMethods: ['cash', 'card', 'mobile_money'],
      taxes: DEFAULT_TAXES,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    const [newSettings] = await db.select().from(settingsTable)
      .where(eq(settingsTable.tenantId, tenantId))
      .limit(1)
    settings = newSettings
  }

  return { settings: serializeRow(settings) }
}

export async function updateSettings(data: UpdateSettingsInput) {
  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  if (!hasPermission(session.user.role, PERMISSIONS.settings.update)) return { error: 'Forbidden' }

  const validated = updateSettingsSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0].message }

  const db = await dbConnect()
  const tenantId = toNum(session.user.tenantId!)

  const existing = await db.select({ id: settingsTable.id }).from(settingsTable)
    .where(eq(settingsTable.tenantId, tenantId))
    .limit(1)

  let settings: typeof settingsTable.$inferSelect

  const updateData = {
    ...validated.data,
    receiptFooter: validated.data.receiptFooter || 'Thank you for your purchase!',
    showLogoOnReceipt: validated.data.showLogoOnReceipt ? 1 : 0,
    showQrOnReceipt: validated.data.showQrOnReceipt ? 1 : 0,
    updatedAt: new Date().toISOString(),
  }

  if (existing.length > 0) {
    await db.update(settingsTable).set(updateData).where(eq(settingsTable.tenantId, tenantId))
    const [updated] = await db.select().from(settingsTable)
      .where(eq(settingsTable.tenantId, tenantId))
      .limit(1)
    settings = updated!
  } else {
    const insertData = {
      tenantId,
      ...updateData,
      createdAt: new Date().toISOString(),
    }
    await db.insert(settingsTable).values(insertData)
    const [created] = await db.select().from(settingsTable)
      .where(eq(settingsTable.tenantId, tenantId))
      .limit(1)
    settings = created!
  }

  await createAuditLog({
    tenantId,
    action: 'settings.updated',
    entity: 'Setting',
    entityId: String(settings.id),
    performedBy: toNum(session.user.id),
    performedByName: session.user.name || 'Unknown',
  })

  revalidatePath('/settings')
  return { success: true, settings: serializeRow(settings) }
}

export async function getStoreInfo(tenantId?: string) {
  if (!tenantId) return null

  const db = await dbConnect()

  const [settings] = await db.select().from(settingsTable)
    .where(eq(settingsTable.tenantId, toNum(tenantId)))
    .limit(1)

  if (!settings) return null

  return serializeRow(settings)
}
