import { Injectable, inject } from '@angular/core';
import { Booking } from '@core/models';
import { getErrorMessage } from '@core/utils/type-guards';
import { InsuranceService } from '@core/services/bookings/insurance.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';

/**
 * Payment issue for audit trail
 */
export interface PaymentIssue {
  booking_id: string;
  issue_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata?: Record<string, unknown>;
  status?: 'pending_review' | 'in_progress' | 'resolved' | 'ignored';
}

/**
 * BookingInsuranceHelperService
 *
 * Responsable de:
 * - Activación de cobertura de seguro con retry
 * - Manejo de fallos de activación de seguro
 * - Delegación a InsuranceService para operaciones básicas
 * - Creación de issues de pago para audit trail
 *
 * P0-003 FIX: Insurance activation BLOCKS booking if it fails
 * All bookings MUST have active insurance coverage for legal compliance.
 *
 * Extraído de BookingsService para mejor separación de responsabilidades.
 */
@Injectable({
  providedIn: 'root',
})
export class BookingInsuranceHelperService {
  private readonly supabase = injectSupabase();
  private readonly insuranceService = inject(InsuranceService);
  private readonly logger = inject(LoggerService);

  private readonly MAX_RETRIES = 3;

  // ============================================================================
  // INSURANCE DELEGATION
  // ============================================================================

  /**
   * Activate insurance coverage for a booking
   */
  async activateInsuranceCoverage(
    bookingId: string,
    addonIds: string[] = [],
  ): Promise<{ success: boolean; coverage_id?: string; error?: string }> {
    try {
      const coverageId = await this.insuranceService.activateCoverage({
        booking_id: bookingId,
        addon_ids: addonIds,
      });

      return {
        success: true,
        coverage_id: coverageId,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al activar cobertura de seguro',
      };
    }
  }

  /**
   * Get insurance summary for a booking
   */
  async getBookingInsuranceSummary(bookingId: string) {
    return this.insuranceService.getInsuranceSummary(bookingId);
  }

  /**
   * Calculate security deposit for a car
   */
  async calculateInsuranceDeposit(carId: string): Promise<number> {
    return this.insuranceService.calculateSecurityDeposit(carId);
  }

  /**
   * Check if car has owner insurance
   */
  async hasOwnerInsurance(carId: string): Promise<boolean> {
    return this.insuranceService.hasOwnerInsurance(carId);
  }

  /**
   * Get insurance commission rate for a car
   */
  async getInsuranceCommissionRate(carId: string): Promise<number> {
    return this.insuranceService.getCommissionRate(carId);
  }

  // ============================================================================
  // INSURANCE ACTIVATION WITH RETRY (P0-003 FIX)
  // ============================================================================

  /**
   * Activate insurance coverage with retry logic and MANDATORY blocking
   *
   * CRITICAL: This method will throw an error if insurance activation fails
   * after all retries. This is MANDATORY for legal compliance - bookings
   * CANNOT proceed without valid insurance coverage.
   *
   * Features:
   * - 3 retry attempts with exponential backoff (1s, 2s, 4s)
   * - Detailed logging of each attempt
   * - Critical alerts to Sentry if all retries fail
   * - BLOCKS booking creation if insurance fails
   * - Auto-cancellation of booking if insurance fails
   *
   * @param bookingId - ID of the booking
   * @param addonIds - Optional insurance addon IDs
   * @param updateBookingFn - Function to update booking status
   * @throws Error if insurance activation fails after all retries
   */
  async activateInsuranceWithRetry(
    bookingId: string,
    addonIds: string[] = [],
    updateBookingFn: (bookingId: string, updates: Partial<Booking>) => Promise<Booking>,
  ): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        this.logger.info(
          `Attempting insurance activation (attempt ${attempt}/${this.MAX_RETRIES})`,
          'BookingInsuranceHelper',
          { bookingId, addonIds, attempt },
        );

        // Attempt to activate insurance
        await this.insuranceService.activateCoverage({
          booking_id: bookingId,
          addon_ids: addonIds,
        });

        this.logger.info('Insurance activated successfully', 'BookingInsuranceHelper', {
          bookingId,
          addonIds,
          attempt,
          totalAttempts: attempt,
        });

        // Success - insurance is active
        return;
      } catch (error) {
        lastError = error;

        this.logger.warn(
          `Insurance activation failed (attempt ${attempt}/${this.MAX_RETRIES})`,
          'BookingInsuranceHelper',
          error instanceof Error ? error : new Error(getErrorMessage(error)),
        );

        // If not the last attempt, wait with exponential backoff
        if (attempt < this.MAX_RETRIES) {
          const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          await this.delay(delayMs);
        }
      }
    }

    // All retries failed - CRITICAL ERROR
    await this.handleInsuranceActivationFailure(bookingId, addonIds, lastError, updateBookingFn);
  }

  // ============================================================================
  // PAYMENT ISSUES (Audit Trail)
  // ============================================================================

  /**
   * Create a payment issue record for manual review and background retry
   *
   * Esta función guarda los errores críticos de pago/wallet en la tabla
   * `payment_issues` para que un background job pueda reintentarlos.
   */
  async createPaymentIssue(issue: PaymentIssue): Promise<void> {
    const { error } = await this.supabase.from('payment_issues').insert({
      booking_id: issue.booking_id,
      issue_type: issue.issue_type,
      severity: issue.severity,
      description: issue.description,
      metadata: issue.metadata || {},
      status: issue.status || 'pending_review',
      created_at: new Date().toISOString(),
    });

    if (error) {
      this.logger.error('Failed to create payment issue record', 'BookingInsuranceHelper', error);
      throw error;
    }

    this.logger.info('Payment issue created successfully', 'BookingInsuranceHelper', {
      booking_id: issue.booking_id,
      issue_type: issue.issue_type,
      severity: issue.severity,
    });
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Handle critical insurance activation failure
   *
   * Actions:
   * 1. Log CRITICAL error (legal compliance)
   * 2. Auto-cancel the booking
   * 3. Create compliance issue record for audit trail
   *
   * @throws Error - Always throws to block booking creation
   */
  private async handleInsuranceActivationFailure(
    bookingId: string,
    addonIds: string[],
    error: unknown,
    updateBookingFn: (bookingId: string, updates: Partial<Booking>) => Promise<Booking>,
  ): Promise<never> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // 1. CRITICAL LOG - Legal compliance violation
    this.logger.critical(
      'CRITICAL: Insurance activation failed - LEGAL COMPLIANCE VIOLATION',
      'BookingInsuranceHelper',
      error instanceof Error ? error : new Error(`Insurance activation failed: ${errorMessage}`),
    );

    // 2. Log detailed information for audit trail
    this.logger.error(
      'Insurance activation failure details (LEGAL COMPLIANCE)',
      'BookingInsuranceHelper',
      error instanceof Error ? error : new Error(errorMessage),
    );

    // 3. Auto-cancel booking due to system failure
    try {
      await updateBookingFn(bookingId, {
        status: 'cancelled',
        cancellation_reason: 'system_failure:insurance_activation_failed',
        cancelled_at: new Date().toISOString(),
        cancelled_by_role: 'system',
      });

      this.logger.info(
        'Booking auto-cancelled due to insurance system failure',
        'BookingInsuranceHelper',
        {
          bookingId,
          status: 'cancelled',
          reason: 'system_failure:insurance_activation_failed',
          isSystemFailure: true,
        },
      );
    } catch (cancelError) {
      this.logger.error(
        'Failed to auto-cancel booking after insurance failure',
        'BookingInsuranceHelper',
        cancelError instanceof Error ? cancelError : new Error(getErrorMessage(cancelError)),
      );
    }

    // 4. Create compliance issue for audit trail
    try {
      await this.createPaymentIssue({
        booking_id: bookingId,
        issue_type: 'insurance_activation_failed',
        severity: 'critical',
        description: `LEGAL COMPLIANCE: Failed to activate insurance after ${this.MAX_RETRIES} retry attempts. Booking auto-cancelled.`,
        metadata: {
          addon_ids: addonIds,
          error: errorMessage,
          stack: errorStack,
          timestamp: new Date().toISOString(),
          retry_count: this.MAX_RETRIES,
          compliance_violation: true,
          legal_risk: 'HIGH',
        },
        status: 'pending_review',
      });
    } catch (issueError) {
      this.logger.error(
        'Failed to create compliance issue record',
        'BookingInsuranceHelper',
        issueError instanceof Error ? issueError : new Error(getErrorMessage(issueError)),
      );
    }

    // 5. THROW ERROR - BLOCK booking creation
    throw new Error(
      `CRITICAL: Cannot create booking without insurance coverage. ` +
        `Insurance activation failed after ${this.MAX_RETRIES} attempts. ` +
        `Error: ${errorMessage}. ` +
        `Booking has been auto-cancelled for legal compliance.`,
    );
  }

  /**
   * Utility: Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
