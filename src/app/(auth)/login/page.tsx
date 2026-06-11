import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { LoginForm } from './login-form'
import type { Role } from '@/types'

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth()
  const { callbackUrl } = await searchParams

  if (session?.user?.id) {
    const role = (session.user as { role: Role }).role
    if (role === 'super_admin') redirect('/admin')
    redirect(callbackUrl || '/dashboard')
  }

  return <LoginForm callbackUrl={callbackUrl} />
}
