import { Injectable, inject } from '@angular/core';
import { Booking, BookingExtensionRequest } from '@core/models';
import { getErrorMessage } from '@core/utils/type-guards';
import { BookingNotificationsService } from '@core/services/bookings/booking-notifications.service';
import { BookingWalletService } from '@core/services/bookings/booking-wallet.service';
import { InsuranceService } from '@core/services/bookings/insurance.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

/**
 * Service for handling booking extension requests
 *
 * Extracted from BookingsService to reduce complexity
 * Handles: request, approve, reject, estimate cost, extend insurance
 */
@Injectable({
  providedIn: 'root',
})
export class BookingExtensionService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService);
  private readonly bookingNotifications = inject(BookingNotificationsService);
  private readonly bookingWalletService = inject(BookingWalletService);
  private readonly insuranceService = inject(InsuranceService);

  /**
   * Request a booking extension
   * Creates a pending request for owner approval
   */
  async requestExtension(
    booking: Booking,
    newEndDate: Date,
    renterMessage?: string,
  ): Promise<{ success: boolean; error?: string; additionalCost?: number }> {
    try {
      if (newEndDate <= new Date(booking.end_at)) {
        return { success: false, error: 'La nueva fecha debe ser posterior a la actual' };
      }

      const currentUser = (await this.supabase.auth.getUser()).data.user;
      if (!currentUser || currentUser.id !== booking.renter_id) {
        return { success: false, error: 'Solo el arrendatario puede solicitar una extensión.' };
      }

      // Calculate estimated additional cost
      const currentEnd = new Date(booking.end_at);
      const additionalDays = Math.ceil(
        (newEndDate.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (additionalDays <= 0) {
        return { success: false, error: 'La nueva fecha debe ser posterior a la actual' };
      }

      const pricePerDay = this.getBookingPricePerDay(booking);
      const estimatedAdditionalCostCents = Math.round(pricePerDay * additionalDays * 100);

      // Insert new extension request
      const { error: insertError } = await this.supabase
        .from('booking_extension_requests')
        .insert({
          booking_id: booking.id,
          renter_id: booking.renter_id,
          owner_id: booking.owner_id || '',
          original_end_at: booking.end_at,
          new_end_at: newEndDate.toISOString(),
          estimated_cost_amount: estimatedAdditionalCostCents / 100,
          estimated_cost_currency: booking.currency,
          renter_message: renterMessage || null,
          request_status: 'pending',
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      await this.bookingNotifications.notifyExtensionRequested(
        booking,
        newEndDate.toISOString(),
        renterMessage,
      );

      return { success: true, additionalCost: estimatedAdditionalCostCents / 100 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al solicitar extensión',
      };
    }
  }

  /**
   * Approve an extension request
   * Extends the booking and processes the charge
   */
  async approveExtensionRequest(
    requestId: string,
    booking: Booking,
    ownerResponse?: string,
    updateBookingCallback?: (bookingId: string, updates: Partial<Booking>) => Promise<Booking>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const existingRequest = await this.supabase
        .from('booking_extension_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (existingRequest.error || !existingRequest.data) {
        throw new Error('Solicitud de extensión no encontrada.');
      }

      const request = existingRequest.data as BookingExtensionRequest;
      if (request.request_status !== 'pending') {
        throw new Error('La solicitud ya no está pendiente.');
      }

      const currentUser = (await this.supabase.auth.getUser()).data.user;
      if (!currentUser || currentUser.id !== booking.owner_id) {
        throw new Error('Solo el propietario puede aprobar una extensión.');
      }

      if (!request.estimated_cost_amount || !request.estimated_cost_currency) {
        throw new Error('Faltan datos de costo estimado en la solicitud.');
      }

      // Charge the additional cost
      const chargeResult = await this.bookingWalletService.processRentalPayment(
        booking,
        Math.round(request.estimated_cost_amount * 100),
        `Extensión de reserva #${booking.id} (${new Date(request.new_end_at).toLocaleDateString()})`,
      );

      if (!chargeResult.ok) {
        throw new Error(`Fallo al cobrar extensión: ${chargeResult.error}`);
      }

      // Update extension request
      const { error: updateRequestError } = await this.supabase
        .from('booking_extension_requests')
        .update({
          request_status: 'approved',
          responded_at: new Date().toISOString(),
          owner_response: ownerResponse || null,
        })
        .eq('id', requestId);

      if (updateRequestError) throw updateRequestError;

      // Update booking with new end date and total
      if (updateBookingCallback) {
        await updateBookingCallback(booking.id, {
          end_at: request.new_end_at,
          total_amount: (booking.total_amount || 0) + request.estimated_cost_amount,
        });
      }

      await this.extendInsuranceCoverageIfNeeded(booking.id, request.new_end_at);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al aprobar extensión',
      };
    }
  }

  /**
   * Reject an extension request
   */
  async rejectExtensionRequest(
    requestId: string,
    booking: Booking,
    reason: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const existingRequest = await this.supabase
        .from('booking_extension_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (existingRequest.error || !existingRequest.data) {
        throw new Error('Solicitud de extensión no encontrada.');
      }

      const request = existingRequest.data as BookingExtensionRequest;
      if (request.request_status !== 'pending') {
        throw new Error('La solicitud ya no está pendiente.');
      }

      const currentUser = (await this.supabase.auth.getUser()).data.user;
      if (!currentUser || currentUser.id !== booking.owner_id) {
        throw new Error('Solo el propietario puede rechazar una extensión.');
      }

      const { error: updateRequestError } = await this.supabase
        .from('booking_extension_requests')
        .update({
          request_status: 'rejected',
          responded_at: new Date().toISOString(),
          owner_response: reason,
        })
        .eq('id', requestId);

      if (updateRequestError) throw updateRequestError;

      await this.bookingNotifications.notifyExtensionRejected(booking, reason);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al rechazar extensión',
      };
    }
  }

  /**
   * Get pending extension requests for a booking
   */
  async getPendingExtensionRequests(bookingId: string): Promise<BookingExtensionRequest[]> {
    const { data, error } = await this.supabase
      .from('booking_extension_requests')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('request_status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending extension requests:', error);
      throw error;
    }
    return (data || []) as BookingExtensionRequest[];
  }

  /**
   * Estimate the additional cost of a booking extension
   */
  async estimateExtensionCost(
    booking: Booking,
    newEndDate: Date,
  ): Promise<{ amount: number; currency: string; error?: string }> {
    try {
      if (newEndDate <= new Date(booking.end_at)) {
        return {
          amount: 0,
          currency: booking.currency,
          error: 'La nueva fecha debe ser posterior a la actual',
        };
      }

      const currentEnd = new Date(booking.end_at);
      const additionalDays = Math.ceil(
        (newEndDate.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (additionalDays <= 0) {
        return {
          amount: 0,
          currency: booking.currency,
          error: 'La nueva fecha debe ser posterior a la actual',
        };
      }

      const pricePerDay = this.getBookingPricePerDay(booking);
      const estimatedAdditionalCost = pricePerDay * additionalDays;

      return { amount: estimatedAdditionalCost, currency: booking.currency };
    } catch (error) {
      return {
        amount: 0,
        currency: 'USD',
        error: error instanceof Error ? error.message : 'Error al estimar el costo de extensión',
      };
    }
  }

  /**
   * Extend insurance coverage when booking is extended
   */
  async extendInsuranceCoverageIfNeeded(
    bookingId: string,
    newEndAt: string,
    createPaymentIssueCallback?: (issue: {
      booking_id: string;
      issue_type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      metadata?: Record<string, unknown>;
    }) => Promise<void>,
  ): Promise<void> {
    try {
      const { data: coverage, error } = await this.supabase
        .from('booking_insurance_coverage')
        .select('id, coverage_end')
        .eq('booking_id', bookingId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      if (!coverage) return;

      const { error: updateError } = await this.supabase
        .from('booking_insurance_coverage')
        .update({
          coverage_end: newEndAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', coverage.id);

      if (updateError) throw updateError;

      this.logger.info('Insurance coverage extended', 'BookingExtensionService', {
        booking_id: bookingId,
        new_end_at: newEndAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : getErrorMessage(error);
      this.logger.warn(
        'Failed to extend insurance coverage; recorded issue',
        'BookingExtensionService',
        {
          booking_id: bookingId,
          new_end_at: newEndAt,
          error: message,
        },
      );

      if (createPaymentIssueCallback) {
        try {
          await createPaymentIssueCallback({
            booking_id: bookingId,
            issue_type: 'insurance_extension_required',
            severity: 'high',
            description: 'Extensión de seguro pendiente luego de aprobar extensión de reserva',
            metadata: {
              new_end_at: newEndAt,
              error: message,
            },
          });
        } catch (issueError) {
          this.logger.error(
            'Failed to create insurance extension issue',
            'BookingExtensionService',
            issueError,
          );
        }
      }
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private getBookingPricePerDay(booking: Booking & { price_per_day?: number | null }): number {
    return typeof booking.price_per_day === 'number' ? (booking.price_per_day ?? 0) : 0;
  }
}
