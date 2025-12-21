import { inject } from '@angular/core';
import { CanMatchFn, Router, Route } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../services/logger.service';

export const AuthGuard: CanMatchFn = async (route: Route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const logger = inject(LoggerService);

  // Wait for session to be loaded and get the actual session object
  const session = await auth.ensureSession();

  const routePath = route.path || '';
  logger.debug(
    `Triggered for path: '${routePath}'. Session exists: ${!!session}, User: ${!!session?.['user']}`,
    'AuthGuard',
  );

  // Check the session directly instead of relying on the computed signal
  // This avoids potential race conditions with signal updates
  if (!session || !session['user']) {
    logger.debug('No session/user found. Redirecting to /auth/login', 'AuthGuard');
    // Redirect to login
    return router.createUrlTree(['/auth/login']);
  }

  // P0-013 FIX: Email Verification Check
  // Users must verify their email before accessing protected routes
  if (!session['user'].email_confirmed_at) {
    logger.debug('Email NOT confirmed.', 'AuthGuard');
    // Allow access to specific routes even without email verification
    const allowedRoutes = ['profile', 'profile/verification', 'verification', 'auth/logout'];

    const isAllowedRoute = allowedRoutes.some((allowed) => routePath.includes(allowed));

    logger.debug(
      `Is allowed route? ${isAllowedRoute} (path: ${routePath})`,
      'AuthGuard',
    );

    if (!isAllowedRoute) {
      // Redirect to verification page for all other protected routes
      logger.warn('Email verification required. Redirecting to verification page.', 'AuthGuard');
      return router.createUrlTree(['/profile/verification'], {
        queryParams: { reason: 'email_verification_required' },
      });
    }
  }

  return true;
};
