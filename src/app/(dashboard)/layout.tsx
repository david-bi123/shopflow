import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { AppShell } from '@/components/layout/app-shell'
import { GlobalErrorCatcher } from '@/components/shared/global-error-catcher'
import type { Role } from '@/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/dashboard')
  }

  if ((session.user as { role: Role }).role === 'super_admin') {
    redirect('/admin')
  }

  const user = {
    id: String(session.user.id),
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    role: (session.user as { role: Role }).role,
    tenantId: (session.user as { role: Role; tenantId?: string | null }).tenantId ?? null,
  }

  return (
    <>
      <AppShell user={user}>{children}</AppShell>
      <GlobalErrorCatcher />
    </>
  )
}
