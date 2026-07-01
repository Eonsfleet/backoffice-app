import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_COOKIE = 'eonsfleet-token'
const PUBLIC_PATHS = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(AUTH_COOKIE)?.value

  // Root → always redirect to dashboard (middleware handles it, no server redirect needed)
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const isApiPath = pathname.startsWith('/api/')

  // Skip middleware for Next.js API routes
  if (isApiPath) return NextResponse.next()

  // Authenticated user hitting /login → redirect to dashboard
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Unauthenticated user hitting a protected route → redirect to /login
  if (!isPublicPath && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
