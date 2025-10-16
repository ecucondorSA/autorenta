import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const AuthGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ensureSession();
  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/auth/login']);
};
