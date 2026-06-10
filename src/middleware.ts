import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicPaths = ['/', '/login', '/register', '/forgot-password']
const publicPrefixes = ['/r/', '/i/', '/api/', '/_next/']

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (publicPaths.includes(pathname)) return NextResponse.next()
  if (publicPrefixes.some((p) => pathname.startsWith(p))) return NextResponse.next()
  if (pathname.startsWith('/pending-approval')) return NextResponse.next()
  if (pathname.startsWith('/suspended')) return NextResponse.next()
  if (pathname.startsWith('/admin')) return NextResponse.next()

  const sessionToken = req.cookies.get('next-auth.session-token')?.value
    || req.cookies.get('__Secure-next-auth.session-token')?.value
    || req.cookies.get('__Host-next-auth.session-token')?.value

  if (!sessionToken) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
