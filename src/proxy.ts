import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'

/**
 * Route protection at the edge. In Next.js 16 this file replaces the
 * legacy `middleware.ts` — same matcher, same semantics, just a
 * different name and a different export name (`proxy`).
 *
 * Public routes (login, register, public receipt, etc.) skip auth.
 * Everything else requires a valid NextAuth session cookie.
 *
 * Every request gets a `x-request-id` header (preserved from upstream
 * if present, generated otherwise). Server actions and server
 * components can read this via `headers()` to log it alongside any
 * error, which is what lets us trace a single user action through
 * multiple internal steps.
 */

const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/forgot-password', '/reset-password', '/pending-approval', '/suspended'])
const PUBLIC_PREFIXES = ['/r/', '/i/', '/api/auth', '/api/i/', '/api/r/', '/_next/']

const SESSION_COOKIES = [
  // NextAuth v4 / older naming
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  '__Host-next-auth.session-token',
  // NextAuth v5 (authjs) naming
  'authjs.session-token',
  '__Secure-authjs.session-token',
  '__Host-authjs.session-token',
]

function hasSessionCookie(req: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => Boolean(req.cookies.get(name)?.value))
}

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Honor an upstream request id (e.g. from Vercel's edge, an APM, or
  // a load balancer) so traces stay correlated across services. Fall
  // back to a fresh 16-byte hex id.
  const incomingId = req.headers.get('x-request-id') || req.headers.get('x-vercel-id')
  const requestId = incomingId || randomBytes(16).toString('hex')

  if (isPublic(pathname)) {
    const res = NextResponse.next()
    res.headers.set('x-request-id', requestId)
    return res
  }

  if (!hasSessionCookie(req)) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    const res = NextResponse.redirect(loginUrl)
    res.headers.set('x-request-id', requestId)
    return res
  }

  const res = NextResponse.next()
  res.headers.set('x-request-id', requestId)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
