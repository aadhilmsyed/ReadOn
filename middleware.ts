import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { handleRouting, handleAuth } from './src/app/middleware';

/**
 * Next.js Middleware
 * 
 * This file must remain at the project root (Next.js requirement).
 * The actual middleware logic is organized in src/app/middleware/
 * 
 * Handles:
 * - URL rewriting for organized page structure
 * - Authentication checks (future)
 * - Route protection (future)
 */
export function middleware(request: NextRequest) {
  // Handle authentication first (if route is protected)
  const authResponse = handleAuth(request);
  if (authResponse) {
    return authResponse;
  }

  // Handle routing rewrites (feature pages -> pages/ directory)
  const routingResponse = handleRouting(request);
  if (routingResponse) {
    return routingResponse;
  }

  // Allow the request to proceed normally
  return NextResponse.next();
}

// Configure which routes this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|mp3|wav)).*)',
  ],
};

