import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js middleware — route protection for FORGE.
 *
 * Public routes: /auth/*, /api/*, static assets
 * Protected routes: everything else → redirect to /auth/signin if no JWT cookie
 *
 * Note: Since we store the JWT in localStorage (not cookies), this middleware
 * cannot directly check auth state. Instead, the client-side AuthContext handles
 * redirects. This middleware primarily handles the root redirect to the app.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth check needed
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/health'
  ) {
    return NextResponse.next();
  }

  // Root path → redirect to sign-in (client will redirect to tenant if authenticated)
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
