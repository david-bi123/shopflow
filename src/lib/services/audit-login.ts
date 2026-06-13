import { dbConnect } from '@/lib/db/connect'
import { auditLogs, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Auth-event audit logging. These rows let us answer "who tried to log
 * in as whom, from where, and when" without relying on the user
 * being a real one. They're inserted into the same `audit_logs` table
 * the rest of the app uses, with the user's `tenantId` when known.
 *
 * For attempts against emails that don't map to a real user, the row
 * is written with `tenantId = 0` (a sentinel that doesn't correspond
 * to any real shop). The `tenants` table will get a row with id=0
 * seeded by the migration so the FK is satisfied.
 */

interface FailedLoginParams {
  email: string
  reason: 'no_user' | 'bad_password' | 'suspended' | 'rate_limited'
  userId?: number
}

export async function writeFailedLoginAudit({ email, reason, userId }: FailedLoginParams): Promise<void> {
  try {
    const db = await dbConnect()
    let tenantId = 0
    if (userId) {
      const [u] = await db
        .select({ tenantId: users.tenantId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
      if (u?.tenantId) tenantId = u.tenantId
    }
    await db.insert(auditLogs).values({
      tenantId,
      action: 'auth.login.failed',
      entity: 'Auth',
      entityId: userId ? String(userId) : email,
      performedBy: userId ?? 0,
      performedByName: email,
      details: { reason, email },
      createdAt: new Date().toISOString(),
    })
  } catch (err) {
    // Audit writes must never break the auth path. Swallow.
    console.error('[audit-login] failed to write failed-login audit', err)
  }
}

export async function writeSuccessLoginAudit({ email, userId }: { email: string; userId: number }): Promise<void> {
  try {
    const db = await dbConnect()
    const [u] = await db
      .select({ tenantId: users.tenantId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    const tenantId = u?.tenantId ?? 0
    await db.insert(auditLogs).values({
      tenantId,
      action: 'auth.login.success',
      entity: 'Auth',
      entityId: String(userId),
      performedBy: userId,
      performedByName: email,
      createdAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[audit-login] failed to write success-login audit', err)
  }
}

/**
 * Resolve the system-tenant id (0) — used as the fallback for auth
 * events that don't have a real shop to attribute to. This is exported
 * so callers (and the migration) can use the same value.
 */
export const SYSTEM_TENANT_ID = 0

