import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

/**
 * Guard that prevents authenticated users from accessing guest-only pages
 * (like login and register). If user is already authenticated, redirects to /cars/list.
 */
export const GuestGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const logger = inject(LoggerService);

  // Ensure session is loaded
  await auth.ensureSession();
  
  const isAuthenticated = auth.isAuthenticated();
  logger.debug(`Triggered. Is Authenticated: ${isAuthenticated}`, 'GuestGuard');

  // If user is authenticated, redirect to cars list page
  if (isAuthenticated) {
    logger.debug('User IS authenticated. Redirecting to /cars/list', 'GuestGuard');
    return router.createUrlTree(['/cars/list']);
  }

  // User is not authenticated, allow access to auth pages
  return true;
};
