import { Injectable, inject } from '@angular/core';
import { firstValueFrom, from } from 'rxjs';
import { ignoreElements } from 'rxjs/operators';
import { Booking } from '../models';
import { getErrorMessage } from '../utils/type-guards';
import { BookingWalletService } from './booking-wallet.service';
import { DriverProfileService } from './driver-profile.service';
import { LoggerService } from './logger.service';

/**
 * Service for managing booking completion
 * Handles completion with/without damages and driver class updates
 */
@Injectable({
  providedIn: 'root',
})
export class BookingCompletionService {
  private readonly bookingWalletService = inject(BookingWalletService);
  private readonly driverProfileService = inject(DriverProfileService);
  private readonly logger = inject(LoggerService);

  /**
   * Complete booking without damages (clean booking)
   * This will:
   * 1. Release security deposit
   * 2. Update driver class (improve for clean booking)
   */
  async completeBookingClean(
    booking: Booking,
    onUpdateBooking: (bookingId: string, updates: Partial<Booking>) => Promise<Booking>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Release security deposit if locked
      if (booking.wallet_status === 'locked') {
        const releaseResult = await this.bookingWalletService.releaseSecurityDeposit(
          booking,
          'Reserva completada sin daños',
        );

        if (!releaseResult.ok) {
          return { success: false, error: releaseResult.error };
        }

        await onUpdateBooking(booking.id, {
          wallet_status: 'refunded',
        });
      }

      // 2. Mark booking as completed
      await onUpdateBooking(booking.id, {
        status: 'completed',
      });

      // 3. Update driver class (clean booking improves class)
      if (booking.user_id) {
        try {
          await firstValueFrom(
            from(
              this.driverProfileService.updateClassOnEvent({
                eventType: 'booking_completed',
                userId: booking.user_id,
                claimWithFault: false,
                claimSeverity: 0,
              }),
            ).pipe(ignoreElements()),
          );
          this.logger.info(`Driver class updated for clean booking ${booking.id}`);
        } catch (classError) {
          // Don't fail the booking completion if class update fails
          this.logger.error(
            'Failed to update driver class',
            'BookingCompletionService',
            classError instanceof Error ? classError : new Error(getErrorMessage(classError)),
          );
        }
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error completing booking',
      };
    }
  }

  /**
   * Complete booking with damages
   * This will:
   * 1. Deduct damage amount from security deposit
   * 2. Update driver class (worsen for claim with fault)
   */
  async completeBookingWithDamages(
    booking: Booking,
    damageAmountCents: number,
    damageDescription: string,
    claimSeverity: number = 1, // 1=minor, 2=moderate, 3=major
    onUpdateBooking: (bookingId: string, updates: Partial<Booking>) => Promise<Booking>,
  ): Promise<{ success: boolean; remaining_deposit?: number; error?: string }> {
    try {
      // 1. Deduct from security deposit
      const deductResult = await this.bookingWalletService.deductFromSecurityDeposit(
        booking,
        damageAmountCents,
        damageDescription,
      );

      if (!deductResult.ok) {
        return {
          success: false,
          error: deductResult.error,
        };
      }

      // 2. Update booking wallet status
      const remainingDeposit = deductResult.remaining_deposit ?? 0;
      await onUpdateBooking(booking.id, {
        wallet_status: remainingDeposit > 0 ? 'partially_charged' : 'charged',
      });

      // 3. Mark booking as completed
      await onUpdateBooking(booking.id, {
        status: 'completed',
      });

      // 4. Update driver class (claim worsens class)
      if (booking.user_id) {
        try {
          await firstValueFrom(
            from(
              this.driverProfileService.updateClassOnEvent({
                eventType: 'booking_completed',
                userId: booking.user_id,
                claimWithFault: true,
                claimSeverity: claimSeverity,
              }),
            ).pipe(ignoreElements()),
          );
          this.logger.info(`Driver class updated for claim on booking ${booking.id}`);
        } catch (classError) {
          // Don't fail the booking completion if class update fails
          this.logger.error(
            'Failed to update driver class',
            'BookingCompletionService',
            classError instanceof Error ? classError : new Error(getErrorMessage(classError)),
          );
        }
      }

      return {
        success: true,
        remaining_deposit: remainingDeposit,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error completing booking with damages',
      };
    }
  }
}
