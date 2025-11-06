import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { MercadoPagoOAuthService } from '../services/mercadopago-oauth.service';

/**
 * Guard que verifica si el usuario tiene MercadoPago conectado
 * antes de permitir publicar autos o realizar acciones que requieren pagos.
 */
export const MercadoPagoGuard: CanMatchFn = async () => {
  const oauthService = inject(MercadoPagoOAuthService);
  const router = inject(Router);

  try {
    const canPublish = await oauthService.canPublishCars();

    if (canPublish) {
      return true;
    }

    // Usuario no puede publicar autos sin MercadoPago conectado
    return router.createUrlTree(['/profile/mercadopago-connect'], {
      queryParams: { returnUrl: router.url }
    });
  } catch (error) {
    // En caso de error, permitir acceso pero mostrar mensaje
    console.warn('[MercadoPagoGuard] Error verificando conexión:', error);
    return true;
  }
};
