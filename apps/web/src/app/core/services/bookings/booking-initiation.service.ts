import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import type { Booking } from '@core/models';
import { AuthService } from '@core/services/auth/auth.service';
import { ProfileService } from '@core/services/auth/profile.service';
import { CarsService } from '@core/services/cars/cars.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import type { BookingLocationData } from '@features/bookings/components/booking-location-form/booking-location-form.component';
import { BookingsService } from './bookings.service';

/**
 * Fachada ligera para centralizar el inicio de una reserva desde la UI.
 * No pretende duplicar la lógica de negocio (esa queda en BookingsService),
 * sino ofrecer un único punto para: auth-check, revalidación de disponibilidad
 * y llamada a creación de reserva con una API consistente para la UI.
 */
@Injectable({ providedIn: 'root' })
export class BookingInitiationService {
  private readonly logger = inject(LoggerService);
  private readonly auth = inject(AuthService);
  private readonly profile = inject(ProfileService);
  private readonly bookings = inject(BookingsService);
  private readonly cars = inject(CarsService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private inProgress = false;

  /**
   * Checks if user is platform-blocked due to unpaid damage debt.
   * Returns null to allow booking, or error result to block.
   */
  private async checkPlatformBlock(): Promise<{ success: false; error: string } | null> {
    try {
      const userProfile = await this.profile.getCurrentProfile();
      if (!userProfile?.platform_blocked) return null;

      const debtUsd = (userProfile.pending_debt_cents ?? 0) / 100;
      this.logger.warn('Booking blocked — user has pending debt', 'BookingInitiationService', { debtUsd });

      return {
        success: false,
        error: debtUsd > 0
          ? `Tenés una deuda pendiente de USD ${debtUsd.toFixed(2)}. Saldala desde tu wallet para poder reservar.`
          : 'Tu cuenta está temporalmente bloqueada. Contactá soporte para más información.',
      };
    } catch {
      return null; // Non-blocking: if profile fetch fails, allow booking attempt
    }
  }

  /**
   * Inicia una reserva desde la vista de detalle del auto.
   * Retorna el mismo shape que createBookingWithValidation para mínima fricción.
   */
  async startFromCar(
    carId: string,
    startDate: string,
    endDate: string,
    locationData?: BookingLocationData,
  ): Promise<{ success: boolean; booking?: Booking; error?: string; canWaitlist?: boolean }> {
    if (this.inProgress) return { success: false, error: 'in_progress' };
    this.inProgress = true;

    try {
      // Auth check - redirigir si no autenticado
      const isAuth = await this.auth.isAuthenticated();
      if (!isAuth) {
        // Guardar intento breve para UX (opcional)
        if (this.isBrowser) {
          sessionStorage.setItem(
            'booking_intent',
            JSON.stringify({ carId, startDate, endDate, locationData }),
          );
        }
        await this.router.navigate(['/auth/login'], {
          queryParams: { returnUrl: this.router.url },
        });
        return { success: false, error: 'not_authenticated' };
      }

      // Platform block: users with unpaid damage debt cannot book
      const blockResult = await this.checkPlatformBlock();
      if (blockResult) {
        return blockResult;
      }

      // Revalidar disponibilidad (best-effort)
      try {
        const available = await this.cars.isCarAvailable(carId, startDate, endDate);
        if (!available) {
          // Intentar sugerencias / waitlist no lo hacemos aquí para mantener API simple
          return { success: false, error: 'not_available', canWaitlist: true };
        }
      } catch (err) {
        // Si falla la revalidación, no bloqueamos el flujo; dejamos que BookingsService valide
        this.logger.warn('Availability check failed, continuing', 'BookingInitiationService', err);
      }

      // Delegar la creación validada a BookingsService
      const result = await this.bookings.createBookingWithValidation(
        carId,
        startDate,
        endDate,
        locationData,
      );

      return result;
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    } finally {
      this.inProgress = false;
    }
  }
}
