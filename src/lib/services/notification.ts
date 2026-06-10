import { dbConnect } from '@/lib/db/connect'
import { notifications } from '@/lib/db/schema'
import type { NotificationType } from '@/types'

interface CreateNotificationParams {
  tenantId: number
  userId: number
  type: NotificationType
  title: string
  message: string
  link?: string
}

export async function createNotification(params: CreateNotificationParams) {
  const db = await dbConnect()

  await db.insert(notifications).values({
    tenantId: params.tenantId,
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link,
    createdAt: new Date().toISOString(),
  })
}
