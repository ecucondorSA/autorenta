import { inject } from '@angular/core';
import { Router, type CanMatchFn } from '@angular/router';
import { ProfileService } from '@core/services/auth/profile.service';

/**
 * OnboardingGuard - DEPRECADO: Onboarding ahora es opcional
 *
 * El rol del usuario se infiere del comportamiento:
 * - Si busca autos → Locatario
 * - Si publica autos → Locador
 *
 * Este guard ahora siempre permite el acceso.
 * Se mantiene por compatibilidad con rutas existentes.
 */
export const onboardingGuard: CanMatchFn = async () => {
  // Onboarding es opcional - siempre permitir acceso
  // El rol se infiere del comportamiento del usuario
  return true;
};

/**
 * TOSGuard - Protege rutas que requieren aceptación de términos y condiciones
 *
 * Uso en rutas:
 * ```typescript
 * {
 *   path: 'bookings',
 *   loadComponent: () => import('./features/bookings/bookings.page').then(m => m.BookingsPage),
 *   canMatch: [tosGuard]
 * }
 * ```
 */
export const tosGuard: CanMatchFn = async () => {
  const profileService = inject(ProfileService);
  const router = inject(Router);

  try {
    const hasAccepted = await profileService.hasAcceptedTOS();

    if (!hasAccepted) {
      // Redirigir a perfil tab de seguridad
      return router.createUrlTree(['/profile'], {
        queryParams: { tab: 'security', tos: 'required' },
      });
    }

    return true;
  } catch {
    // Si hay error, permitir acceso (fail-open)
    return true;
  }
};

/**
 * VerifiedDriverGuard - Protege rutas que requieren licencia verificada
 * (ej: publicar autos)
 *
 * Uso en rutas:
 * ```typescript
 * {
 *   path: 'cars/publish',
 *   loadComponent: () => import('./features/cars/publish/publish.page').then(m => m.PublishPage),
 *   canMatch: [verifiedDriverGuard]
 * }
 * ```
 */
export const verifiedDriverGuard: CanMatchFn = async () => {
  const profileService = inject(ProfileService);
  const router = inject(Router);

  try {
    const profile = await profileService.getMe();

    if (!profile.id_verified) {
      // Redirigir a perfil tab de verificación
      return router.createUrlTree(['/profile'], {
        queryParams: { tab: 'verification', driver: 'required' },
      });
    }

    return true;
  } catch {
    // Si hay error, bloquear acceso (fail-closed para verificación)
    return router.createUrlTree(['/profile'], {
      queryParams: { tab: 'verification' },
    });
  }
};

/**
 * VerifiedEmailGuard - Protege rutas que requieren email verificado
 * (ej: hacer reservas)
 *
 * Uso en rutas:
 * ```typescript
 * {
 *   path: 'bookings/new',
 *   loadComponent: () => import('./features/bookings/new/new.page').then(m => m.NewBookingPage),
 *   canMatch: [verifiedEmailGuard]
 * }
 * ```
 */
export const verifiedEmailGuard: CanMatchFn = async () => {
  const profileService = inject(ProfileService);
  const router = inject(Router);

  try {
    const profile = await profileService.getMe();

    if (!profile.email_verified) {
      // Redirigir a perfil tab de seguridad
      return router.createUrlTree(['/profile'], {
        queryParams: { tab: 'security', email: 'required' },
      });
    }

    return true;
  } catch {
    // Si hay error, bloquear acceso (fail-closed para verificación)
    return router.createUrlTree(['/profile'], {
      queryParams: { tab: 'security' },
    });
  }
};

/**
 * KYCGuard - Protege rutas que requieren identidad verificada (Level 2)
 * (ej: recibir pagos como owner)
 *
 * Uso en rutas:
 * ```typescript
 * {
 *   path: 'payouts',
 *   loadComponent: () => import('./features/payouts/payouts.page').then(m => m.PayoutsPage),
 *   canMatch: [kycGuard]
 * }
 * ```
 */
export const kycGuard: CanMatchFn = async () => {
  const profileService = inject(ProfileService);
  const router = inject(Router);

 try {
    const profile = await profileService.getMe();

    // NOTE: `profiles.kyc` does not exist in production.
    // For now, treat Level 2 identity verification (`id_verified`) as the payout gate.
    if (!profile.id_verified) {
      // Redirigir a perfil tab de verificación
      return router.createUrlTree(['/profile'], {
        queryParams: { tab: 'verification', id: 'required' },
      });
    }

    return true;
  } catch {
    // Si hay error, bloquear acceso (fail-closed para verificación)
    return router.createUrlTree(['/profile'], {
      queryParams: { tab: 'verification' },
    });
  }
};
