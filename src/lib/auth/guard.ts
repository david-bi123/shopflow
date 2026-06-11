import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import type { Role } from '@/types'

export interface AuthedUser {
  id: string
  email: string
  name: string | null
  role: Role
  tenantId: string | null
}

export interface AuthedSession {
  user: AuthedUser
}

/**
 * Server-side auth guard. Use in server components, layouts, and server actions.
 *
 * - `requireUser()`: any authenticated user; redirects to /login otherwise.
 * - `requireRole(roles)`: only the listed roles; redirects others to /dashboard.
 * - `requireTenantUser()`: authenticated user that must have a tenantId (rejects super_admin).
 * - `getOptionalUser()`: returns user or null without redirecting.
 */
export async function getOptionalUser(): Promise<AuthedUser | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  return {
    id: String(session.user.id),
    email: session.user.email ?? '',
    name: session.user.name ?? null,
    role: (session.user as { role: Role }).role,
    tenantId: (session.user as { tenantId?: string | null }).tenantId ?? null,
  }
}

export async function requireUser(redirectTo = '/login'): Promise<AuthedUser> {
  const user = await getOptionalUser()
  if (!user) redirect(`${redirectTo}?callbackUrl=${encodeURIComponent('/dashboard')}`)
  return user
}

export async function requireRole(roles: Role | Role[]): Promise<AuthedUser> {
  const user = await requireUser()
  const allowed = Array.isArray(roles) ? roles : [roles]
  if (!allowed.includes(user.role)) {
    if (user.role === 'super_admin') redirect('/admin')
    redirect('/dashboard')
  }
  return user
}

export async function requireTenantUser(): Promise<AuthedUser & { tenantId: string }> {
  const user = await requireUser()
  if (user.role === 'super_admin' || !user.tenantId) {
    redirect('/admin')
  }
  return user as AuthedUser & { tenantId: string }
}
