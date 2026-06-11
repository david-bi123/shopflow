import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { ForgotPasswordForm } from './forgot-password-form'
import type { Role } from '@/types'

export default async function ForgotPasswordPage() {
  const session = await auth()
  if (session?.user?.id) {
    const role = (session.user as { role: Role }).role
    redirect(role === 'super_admin' ? '/admin' : '/dashboard')
  }
  return <ForgotPasswordForm />
}
