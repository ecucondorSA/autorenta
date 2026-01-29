import { inject } from '@angular/core';
import { CanMatchFn, Router, Route } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

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

  // P0-XXX: Verificación diferida
  // AuthGuard solo valida sesión activa.
  // La verificación de identidad (email, docs, etc.) se maneja con VerificationGuard
  // que se aplica solo a rutas críticas (booking/payment).
  // Esto permite que usuarios exploren el marketplace sin verificación completa.

  return true;
};
