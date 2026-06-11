'use server'

import bcrypt from 'bcryptjs'
import { dbConnect } from '@/lib/db/connect'
import { tenants, users, settings as settingsTable, subscriptions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { registerSchema } from '@/lib/validations/auth'
import { slugify } from '@/lib/utils/format'
import { AuthError } from 'next-auth'
import { signIn } from '@/lib/auth/auth'

export async function registerShop(formData: FormData) {
  const raw = {
    shopName: formData.get('shopName') as string,
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    phone: formData.get('phone') as string,
  }

  const validated = registerSchema.safeParse(raw)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const db = await dbConnect()

  const existingUser = await db.select().from(users).where(eq(users.email, raw.email)).limit(1)
  if (existingUser.length > 0) {
    return { error: 'An account with this email already exists' }
  }

  const slug = slugify(raw.shopName)
  const existingSlug = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1)
  if (existingSlug.length > 0) {
    return { error: 'A shop with this name already exists' }
  }

  const hashedPassword = await bcrypt.hash(raw.password, 12)

  await db.insert(tenants).values({
    name: raw.shopName,
    slug,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1)

  if (!tenant) return { error: 'Failed to create shop' }

  await db.insert(users).values({
    tenantId: tenant.id,
    name: raw.name,
    email: raw.email,
    password: hashedPassword,
    role: 'owner',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  await db.insert(settingsTable).values({
    tenantId: tenant.id,
    storeName: raw.shopName,
    currency: 'GHS',
    storePhone: raw.phone || '',
    receiptFooter: 'Thank you for your purchase!',
    defaultPaymentMethods: ['cash', 'card', 'mobile_money'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  await db.insert(subscriptions).values({
    tenantId: tenant.id,
    plan: 'free',
    status: 'trial',
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  return { success: true, slug }
}

export async function loginAction(data: { email: string; password: string }) {
  try {
    const db = await dbConnect()
    const [user] = await db.select().from(users).where(eq(users.email, data.email)).limit(1)
    if (!user) return { error: 'Invalid email or password' }

    if (user.status === 'suspended') return { error: 'Account has been suspended' }

    if (user.role !== 'super_admin') {
      if (!user.tenantId) return { error: 'Invalid email or password' }

      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId)).limit(1)
      if (!tenant) return { error: 'Invalid email or password' }

      if (tenant.status === 'pending') return { redirectTo: '/pending-approval' }
      if (tenant.status === 'suspended') return { error: 'Your shop has been suspended' }
      if (tenant.status === 'rejected') return { error: 'Your registration was not approved' }
    }

    await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    const redirectTo = user.role === 'super_admin' ? '/admin' : '/dashboard'
    return { redirectTo }
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Invalid email or password' }
    }
    if (error instanceof Error && (error.message?.includes('NEXT_REDIRECT') || error.message?.includes('redirect'))) {
      throw error
    }
    return { error: 'Something went wrong' }
  }
}

export async function getCurrentUser() {
  const { auth } = await import('@/lib/auth/auth')
  const session = await auth()
  return session?.user || null
}
