import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const AuthGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Wait for session to be loaded and get the actual session object
  const session = await auth.ensureSession();

  // Check the session directly instead of relying on the computed signal
  // This avoids potential race conditions with signal updates
  if (session && session.user) {
    return true;
  }

  // Redirect to login
  return router.createUrlTree(['/auth/login']);
};
