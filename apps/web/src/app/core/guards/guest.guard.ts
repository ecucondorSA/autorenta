import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard that prevents authenticated users from accessing guest-only pages
 * (like login and register). If user is already authenticated, redirects to /cars.
 */
export const GuestGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Ensure session is loaded
  await auth.ensureSession();

  // If user is authenticated, redirect to cars page
  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/cars']);
  }

  // User is not authenticated, allow access to auth pages
  return true;
};
