import { inject } from '@angular/core';
import { CanMatchFn, Router, Route } from '@angular/router';
import { IdentityLevelService } from '@core/services/verification/identity-level.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

/**
 * Guard que verifica nivel de identidad para acciones críticas (booking/payment)
 *
 * Requiere Level 2 mínimo:
 * - Email verificado
 * - Teléfono verificado
 * - DNI subido
 * - Licencia de conducir subida
 *
 * Si el usuario no cumple, redirige a /profile/verification con contexto.
 */
export const VerificationGuard: CanMatchFn = async (route: Route) => {
  const identityService = inject(IdentityLevelService);
  const router = inject(Router);
  const logger = inject(LoggerService);

  const routePath = route.path || '';
  logger.debug(`VerificationGuard triggered for: ${routePath}`, 'VerificationGuard');

  try {
    const levelCheck = await identityService.checkLevelAccess(2);

    if (!levelCheck.allowed) {
      logger.warn(
        `User needs verification level 2. Current: ${levelCheck.current_level}`,
        'VerificationGuard',
      );

      return router.createUrlTree(['/profile/verification'], {
        queryParams: {
          reason: 'booking_verification_required',
          returnUrl: `/${routePath}`,
          requiredLevel: 2,
        },
      });
    }

    logger.debug('Verification check passed', 'VerificationGuard');
    return true;
  } catch (error) {
    logger.error('Error checking verification level', 'VerificationGuard', { error });

    // Fail-safe: redirigir a verificación si hay error
    return router.createUrlTree(['/profile/verification'], {
      queryParams: { reason: 'verification_check_failed' },
    });
  }
};
