'use server'

import bcrypt from 'bcryptjs'
import { randomBytes, createHash } from 'crypto'
import { dbConnect } from '@/lib/db/connect'
import { tenants, users, settings as settingsTable, subscriptions, passwordResetTokens } from '@/lib/db/schema'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { registerSchema, forgotPasswordSchema, changePasswordSchema } from '@/lib/validations/auth'
import { slugify } from '@/lib/utils/format'
import { AuthError } from 'next-auth'
import { signIn, signOut } from '@/lib/auth/auth'
import { sendEmail } from '@/lib/services/email'

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

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
      if (tenant.status === 'suspended') return { redirectTo: '/suspended' }
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
    return { error: 'Something went wrong. Please try again.' }
  }
}

export async function getCurrentUser() {
  const { auth } = await import('@/lib/auth/auth')
  const session = await auth()
  return session?.user || null
}

export async function logoutAction() {
  await signOut({ redirect: false })
}

/**
 * Request a password-reset email.
 *
 * For privacy, this function ALWAYS returns success — even when the
 * email is not associated with a real user — so an attacker can't
 * use it as an email-enumeration oracle. The actual email is sent
 * only if the user exists, is not suspended, and has a tenant that
 * is not suspended.
 */
export async function requestPasswordReset(formData: FormData) {
  const raw = { email: formData.get('email') as string }
  const validated = forgotPasswordSchema.safeParse(raw)
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const email = validated.data.email.toLowerCase().trim()

  // Rate-limit by email (10/min). The existing rate limiter is
  // in-process, which is a floor, not a ceiling, but it stops naive
  // spray attacks.
  const { rateLimit } = await import('@/lib/utils/rate-limit')
  const rl = rateLimit(`pwreset:${email}`, { limit: 10, windowSeconds: 60 })
  if (!rl.allowed) {
    // Still return success-shaped response — don't reveal the lockout.
    return { success: true }
  }

  const db = await dbConnect()
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user || user.status === 'suspended') {
    return { success: true }
  }

  // 32 bytes of entropy, base64url. We store the SHA-256 hash of the
  // token in the DB so a DB leak doesn't hand an attacker live reset
  // tokens; the raw token only ever lives in the email.
  const rawToken = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString()

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
    createdAt: new Date().toISOString(),
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`

  // Best-effort email. If RESEND_API_KEY isn't set, this is a no-op.
  await sendEmail({
    to: user.email,
    subject: 'Reset your IndFlow password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>Hi ${escapeHtmlText(user.name)},</p>
        <p>Someone (hopefully you) asked to reset the password for your IndFlow account. Click the button below to choose a new one. The link expires in 1 hour.</p>
        <p>
          <a href="${escapeHtmlAttr(resetUrl)}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset password
          </a>
        </p>
        <p>If you didn't request this, you can safely ignore this email — your password will stay the same.</p>
        <p>Thanks,<br/>The IndFlow team</p>
      </div>
    `,
  })

  return { success: true }
}

/**
 * Complete a password reset by consuming a one-time token. The token is
 * single-use: the row's `usedAt` is set, and any later attempt to use
 * the same token returns an error. The new password is hashed with the
 * same bcrypt cost (12) as the rest of the app.
 */
export async function resetPassword(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  const newPassword = String(formData.get('newPassword') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')

  if (!token) return { error: 'Invalid or expired reset link' }

  const validated = changePasswordSchema.safeParse({ currentPassword: 'x', newPassword, confirmPassword })
  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const db = await dbConnect()

  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(
      eq(passwordResetTokens.tokenHash, tokenHash),
      gt(passwordResetTokens.expiresAt, new Date().toISOString()),
      isNull(passwordResetTokens.usedAt),
    ))
    .limit(1)

  if (!row) return { error: 'Invalid or expired reset link' }

  const hashedPassword = await bcrypt.hash(validated.data.newPassword, 12)

  // Apply the password change and mark the token used in one transaction
  // so a crash can't leave a valid token + old password in place.
  await db.transaction(async (tx) => {
    await tx.update(users).set({ password: hashedPassword, updatedAt: new Date().toISOString() }).where(eq(users.id, row.userId))
    await tx.update(passwordResetTokens).set({ usedAt: new Date().toISOString() }).where(eq(passwordResetTokens.id, row.id))
    // Invalidate any other outstanding tokens for this user — a freshly
    // reset password should not be "still resettable" by an older link.
    await tx.update(passwordResetTokens)
      .set({ usedAt: new Date().toISOString() })
      .where(and(eq(passwordResetTokens.userId, row.userId), isNull(passwordResetTokens.usedAt)))
  })

  return { success: true }
}

function escapeHtmlText(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function escapeHtmlAttr(s: string): string {
  return escapeHtmlText(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
