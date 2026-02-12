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

      // --- NOTIFICATION TRIGGER ---
      try {
        // Fetch booking details for context
        const { data: bookingDetails } = await this.supabase
          .from('bookings')
          .select('*, car:cars(title), renter:profiles!renter_id(id, full_name, email)')
          .eq('id', bookingId)
          .single();

        if (bookingDetails) {
          const carName = bookingDetails.car?.title || 'Vehículo';
          const recipientId = bookingDetails.renter?.id || bookingDetails.user_id;

          // Notify Renter
          await this.supabase.functions.invoke('notify-multi-channel', {
            body: {
              user_id: recipientId,
              channels: ['email', 'push'],
              template_code: 'dispute_opened',
              variables: {
                car_name: carName,
                booking_id: bookingId,
              },
            },
          });

          const { data: adminUsers, error: adminUsersError } = await this.supabase
            .from('admin_users')
            .select('user_id')
            .is('revoked_at', null);

          if (adminUsersError) {
            throw adminUsersError;
          }

          const adminRecipientIds = Array.from(
            new Set(
              (adminUsers ?? [])
                .map((adminUser) => adminUser.user_id)
                .filter((adminUserId): adminUserId is string => typeof adminUserId === 'string')
                .filter((adminUserId) => adminUserId !== recipientId),
            ),
          );

          await Promise.all(
            adminRecipientIds.map((adminUserId) =>
              this.supabase.functions.invoke('notify-multi-channel', {
                body: {
                  user_id: adminUserId,
                  channels: ['email'],
                  template_code: 'dispute_opened',
                  variables: {
                    car_name: carName,
                    booking_id: bookingId,
                  },
                },
              }),
            ),
          );
        }
      } catch (notifyError) {
        this.logger.warn('Failed to send dispute notification', { error: notifyError });
        // Don't fail the operation just because notification failed
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
  // DISPUTE RESOLUTION
  // ============================================================================

  /**
   * Resolve a dispute with final decision
   *
   * @param bookingId - ID of the booking with dispute
   * @param resolution - Resolution decision (approved/partial/rejected)
   * @param finalCharges - Final charge amount in cents (for partial resolution)
   * @param adminNotes - Notes from admin explaining the resolution
   */
  async resolveDispute(
    bookingId: string,
    resolution: 'approved' | 'partial' | 'rejected',
    finalCharges?: number,
    adminNotes?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.supabase.auth.getUser();
      if (!user.data.user) throw new Error('No autenticado');

      // Get the open dispute
      const { data: dispute, error: disputeError } = await this.supabase
        .from('booking_disputes')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('status', 'open')
        .maybeSingle();

      if (disputeError) throw disputeError;
      if (!dispute) {
        return { success: false, error: 'No hay disputa abierta para esta reserva' };
      }

      // Determine final booking status based on resolution
      let bookingStatus: string;
      let settlementAction: 'full_refund' | 'partial_refund' | 'no_refund';

      switch (resolution) {
        case 'approved':
          // Dispute approved = owner's claim rejected, full refund to renter
          bookingStatus = 'completed';
          settlementAction = 'full_refund';
          break;
        case 'partial':
          // Partial resolution = split the difference
          bookingStatus = 'completed';
          settlementAction = 'partial_refund';
          break;
        case 'rejected':
          // Dispute rejected = owner's claim approved, no additional refund
          bookingStatus = 'completed';
          settlementAction = 'no_refund';
          break;
        default:
          return { success: false, error: 'Resolución inválida' };
      }

      // Update dispute record
      const { error: updateDisputeError } = await this.supabase
        .from('booking_disputes')
        .update({
          status: 'resolved',
          resolution,
          resolved_by: user.data.user.id,
          resolved_at: new Date().toISOString(),
          admin_notes: adminNotes,
          final_charges_cents: finalCharges,
        })
        .eq('id', dispute.id);

      if (updateDisputeError) throw updateDisputeError;

      // Update booking status
      const { error: updateBookingError } = await this.supabase
        .from('bookings')
        .update({
          status: bookingStatus,
          dispute_resolution: resolution,
          dispute_resolved_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (updateBookingError) throw updateBookingError;

      // Process settlement based on resolution
      if (settlementAction === 'full_refund' || settlementAction === 'partial_refund') {
        const refundAmount =
          settlementAction === 'full_refund'
            ? dispute.disputed_amount_cents
            : (dispute.disputed_amount_cents || 0) - (finalCharges || 0);

        if (refundAmount > 0) {
          // Get booking to find renter
          const { data: booking } = await this.supabase
            .from('bookings')
            .select('renter_id, user_id')
            .eq('id', bookingId)
            .single();

          const renterId = booking?.renter_id || booking?.user_id;
          if (renterId) {
            await this.walletService.depositFunds(
              renterId,
              refundAmount,
              `Reembolso por resolución de disputa (${resolution})`,
              bookingId,
            );
          }
        }
      }

      this.logger.info(
        `Dispute resolved for booking ${bookingId}`,
        JSON.stringify({
          resolution,
          finalCharges,
          settlementAction,
        }),
      );

      return { success: true };
    } catch (error) {
      this.logger.error(
        'Error resolving dispute',
        'BookingDisputeService',
        error instanceof Error ? error : new Error(String(error)),
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al resolver disputa',
      };
    }
  }

  /**
   * Get dispute details for a booking
   */
  async getDisputeDetails(bookingId: string): Promise<{
    success: boolean;
    dispute?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('booking_disputes')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return { success: true, dispute: data as Record<string, unknown> };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener disputa',
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
