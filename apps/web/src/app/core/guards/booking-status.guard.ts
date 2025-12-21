import { inject } from '@angular/core';
import { CanMatchFn, Route, Router, UrlSegment } from '@angular/router';
import type { BookingStatus } from '@core/models';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingFlowService } from '@core/services/bookings/booking-flow.service';
import { BookingsService } from '@core/services/bookings/bookings.service';

/**
 * BookingStatusGuard
 *
 * Guard que valida que un booking esté en el estado correcto
 * antes de permitir acceso a rutas específicas (check-in, check-out, etc.)
 *
 * @example
 * ```typescript
 * {
 *   path: ':id/owner-check-in',
 *   canMatch: [bookingStatusGuard(['confirmed'])],
 *   loadComponent: () => import('./owner-check-in.page')
 * }
 * ```
 */
export function bookingStatusGuard(
  allowedStatuses: BookingStatus[],
  options?: {
    requireOwner?: boolean;
    requireRenter?: boolean;
    redirectTo?: string;
  },
): CanMatchFn {
  return async (route: Route, segments: UrlSegment[]) => {
    const bookingsService = inject(BookingsService);
    const bookingFlowService = inject(BookingFlowService);
    const authService = inject(AuthService);
    const router = inject(Router);

    try {
      // 1. Verificar autenticación
      const session = await authService.ensureSession();
      if (!session?.user) {
        const returnUrl =
          '/' +
          segments
            .map((s) => s.path)
            .filter(Boolean)
            .join('/');
        return router.createUrlTree(['/auth/login'], {
          queryParams: { returnUrl },
        });
      }

      // 2. Obtener booking ID de la ruta
      // Extract booking id from the current URL segments as CanMatch receives route+segments
      const path =
        '/' +
        segments
          .map((s) => s.path)
          .filter(Boolean)
          .join('/');
      const match = path.match(/\/bookings\/([^/]+)/);
      const bookingId = match?.[1] ?? null;

      if (!bookingId) {
        return router.createUrlTree(['/bookings'], {
          queryParams: { error: 'invalid_booking_id' },
        });
      }

      // 3. Cargar booking
      const booking = await bookingsService.getBookingById(bookingId);
      if (!booking) {
        return router.createUrlTree(['/bookings'], {
          queryParams: { error: 'booking_not_found' },
        });
      }

      // 4. Validar estado
      if (!allowedStatuses.includes(booking.status)) {
        const redirectTo = options?.redirectTo || '/bookings';
        return router.createUrlTree([redirectTo, bookingId], {
          queryParams: {
            error: 'invalid_booking_status',
            currentStatus: booking.status,
            requiredStatuses: allowedStatuses.join(','),
          },
        });
      }

      // 5. Validar permisos (owner o renter)
      const userId = session.user.id;
      if (options?.requireOwner && booking.owner_id !== userId) {
        return router.createUrlTree(['/bookings'], {
          queryParams: { error: 'not_owner' },
        });
      }

      if (options?.requireRenter && booking.renter_id !== userId) {
        return router.createUrlTree(['/bookings'], {
          queryParams: { error: 'not_renter' },
        });
      }

      // 6. Validar transición (opcional, para check-in/check-out)
      if (allowedStatuses.length === 1) {
        const targetStatus = allowedStatuses[0];
        const validation = bookingFlowService.validateStatusTransition(booking, targetStatus);
        if (!validation.valid) {
          return router.createUrlTree(['/bookings', bookingId], {
            queryParams: {
              error: 'invalid_transition',
              message: validation.error,
            },
          });
        }
      }

      return true;
    } catch (error) {
      console.error('BookingStatusGuard error:', error);
      return router.createUrlTree(['/bookings'], {
        queryParams: { error: 'guard_error' },
      });
    }
  };
}

/**
 * Guard específico para owner check-in
 * Requiere: booking en estado 'confirmed' y usuario sea el owner
 */
export const ownerCheckInGuard: CanMatchFn = bookingStatusGuard(['confirmed'], {
  requireOwner: true,
});

/**
 * Guard específico para renter check-in
 * Requiere: booking en estado 'confirmed' y usuario sea el renter
 */
export const renterCheckInGuard: CanMatchFn = bookingStatusGuard(['confirmed'], {
  requireRenter: true,
});

/**
 * Guard específico para renter check-out
 * Requiere: booking en estado 'in_progress' y usuario sea el renter
 */
export const renterCheckOutGuard: CanMatchFn = bookingStatusGuard(['in_progress'], {
  requireRenter: true,
});

/**
 * Guard específico para owner check-out
 * Requiere: booking en estado 'in_progress' o 'completed' y usuario sea el owner
 */
export const ownerCheckOutGuard: CanMatchFn = bookingStatusGuard(['in_progress', 'completed'], {
  requireOwner: true,
});
