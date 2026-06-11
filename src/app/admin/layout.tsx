import { requireRole } from '@/lib/auth/guard'
import { AdminShell } from './admin-shell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireRole('super_admin')

  return (
    <AdminShell
      user={{
        name: user.name,
        email: user.email,
      }}
    >
      {children}
    </AdminShell>
  )
}
