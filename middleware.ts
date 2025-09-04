import { NextResponse, NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  // Allow public paths
  const publicPaths = [
    '/login',
    '/register',
    '/manifest.webmanifest',
    '/sw.js',
    '/favicon.ico',
  ]
  if (
    publicPaths.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/uploads')
  ) {
    return NextResponse.next()
  }

  const userId = req.cookies.get('userId')?.value
  if (!userId) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    const next = pathname + (search || '')
    url.searchParams.set('reason', 'auth')
    url.searchParams.set('next', next)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|api|uploads).*)'],
}
