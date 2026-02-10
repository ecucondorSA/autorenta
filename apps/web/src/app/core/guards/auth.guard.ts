import { inject } from '@angular/core';
import { CanMatchFn, Router, Route, UrlSegment } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

export const AuthGuard: CanMatchFn = async (route: Route, segments: UrlSegment[]) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const logger = inject(LoggerService);

  // Wait for session to be loaded and get the actual session object
  let session = await auth.ensureSession();

  const routePath = route.path || '';
  logger.debug(
    `Triggered for path: '${routePath}'. Session exists: ${!!session}, User: ${!!session?.['user']}`,
    'AuthGuard',
  );

  // If no session, attempt a silent token refresh before giving up.
  // ensureSession() only reads from localStorage (getSession()) which doesn't
  // validate or refresh expired tokens. The refresh token may still be valid.
  if (!session || !session['user']) {
    logger.debug('No session from cache, attempting silent refresh...', 'AuthGuard');
    session = await auth.refreshSession();
  }

  if (!session || !session['user']) {
    // Build returnUrl from matched segments so the user returns here after login
    const returnUrl = '/' + segments.map((s) => s.path).join('/');
    logger.debug(`No session after refresh. Redirecting to /auth/login (returnUrl: ${returnUrl})`, 'AuthGuard');
    return router.createUrlTree(['/auth/login'], {
      queryParams: returnUrl !== '/' ? { returnUrl } : {},
    });
  }

  // AuthGuard solo valida sesión activa.
  // La verificación de identidad (email, docs, etc.) se maneja con VerificationGuard
  // que se aplica solo a rutas críticas (booking/payment).

  return true;
};
