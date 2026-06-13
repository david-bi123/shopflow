import { dbConnect } from '@/lib/db/connect'
import { auditLogs } from '@/lib/db/schema'
import { headers } from 'next/headers'

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

/**
 * Best-effort client IP extraction that mirrors the edge rate limiter
 * (x-forwarded-for first hop, then x-real-ip, then cf-connecting-ip).
 * Imported lazily inside the function so the module can be loaded in
 * non-request contexts (e.g. from a cron) without throwing.
 */
async function tryGetRequestContext(): Promise<{ ip?: string; userAgent?: string }> {
  try {
    const h = await headers()
    const xff = h.get('x-forwarded-for')
    const ip = xff ? xff.split(',')[0].trim()
      : h.get('x-real-ip') ?? h.get('cf-connecting-ip') ?? undefined
    const userAgent = h.get('user-agent') ?? undefined
    return { ip: ip || undefined, userAgent: userAgent || undefined }
  } catch {
    // `headers()` is only valid in a request context. When called from
    // a script or a non-request entry point, swallow and let the caller
    // pass the values explicitly.
    return {}
  }
}

export async function createAuditLog(params: CreateAuditLogParams) {
  const db = await dbConnect()

  // Auto-fill ip/user-agent from the current request if the caller
  // didn't supply them. Every call site in this codebase was passing
  // `undefined` previously, which is why the audit log had no
  // forensics data.
  const ctx = (params.ip === undefined || params.userAgent === undefined)
    ? await tryGetRequestContext()
    : {}

  await db.insert(auditLogs).values({
    tenantId: params.tenantId,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    performedBy: params.performedBy,
    performedByName: params.performedByName,
    details: params.details,
    ip: params.ip ?? ctx.ip ?? null,
    userAgent: params.userAgent ?? ctx.userAgent ?? null,
    createdAt: new Date().toISOString(),
  })
}
