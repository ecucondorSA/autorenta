import { Injectable, inject } from '@angular/core';
import { injectSupabase } from './supabase-client.service';
import { AuthService } from './auth.service';
import { LoggerService } from './logger.service';

export interface ProcessRefundRequest {
  booking_id: string;
  refund_type: 'full' | 'partial';
  amount?: number;
  reason?: string;
}

export interface ProcessRefundResponse {
  success: boolean;
  refund: {
    id: string;
    amount: number;
    type: 'full' | 'partial';
    status: string;
    date_created: string;
  };
  booking_id: string;
  payment_id: string;
  error?: string;
}

/**
 * Refund Service - Handle booking refunds via MercadoPago
 *
 * Integrates with Supabase Edge Function `mercadopago-process-refund`
 * to process full and partial refunds for bookings.
 *
 * @example
 * ```typescript
 * const refundService = inject(RefundService);
 *
 * // Process full refund
 * const result = await refundService.processRefund({
 *   booking_id: 'xxx',
 *   refund_type: 'full',
 *   reason: 'Customer request'
 * });
 *
 * // Process partial refund
 * const result = await refundService.processRefund({
 *   booking_id: 'xxx',
 *   refund_type: 'partial',
 *   amount: 5000,
 *   reason: 'Partial cancellation'
 * });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class RefundService {
  private readonly supabase = injectSupabase();
  private readonly authService = inject(AuthService);
  private readonly logger = inject(LoggerService);

  /**
   * Process a refund for a booking
   *
   * @param request - Refund request parameters
   * @returns Refund response with status and details
   */
  async processRefund(request: ProcessRefundRequest): Promise<ProcessRefundResponse> {
    try {
      // Validate request
      this.validateRefundRequest(request);

      // P0-012: Validate booking eligibility for refund
      await this.validateRefundEligibility(request.booking_id, request.amount);

      // Get auth token
      const session = await this.authService.ensureSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Log refund attempt
      this.logger.info(
        `Refund attempt: booking=${request.booking_id}, type=${request.refund_type}, amount=${request.amount}`,
        'RefundService',
      );

      // Call Edge Function
      const { data, error } = await this.supabase.functions.invoke('mercadopago-process-refund', {
        body: request,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        this.logger.error('Refund processing failed', 'RefundService', error as Error);
        throw new Error(error.message || 'Failed to process refund');
      }

      if (!data || !data.success) {
        const errorMsg = data?.error || 'Unknown error processing refund';
        this.logger.error('Refund processing failed', 'RefundService', new Error(errorMsg));
        throw new Error(errorMsg);
      }

      this.logger.info(
        `Refund processed successfully: ${data.refund.id} for booking ${data.booking_id}`,
        'RefundService',
      );

      return data as ProcessRefundResponse;
    } catch (error) {
      this.logger.error('Error in processRefund', 'RefundService', error as Error);
      throw error;
    }
  }

  /**
   * Validate refund request parameters
   */
  private validateRefundRequest(request: ProcessRefundRequest): void {
    if (!request.booking_id) {
      throw new Error('booking_id is required');
    }

    if (!request.refund_type || !['full', 'partial'].includes(request.refund_type)) {
      throw new Error('refund_type must be "full" or "partial"');
    }

    if (request.refund_type === 'partial') {
      if (!request.amount || request.amount <= 0) {
        throw new Error('amount is required for partial refunds and must be greater than 0');
      }
    }
  }

  /**
   * Get refund status for a booking
   *
   * @param bookingId - Booking ID
   * @returns Refund information from booking metadata
   */
  async getRefundStatus(bookingId: string): Promise<{
    has_refund: boolean;
    refund_id?: string;
    refund_amount?: number;
    refund_status?: string;
    refund_date?: string;
  }> {
    try {
      const { data: booking, error } = await this.supabase
        .from('bookings')
        .select('metadata')
        .eq('id', bookingId)
        .single();

      if (error || !booking) {
        throw new Error('Booking not found');
      }

      const refund = booking.metadata?.refund;

      if (!refund) {
        return { has_refund: false };
      }

      return {
        has_refund: true,
        refund_id: refund.id,
        refund_amount: refund.amount,
        refund_status: refund.status,
        refund_date: refund.date_created,
      };
    } catch (error) {
      this.logger.error('Error getting refund status', 'RefundService', error as Error);
      throw error;
    }
  }

  /**
   * P0-012: Validate booking eligibility for refund
   * - Booking status must be 'confirmed' or 'in_progress'
   * - Booking must be less than 30 days old
   * - Refund amount must not exceed booking amount
   * - No pending insurance claims
   */
  private async validateRefundEligibility(
    bookingId: string,
    requestedAmount?: number,
  ): Promise<void> {
    const { data: booking, error } = await this.supabase
      .from('bookings')
      .select('status, total_price, created_at, metadata')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      throw new Error('Booking not found');
    }

    // Validate booking status
    const validStatuses = ['confirmed', 'in_progress'];
    if (!validStatuses.includes(booking.status)) {
      throw new Error(
        `Cannot refund booking with status "${booking.status}". Only confirmed or in-progress bookings can be refunded.`,
      );
    }

    // Validate booking age (must be < 30 days)
    const bookingDate = new Date(booking.created_at);
    const daysSinceBooking = Math.floor(
      (Date.now() - bookingDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceBooking > 30) {
      throw new Error(
        `Cannot refund bookings older than 30 days. This booking is ${daysSinceBooking} days old.`,
      );
    }

    // Validate refund amount
    if (requestedAmount && requestedAmount > booking.total_price) {
      throw new Error(
        `Refund amount ($${requestedAmount}) exceeds booking total ($${booking.total_price})`,
      );
    }

    // Check for ANY active insurance claims (not just pending/under_review)
    // P0-SECURITY: Block refund if claim exists in ANY non-terminal state
    // This prevents race condition where user cancels while claim is being processed
    const { data: claims, error: claimsError } = await this.supabase
      .from('claims')
      .select('id, status')
      .eq('booking_id', bookingId)
      .in('status', ['draft', 'submitted', 'pending', 'under_review', 'approved']);

    if (claimsError) {
      this.logger.error('Error checking claims', 'RefundService', claimsError as Error);
      // P0-SECURITY: BLOCK refund on claims check error - fail safe
      throw new Error(
        'Unable to verify claim status. Please try again or contact support.',
      );
    } else if (claims && claims.length > 0) {
      const claimStatuses = claims.map(c => c.status).join(', ');
      throw new Error(
        `Cannot refund booking with active insurance claims (status: ${claimStatuses}). Please wait for claim resolution or rejection.`,
      );
    }
  }
}
