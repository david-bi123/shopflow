import { dbConnect } from '@/lib/db/connect'
import { auditLogs } from '@/lib/db/schema'

interface CreateAuditLogParams {
  tenantId: number
  action: string
  entity: string
  entityId?: string
  performedBy: number
  performedByName: string
  details?: Record<string, unknown>
  ip?: string
  userAgent?: string
}

export async function createAuditLog(params: CreateAuditLogParams) {
  const db = await dbConnect()

  await db.insert(auditLogs).values({
    tenantId: params.tenantId,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    performedBy: params.performedBy,
    performedByName: params.performedByName,
    details: params.details,
    ip: params.ip,
    userAgent: params.userAgent,
    createdAt: new Date().toISOString(),
  })
}
