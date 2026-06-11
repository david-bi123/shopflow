import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/forgot-password', '/pending-approval', '/suspended'])
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

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isPublic(pathname)) return NextResponse.next()

  if (!hasSessionCookie(req)) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
