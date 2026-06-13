import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { ResetPasswordForm } from './reset-password-form'
import type { Role } from '@/types'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const session = await auth()
  if (session?.user?.id) {
    const role = (session.user as { role: Role }).role
    redirect(role === 'super_admin' ? '/admin' : '/dashboard')
  }
  const { token } = await searchParams
  if (!token) {
    redirect('/forgot-password')
  }
  return <ResetPasswordForm token={token} />
}
