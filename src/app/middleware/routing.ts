/**
 * Routing middleware logic
 * Handles URL rewriting for organized page structure
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROUTES } from '../constants';

/**
 * Feature routes that should be rewritten to pages/ directory
 */
const FEATURE_ROUTES = [
  ROUTES.PHONICS,
  ROUTES.COMPREHENSION,
  ROUTES.VISUALIZATION,
  ROUTES.AUDIOBOOK,
  ROUTES.INTERACTIVE,
];

/**
 * Checks if a pathname matches a feature route
 */
export function isFeatureRoute(pathname: string): boolean {
  return FEATURE_ROUTES.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Handles routing middleware logic
 * Rewrites feature routes to pages/ directory while maintaining clean URLs
 */
export function handleRouting(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  // Check if the path matches a feature route
  if (isFeatureRoute(pathname) && !pathname.startsWith('/pages/')) {
    // Rewrite to the pages/ directory
    const newPath = `/pages${pathname}`;
    return NextResponse.rewrite(new URL(newPath, request.url));
  }

  // Return null to indicate no rewrite needed
  return null;
}

