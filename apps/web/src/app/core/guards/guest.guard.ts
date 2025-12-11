import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard that prevents authenticated users from accessing guest-only pages
 * (like login and register). If user is already authenticated, redirects to /cars/list.
 */
export const GuestGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Ensure session is loaded
  await auth.ensureSession();
  
  const isAuthenticated = auth.isAuthenticated();
  console.log(`[GuestGuard DEBUG] Triggered. Is Authenticated: ${isAuthenticated}`);

  // If user is authenticated, redirect to cars list page
  if (isAuthenticated) {
    console.log('[GuestGuard DEBUG] User IS authenticated. Redirecting to /cars/list');
    return router.createUrlTree(['/cars/list']);
  }

  // User is not authenticated, allow access to auth pages
  return true;
};
