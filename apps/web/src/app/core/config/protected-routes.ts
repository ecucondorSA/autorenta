/**
 * Protected Route Configuration
 *
 * Single source of truth for route prefixes that require authentication.
 * Used by AuthService and ErrorHandlerService to determine redirect behavior.
 *
 * Must match routes with `canMatch: [AuthGuard]` in app.routes.ts.
 */

/** Route prefixes that require authentication */
export const PROTECTED_ROUTE_PREFIXES: readonly string[] = [
  '/profile',
  '/bookings',
  '/reviews',
  '/admin',
  '/referrals',
  '/protections',
  '/verification',
  '/contact-verification',
  '/finanzas',
  '/wallet',
  '/dashboard',
  '/scout',
  '/calendar-demo',
  '/payouts',
  '/messages',
  '/notifications',
  '/cars/publish',
  '/cars/my',
  '/cars/bulk-blocking',
] as const;

/** Dynamic protected route patterns (e.g. /cars/:id/availability) */
export const PROTECTED_ROUTE_PATTERNS: readonly RegExp[] = [
  /^\/cars\/[^/]+\/availability/,
  /^\/cars\/[^/]+\/documents/,
] as const;

/** Check if a URL is a protected route */
export function isProtectedUrl(url: string): boolean {
  const normalized = url || '/';
  if (PROTECTED_ROUTE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }
  return PROTECTED_ROUTE_PATTERNS.some((pattern) => pattern.test(normalized));
}
