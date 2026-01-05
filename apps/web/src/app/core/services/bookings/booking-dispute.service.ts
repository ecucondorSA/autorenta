import { Injectable, inject } from '@angular/core';
import { Booking } from '@core/models';
import { BookingCancellationService } from '@core/services/bookings/booking-cancellation.service';
import { ProfileService } from '@core/services/auth/profile.service';
import { WalletService } from '@core/services/payments/wallet.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

/**
 * Service for handling booking disputes and rejection scenarios
 *
 * Extracted from BookingsService to reduce complexity
 * Handles: car rejection, early return, no-show, disputes
 */
@Injectable({
  providedIn: 'root',
})
export class BookingDisputeService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService);
  private readonly cancellationService = inject(BookingCancellationService);
  private readonly profileService = inject(ProfileService);
  private readonly walletService = inject(WalletService);

  /**
   * Reject the car at pickup (Check-in)
   * Use case: Car is dirty, has unreported damages, wrong model
   * Action: Cancel booking, 100% immediate refund, penalize owner
   */
  async rejectCarAtPickup(
    booking: Booking,
    reason: string,
    evidencePhotos: string[] = [],
    updateBookingCallback?: (bookingId: string, updates: Partial<Booking>) => Promise<Booking>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Cancel booking with special reason (force=true bypasses time rules)
      await this.cancellationService.cancelBooking(booking, true);

      // 2. Update with specific reason and evidence
      if (updateBookingCallback) {
        await updateBookingCallback(booking.id, {
          cancellation_reason: `RECHAZADO EN CHECK-IN: ${reason}`,
          cancelled_by_role: 'owner',
          metadata: {
            ...booking.metadata,
            rejection_evidence: evidencePhotos,
            rejected_at_pickup: true,
          },
        });
      }

      // 3. Record incident for owner penalty (Strike)
      await this.profileService.addStrike(
        booking.owner_id || '',
        'car_rejected_at_pickup',
        booking.id,
      );

      this.logger.info(
        `Car rejected at pickup for booking ${booking.id}`,
        JSON.stringify({
          reason,
          photos: evidencePhotos.length,
        }),
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al rechazar vehículo',
      };
    }
  }

  /**
   * Process an early return
   * Refunds unused days to the renter
   */
  async processEarlyReturn(
    booking: Booking,
    updateBookingCallback?: (bookingId: string, updates: Partial<Booking>) => Promise<Booking>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date();
      const endDate = new Date(booking.end_at);
      const startDate = new Date(booking.start_at);

      // Validate it's actually an early return
      if (now >= endDate) {
        return { success: false, error: 'La reserva ya ha finalizado o está por finalizar' };
      }

      if (now < startDate) {
        return { success: false, error: 'La reserva aún no ha comenzado' };
      }

      // Calculate unused days
      const msPerDay = 1000 * 60 * 60 * 24;
      const remainingDays = Math.floor((endDate.getTime() - now.getTime()) / msPerDay);

      if (remainingDays <= 0) {
        return { success: false, error: 'No hay días completos para reembolsar' };
      }

      const pricePerDay = this.getBookingPricePerDay(booking);
      const refundAmount = pricePerDay * remainingDays;

      // Update end date to now
      if (updateBookingCallback) {
        await updateBookingCallback(booking.id, {
          end_at: now.toISOString(),
          total_amount: (booking.total_amount || 0) - refundAmount,
        });
      }

      // Process refund
      if (refundAmount > 0 && booking.user_id) {
        await this.walletService.depositFunds(
          booking.user_id,
          Math.round(refundAmount * 100),
          `Reembolso por devolución anticipada (${remainingDays} días)`,
          booking.id,
        );
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al procesar devolución anticipada',
      };
    }
  }

  /**
   * Report owner no-show
   * Initiates no-show protocol: cancel booking, process refund, search alternatives
   */
  async reportOwnerNoShow(
    bookingId: string,
    details: string,
    evidenceUrls: string[] = [],
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('report_owner_no_show', {
        p_booking_id: bookingId,
        p_details: details,
        p_evidence_urls: evidenceUrls,
      });

      if (error) throw error;

      return { success: true, ...data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al reportar no-show del propietario',
      };
    }
  }

  /**
   * Report renter no-show
   * Initiates no-show protocol: mark as cancelled, charge penalty
   */
  async reportRenterNoShow(
    bookingId: string,
    details: string,
    evidenceUrls: string[] = [],
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('report_renter_no_show', {
        p_booking_id: bookingId,
        p_details: details,
        p_evidence_urls: evidenceUrls,
      });

      if (error) throw error;

      return { success: true, ...data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al reportar no-show del locatario',
      };
    }
  }

  /**
   * Create a dispute about additional charges
   * Freezes fund transfer to owner until resolution
   */
  async createDispute(
    bookingId: string,
    reason: string,
    evidence?: string[],
    updateBookingCallback?: (bookingId: string, updates: Partial<Booking>) => Promise<Booking>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.supabase.auth.getUser();
      if (!user.data.user) throw new Error('No autenticado');

      // Insert dispute
      const { error } = await this.supabase.from('booking_disputes').insert({
        booking_id: bookingId,
        opened_by: user.data.user.id,
        reason,
        evidence: evidence || [],
        status: 'open',
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Mark booking as disputed
      if (updateBookingCallback) {
        await updateBookingCallback(bookingId, {
          status: 'pending_dispute_resolution',
        });
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear disputa',
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private getBookingPricePerDay(booking: Booking & { price_per_day?: number | null }): number {
    return typeof booking.price_per_day === 'number' ? (booking.price_per_day ?? 0) : 0;
  }
}
