import { inject } from '@angular/core';
import { CanMatchFn, Router, Route } from '@angular/router';
import { IdentityLevelService } from '@core/services/verification/identity-level.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

/**
 * Guard que verifica nivel de identidad para acciones críticas (booking/payment)
 *
 * Requiere Level 1 mínimo:
 * - Email verificado O Teléfono verificado
 *
 * Level 2 (DNI + Licencia) se requiere solo para publicar autos como owner.
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
    // Level 1: Email OR Phone verified (basic identity check)
    // Level 2 (documents) is only required for owners publishing cars
    const levelCheck = await identityService.checkLevelAccess(1);

    if (!levelCheck.allowed) {
      logger.warn(
        `User needs verification level 1. Current: ${levelCheck.current_level}`,
        'VerificationGuard',
      );

      return router.createUrlTree(['/profile/verification'], {
        queryParams: {
          reason: 'booking_verification_required',
          returnUrl: `/${routePath}`,
          requiredLevel: 1,
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
