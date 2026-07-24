import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export default clerkMiddleware(async (auth, req) => {
  const res = NextResponse.next()
  const path = req.nextUrl.pathname

  if (
    path.startsWith('/workspace') ||
    path.startsWith('/api/preview') ||
    path.startsWith('/api/projects') ||
    path.startsWith('/api/run')
  ) {
    res.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    res.headers.set('Cross-Origin-Embedder-Policy', 'credentialless')
    res.headers.set('Cross-Origin-Resource-Policy', 'cross-origin')
  }

  return res
})

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
}
