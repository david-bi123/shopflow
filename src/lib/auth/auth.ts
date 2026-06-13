import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { dbConnect } from '@/lib/db/connect'
import { users, tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { rateLimit } from '@/lib/utils/rate-limit'
import { writeFailedLoginAudit, writeSuccessLoginAudit } from '@/lib/services/audit-login'
import type { Role } from '@/types'
import type { User } from 'next-auth'

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Trust the host header from Vercel/proxies so cookies are issued correctly
  // in production. Safe to leave on in dev too.
  trustHost: true,
  // Pin the session cookie name to `next-auth.session-token` so the
  // middleware (which checks for this name) finds it. Without this,
  // NextAuth v5 defaults to `authjs.session-token` and the cookie is
  // invisible to the middleware, causing an infinite /login ↔ /dashboard
  // redirect loop in production.
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(
        credentials: Partial<Record<'email' | 'password', unknown>>
      ): Promise<User | null> {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = String(credentials.email).toLowerCase().trim()

        // Per-email throttling. The rate limiter is per-process, so on
        // Vercel the effective floor is `limit × instances`; that still
        // slows down a credential-stuffing attacker. For a strict global
        // limit, swap this for Upstash Redis.
        const rl = rateLimit(`login:${email}`, { limit: 10, windowSeconds: 60 })
        if (!rl.allowed) {
          await writeFailedLoginAudit({ email, reason: 'rate_limited' })
          return null
        }

        const db = await dbConnect()

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

        if (!user) {
          // Constant-time-ish: do a fake bcrypt compare so the timing of
          // a "user not found" branch doesn't trivially disclose whether
          // the email exists.
          await bcrypt.compare(String(credentials.password), '$2a$10$invalidsaltinvalidsaltinvalidsaltinvalidsaltinvalid')
          await writeFailedLoginAudit({ email, reason: 'no_user' })
          return null
        }

        const isValid = await bcrypt.compare(String(credentials.password), user.password)
        if (!isValid) {
          await writeFailedLoginAudit({ email, reason: 'bad_password', userId: user.id })
          return null
        }

        if (user.status === 'suspended') {
          await writeFailedLoginAudit({ email, reason: 'suspended', userId: user.id })
          return null
        }

        await db.update(users).set({ lastLogin: new Date().toISOString() }).where(eq(users.id, user.id))
        await writeSuccessLoginAudit({ email, userId: user.id })

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId ? String(user.tenantId) : undefined,
        } as User
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as { role: Role }).role
        token.tenantId = (user as { tenantId?: string }).tenantId
      }
      // On every request, confirm the user is still active + their tenant
      // is still active. This lets us kick out a suspended user or a
      // suspended shop without waiting for the 30-day JWT to expire.
      if (token.id && trigger !== 'signUp') {
        try {
          const db = await dbConnect()
          const [row] = await db
            .select({
              status: users.status,
              tenantStatus: tenants.status,
            })
            .from(users)
            .leftJoin(tenants, eq(users.tenantId, tenants.id))
            .where(eq(users.id, Number(token.id)))
            .limit(1)
          if (!row) {
            return null
          }
          if (row.status === 'suspended' || row.tenantStatus === 'suspended' || row.tenantStatus === 'rejected') {
            return null
          }
        } catch {
          // If the DB is down, fail closed for auth-related checks.
          return null
        }
      }
      return token
    },
    async session({ session, token }) {
      if (!token) {
        return { ...session, user: undefined as unknown as typeof session.user }
      }
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: token.role as Role,
          tenantId: token.tenantId as string | undefined,
        },
      }
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
