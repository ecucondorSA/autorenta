import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { MercadoPagoOAuthService } from '@core/services/payments/mercadopago-oauth.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

/**
 * Guard que verifica si el usuario tiene MercadoPago conectado
 * antes de permitir publicar autos o realizar acciones que requieren pagos.
 */
export const MercadoPagoGuard: CanMatchFn = async () => {
  const oauthService = inject(MercadoPagoOAuthService);
  const router = inject(Router);
  const logger = inject(LoggerService);

  try {
    const canPublish = await oauthService.canPublishCars();

    if (canPublish) {
      logger.debug('MercadoPago connection verified', 'MercadoPagoGuard');
      return true;
    }

    logger.warn('User attempted to access without MercadoPago connected', 'MercadoPagoGuard');

    // Usuario no puede publicar autos sin MercadoPago conectado
    return router.createUrlTree(['/profile/mercadopago-connect'], {
      queryParams: { returnUrl: router.url },
    });
  } catch (error) {
    // FAIL-CLOSED: En caso de error, redirigir a conexión de MercadoPago
    logger.error(
      'Error checking MercadoPago connection',
      'MercadoPagoGuard',
      error instanceof Error ? error : new Error(String(error)),
    );

    return router.createUrlTree(['/profile/mercadopago-connect'], {
      queryParams: { reason: 'verification_failed', returnUrl: router.url },
    });
  }
};
