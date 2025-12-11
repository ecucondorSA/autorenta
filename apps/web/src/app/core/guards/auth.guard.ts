import { inject } from '@angular/core';
import { CanMatchFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const AuthGuard: CanMatchFn = async (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Wait for session to be loaded and get the actual session object
  const session = await auth.ensureSession();
  
  const routePath = route.routeConfig?.path || '';
  console.log(`[AuthGuard DEBUG] Triggered for path: '${routePath}'. Session exists: ${!!session}, User: ${!!session?.user}`);

  // Check the session directly instead of relying on the computed signal
  // This avoids potential race conditions with signal updates
  if (!session || !session.user) {
    console.log('[AuthGuard DEBUG] No session/user found. Redirecting to /auth/login');
    // Redirect to login
    return router.createUrlTree(['/auth/login']);
  }

  // P0-013 FIX: Email Verification Check
  // Users must verify their email before accessing protected routes
  if (!session.user.email_confirmed_at) {
    console.log('[AuthGuard DEBUG] Email NOT confirmed.');
    // Allow access to specific routes even without email verification
    const allowedRoutes = ['profile', 'profile/verification', 'verification', 'auth/logout'];

    const isAllowedRoute = allowedRoutes.some((allowed) => routePath.includes(allowed));
    
    console.log(`[AuthGuard DEBUG] Is allowed route? ${isAllowedRoute} (path: ${routePath})`);

    if (!isAllowedRoute) {
      // Redirect to verification page for all other protected routes
      console.warn('[AuthGuard DEBUG] Email verification required. Redirecting to verification page.');
      return router.createUrlTree(['/profile/verification'], {
        queryParams: { reason: 'email_verification_required' },
      });
    }
  }

  return true;
};
