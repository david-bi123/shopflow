import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { RegisterForm } from './register-form'
import type { Role } from '@/types'

export default async function RegisterPage() {
  const session = await auth()
  if (session?.user?.id) {
    const role = (session.user as { role: Role }).role
    redirect(role === 'super_admin' ? '/admin' : '/dashboard')
  }

  return <RegisterForm />
}
