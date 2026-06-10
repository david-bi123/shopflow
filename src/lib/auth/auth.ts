import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { dbConnect } from '@/lib/db/connect'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { Role } from '@/types'
import type { User } from 'next-auth'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(
        credentials: Partial<Record<'email' | 'password', unknown>>,
        _request: Request
      ): Promise<User | null> {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const db = await dbConnect()

        const [user] = await db.select().from(users).where(eq(users.email, credentials.email as string)).limit(1)

        if (!user) return null

        const isValid = await bcrypt.compare(credentials.password as string, user.password)
        if (!isValid) return null

        if (user.status === 'suspended') return null

        await db.update(users).set({ lastLogin: new Date().toISOString() }).where(eq(users.id, user.id))

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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role as Role
        token.tenantId = (user as any).tenantId as string | undefined
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.tenantId = token.tenantId as string | undefined
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
