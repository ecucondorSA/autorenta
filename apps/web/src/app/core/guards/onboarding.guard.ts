import { inject } from '@angular/core';
import { Router, type CanMatchFn } from '@angular/router';
import { ProfileService } from '../services/profile.service';

/**
 * OnboardingGuard - Protege rutas que requieren onboarding completo
 *
 * Uso en rutas:
 * ```typescript
 * {
 *   path: 'cars/publish',
 *   loadComponent: () => import('./features/cars/publish/publish.page').then(m => m.PublishPage),
 *   canMatch: [onboardingGuard]
 * }
 * ```
 */
export const onboardingGuard: CanMatchFn = async () => {
  const profileService = inject(ProfileService);
  const router = inject(Router);

  try {
    const hasCompleted = await profileService.hasCompletedOnboarding();

    if (!hasCompleted) {
      // Redirigir a onboarding inteligente
      return router.createUrlTree(['/onboarding']);
    }

    return true;
  } catch (__err) {
    // Si hay error, permitir acceso (fail-open)
    return true;
  }
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
  } catch (__err) {
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

    if (!profile.is_driver_verified) {
      // Redirigir a perfil tab de verificación
      return router.createUrlTree(['/profile'], {
        queryParams: { tab: 'verification', driver: 'required' },
      });
    }

    return true;
  } catch (__err) {
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

    if (!profile.is_email_verified) {
      // Redirigir a perfil tab de seguridad
      return router.createUrlTree(['/profile'], {
        queryParams: { tab: 'security', email: 'required' },
      });
    }

    return true;
  } catch (__err) {
    // Si hay error, bloquear acceso (fail-closed para verificación)
    return router.createUrlTree(['/profile'], {
      queryParams: { tab: 'security' },
    });
  }
};

/**
 * KYCGuard - Protege rutas que requieren KYC verificado
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

    if (profile.kyc !== 'verified') {
      // Redirigir a perfil tab de verificación
      return router.createUrlTree(['/profile'], {
        queryParams: { tab: 'verification', kyc: 'required' },
      });
    }

    return true;
  } catch (__err) {
    // Si hay error, bloquear acceso (fail-closed para verificación)
    return router.createUrlTree(['/profile'], {
      queryParams: { tab: 'verification' },
    });
  }
};
