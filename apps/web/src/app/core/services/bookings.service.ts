import { Injectable, inject } from '@angular/core';
import { Booking } from '../models';
import { getErrorMessage } from '../utils/type-guards';
import { injectSupabase } from './supabase-client.service';
import { PwaService } from './pwa.service';
import { InsuranceService } from './insurance.service';
import { LoggerService } from './logger.service';
import { BookingWalletService } from './booking-wallet.service';
import { BookingApprovalService } from './booking-approval.service';
import { BookingCompletionService } from './booking-completion.service';
import { BookingValidationService } from './booking-validation.service';
import { BookingCancellationService } from './booking-cancellation.service';
import { BookingUtilsService } from './booking-utils.service';

/**
 * Core booking service
 * Handles CRUD operations and coordinates with specialized booking services
 * Refactored from 1,427 lines to ~400 lines by extracting responsibilities
 */
@Injectable({
  providedIn: 'root',
})
export class BookingsService {
  private readonly supabase = injectSupabase();
  private readonly pwaService = inject(PwaService);
  private readonly insuranceService = inject(InsuranceService);
  private readonly logger = inject(LoggerService);

  // Specialized booking services
  private readonly walletService = inject(BookingWalletService);
  private readonly approvalService = inject(BookingApprovalService);
  private readonly completionService = inject(BookingCompletionService);
  private readonly validationService = inject(BookingValidationService);
  private readonly cancellationService = inject(BookingCancellationService);
  private readonly utilsService = inject(BookingUtilsService);

  // ============================================================================
  // CORE CRUD OPERATIONS
  // ============================================================================

  /**
   * Request a new booking
   */
  async requestBooking(carId: string, start: string, end: string): Promise<Booking> {
    const { data, error } = await this.supabase.rpc('request_booking', {
      p_car_id: carId,
      p_start: start,
      p_end: end,
    });

    if (error) {
      const errorMessage = error.message || error.details || 'Error al crear la reserva';

      this.logger.error('request_booking RPC failed: ' + JSON.stringify({
        error,
        carId,
        start,
        end,
        message: errorMessage,
        code: error.code,
        details: error.details,
        hint: error.hint,
      }));

      throw new Error(errorMessage);
    }

    const bookingId = this.utilsService.extractBookingId(data);
    if (!bookingId) {
      throw new Error('request_booking did not return a booking id');
    }

    // Activate insurance coverage automatically
    try {
      await this.insuranceService.activateCoverage({
        booking_id: bookingId,
        addon_ids: [],
      });
    } catch (insuranceError) {
      this.logger.error(
        'Insurance activation failed',
        'BookingsService',
        insuranceError instanceof Error ? insuranceError : new Error(getErrorMessage(insuranceError)),
      );
      // Don't block booking if insurance fails
    }

    // Recalculate pricing breakdown
    await this.recalculatePricing(bookingId);

    // Fetch the updated booking
    const updated = await this.getBookingById(bookingId);
    if (updated) {
      return updated;
    }

    return { ...(data as Booking), id: bookingId };
  }

  /**
   * Get bookings for current user using the my_bookings view
   */
  async getMyBookings(): Promise<Booking[]> {
    const { data, error } = await this.supabase
      .from('my_bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const bookings = (data ?? []) as Booking[];
    await this.updateAppBadge(bookings);

    return bookings;
  }

  /**
   * Get bookings for cars owned by current user
   */
  async getOwnerBookings(): Promise<Booking[]> {
    const { data, error } = await this.supabase
      .from('owner_bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Booking[];
  }

  /**
   * Get booking by ID with full details
   */
  async getBookingById(bookingId: string): Promise<Booking | null> {
    const { data, error } = await this.supabase
      .from('my_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    const booking = data as Booking;

    // Load car details
    if (booking?.car_id) {
      await this.loadCarDetails(booking);
    }

    // Load insurance coverage
    if (booking?.insurance_coverage_id) {
      await this.loadInsuranceCoverage(booking);
    }

    return booking;
  }

  /**
   * Recalculate pricing breakdown for a booking
   */
  async recalculatePricing(bookingId: string): Promise<void> {
    const { error } = await this.supabase.rpc('pricing_recalculate', {
      p_booking_id: bookingId,
    });

    if (error) throw error;
  }

  /**
   * Update booking fields
   */
  async updateBooking(bookingId: string, updates: Partial<Booking>): Promise<Booking> {
    const { data, error } = await this.supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;
    return data as Booking;
  }

  /**
   * Mark booking as paid
   */
  async markAsPaid(bookingId: string, paymentIntentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_intent_id: paymentIntentId,
        paid_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (error) throw error;
  }

  /**
   * Get owner contact information
   */
  async getOwnerContact(ownerId: string): Promise<{
    success: boolean;
    email?: string;
    phone?: string;
    name?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('email, phone, full_name')
        .eq('id', ownerId)
        .single();

      if (error || !data) {
        return {
          success: false,
          error: 'No se pudo obtener información del propietario',
        };
      }

      return {
        success: true,
        email: data.email,
        phone: data.phone || undefined,
        name: data.full_name || undefined,
      };
    } catch (_error) {
      return {
        success: false,
        error: _error instanceof Error ? _error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // ATOMIC BOOKING CREATION
  // ============================================================================

  /**
   * Create booking atomically with risk snapshot
   * Prevents "phantom bookings" using a single transaction
   */
  async createBookingAtomic(params: {
    carId: string;
    startDate: string;
    endDate: string;
    totalAmount: number;
    currency: string;
    paymentMode: string;
    coverageUpgrade?: string;
    authorizedPaymentId?: string;
    walletLockId?: string;
    riskSnapshot: {
      dailyPriceUsd: number;
      securityDepositUsd: number;
      vehicleValueUsd: number;
      driverAge: number;
      coverageType: string;
      paymentMode: string;
      totalUsd: number;
      totalArs: number;
      exchangeRate: number;
    };
  }): Promise<{
    success: boolean;
    bookingId?: string;
    riskSnapshotId?: string;
    error?: string;
  }> {
    try {
      const user = await this.supabase.auth.getUser();
      if (!user.data.user?.id) {
        return {
          success: false,
          error: 'Usuario no autenticado',
        };
      }

      const { data, error } = await this.supabase.rpc('create_booking_atomic', {
        p_car_id: params.carId,
        p_renter_id: user.data.user.id,
        p_start_date: params.startDate,
        p_end_date: params.endDate,
        p_total_amount: params.totalAmount,
        p_currency: params.currency,
        p_payment_mode: params.paymentMode,
        p_coverage_upgrade: params.coverageUpgrade || null,
        p_authorized_payment_id: params.authorizedPaymentId || null,
        p_wallet_lock_id: params.walletLockId || null,
        p_risk_daily_price_usd: params.riskSnapshot.dailyPriceUsd,
        p_risk_security_deposit_usd: params.riskSnapshot.securityDepositUsd,
        p_risk_vehicle_value_usd: params.riskSnapshot.vehicleValueUsd,
        p_risk_driver_age: params.riskSnapshot.driverAge,
        p_risk_coverage_type: params.riskSnapshot.coverageType,
        p_risk_payment_mode: params.riskSnapshot.paymentMode,
        p_risk_total_usd: params.riskSnapshot.totalUsd,
        p_risk_total_ars: params.riskSnapshot.totalArs,
        p_risk_exchange_rate: params.riskSnapshot.exchangeRate,
      });

      if (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Error al crear la reserva',
        };
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (!result || !result.success) {
        return {
          success: false,
          error: result?.error_message || 'Error desconocido al crear la reserva',
        };
      }

      // Activate insurance coverage
      try {
        await this.insuranceService.activateCoverage({
          booking_id: result.booking_id,
          addon_ids: [],
        });
      } catch (_insuranceError) {
        // Don't block booking if insurance fails
      }

      return {
        success: true,
        bookingId: result.booking_id,
        riskSnapshotId: result.risk_snapshot_id,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error inesperado al crear la reserva',
      };
    }
  }

  // ============================================================================
  // DELEGATED OPERATIONS (Use specialized services)
  // ============================================================================

  // Wallet Operations
  async chargeRentalFromWallet(
    bookingId: string,
    amountCents: number,
    description?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { ok: false, error: 'Booking not found' };

    const result = await this.walletService.chargeRentalFromWallet(booking, amountCents, description);
    if (result.ok) {
      await this.updateBooking(bookingId, {
        status: 'completed',
        wallet_status: 'charged',
        paid_at: new Date().toISOString(),
      });
    }
    return result;
  }

  async processRentalPayment(
    bookingId: string,
    amountCents: number,
    description?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { ok: false, error: 'Booking not found' };

    return this.walletService.processRentalPayment(booking, amountCents, description);
  }

  async lockSecurityDeposit(
    bookingId: string,
    depositAmountCents: number,
    description?: string,
  ): Promise<{ ok: boolean; transaction_id?: string; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { ok: false, error: 'Booking not found' };

    const result = await this.walletService.lockSecurityDeposit(booking, depositAmountCents, description);
    if (result.ok) {
      await this.updateBooking(bookingId, {
        wallet_status: 'locked',
        wallet_lock_transaction_id: result.transaction_id,
      });
    }
    return result;
  }

  async releaseSecurityDeposit(
    bookingId: string,
    description?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { ok: false, error: 'Booking not found' };

    const result = await this.walletService.releaseSecurityDeposit(booking, description);
    if (result.ok) {
      await this.updateBooking(bookingId, { wallet_status: 'refunded' });
    }
    return result;
  }

  async deductFromSecurityDeposit(
    bookingId: string,
    damageAmountCents: number,
    damageDescription: string,
  ): Promise<{ ok: boolean; remaining_deposit?: number; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { ok: false, error: 'Booking not found' };

    const result = await this.walletService.deductFromSecurityDeposit(
      booking,
      damageAmountCents,
      damageDescription,
    );

    if (result.ok) {
      const remainingDeposit = result.remaining_deposit ?? 0;
      await this.updateBooking(bookingId, {
        wallet_status: remainingDeposit > 0 ? 'partially_charged' : 'charged',
      });
    }

    return result;
  }

  // Approval Operations
  async getPendingApprovals(): Promise<Record<string, unknown>[]> {
    return this.approvalService.getPendingApprovals();
  }

  async approveBooking(
    bookingId: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    return this.approvalService.approveBooking(bookingId);
  }

  async rejectBooking(
    bookingId: string,
    reason?: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    return this.approvalService.rejectBooking(bookingId, reason);
  }

  async carRequiresApproval(carId: string): Promise<boolean> {
    return this.approvalService.carRequiresApproval(carId);
  }

  // Completion Operations
  async completeBookingClean(bookingId: string): Promise<{ success: boolean; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };

    return this.completionService.completeBookingClean(booking, this.updateBooking.bind(this));
  }

  async completeBookingWithDamages(
    bookingId: string,
    damageAmountCents: number,
    damageDescription: string,
    claimSeverity: number = 1,
  ): Promise<{ success: boolean; remaining_deposit?: number; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };

    return this.completionService.completeBookingWithDamages(
      booking,
      damageAmountCents,
      damageDescription,
      claimSeverity,
      this.updateBooking.bind(this),
    );
  }

  // Validation Operations
  async createBookingWithValidation(
    carId: string,
    startDate: string,
    endDate: string,
  ): Promise<{
    success: boolean;
    booking?: Booking;
    error?: string;
    canWaitlist?: boolean;
  }> {
    return this.validationService.createBookingWithValidation(
      carId,
      startDate,
      endDate,
      this.requestBooking.bind(this),
    );
  }

  // Cancellation Operations
  async cancelBooking(
    bookingId: string,
    force: boolean = false,
  ): Promise<{ success: boolean; error?: string }> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) return { success: false, error: 'Reserva no encontrada' };

    return this.cancellationService.cancelBooking(booking, force);
  }

  async cancelBookingLegacy(bookingId: string, reason?: string): Promise<void> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');

    return this.cancellationService.cancelBookingLegacy(booking, reason);
  }

  // Utility Operations
  getTimeUntilExpiration(booking: Booking): number | null {
    return this.utilsService.getTimeUntilExpiration(booking);
  }

  formatTimeRemaining(milliseconds: number): string {
    return this.utilsService.formatTimeRemaining(milliseconds);
  }

  isExpired(booking: Booking): boolean {
    return this.utilsService.isExpired(booking);
  }

  // Insurance Operations (delegation to InsuranceService)
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

  async getBookingInsuranceSummary(bookingId: string) {
    return this.insuranceService.getInsuranceSummary(bookingId);
  }

  async calculateInsuranceDeposit(carId: string): Promise<number> {
    return this.insuranceService.calculateSecurityDeposit(carId);
  }

  async hasOwnerInsurance(carId: string): Promise<boolean> {
    return this.insuranceService.hasOwnerInsurance(carId);
  }

  async getInsuranceCommissionRate(carId: string): Promise<number> {
    return this.insuranceService.getCommissionRate(carId);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Update app badge with pending bookings count
   */
  private async updateAppBadge(bookings: Booking[]): Promise<void> {
    const pendingCount = bookings.filter(
      (b) => b.status === 'pending' || b.status === 'confirmed',
    ).length;

    if (pendingCount > 0) {
      await this.pwaService.setAppBadge(pendingCount);
    } else {
      await this.pwaService.clearAppBadge();
    }
  }

  /**
   * Load car details for a booking
   */
  private async loadCarDetails(booking: Booking): Promise<void> {
    try {
      const { data: car, error: carError } = await this.supabase
        .from('cars')
        .select('id, brand, model, year, license_plate, images')
        .eq('id', booking.car_id)
        .single();

      if (!carError && car) {
        (booking as Booking).car = car as Partial<import('../models').Car>;
      } else if (carError) {
        this.logger.error(
          'Car query error',
          'BookingsService',
          carError instanceof Error ? carError : new Error(getErrorMessage(carError)),
        );
      }
    } catch (carException) {
      this.logger.error(
        'Error loading car details',
        'BookingsService',
        carException instanceof Error ? carException : new Error(getErrorMessage(carException)),
      );
      throw new Error(
        `Failed to load car details: ${carException instanceof Error ? carException.message : getErrorMessage(carException)}`,
      );
    }
  }

  /**
   * Load insurance coverage for a booking
   */
  private async loadInsuranceCoverage(booking: Booking): Promise<void> {
    try {
      const { data: coverage, error: coverageError } = await this.supabase
        .from('booking_insurance_coverage')
        .select('*')
        .eq('id', booking.insurance_coverage_id)
        .single();

      if (!coverageError && coverage) {
        if (coverage.policy_id) {
          const { data: policy, error: policyError } = await this.supabase
            .from('insurance_policies')
            .select('*')
            .eq('id', coverage.policy_id)
            .single();

          if (!policyError && policy) {
            (coverage as Record<string, unknown>)['policy'] = policy;
          } else if (policyError) {
            this.logger.error(
              'Policy query error',
              'BookingsService',
              policyError instanceof Error ? policyError : new Error(getErrorMessage(policyError)),
            );
            throw new Error(`Failed to load policy: ${policyError.message}`);
          }
        }

        (booking as Booking).insurance_coverage = coverage;
      } else if (coverageError) {
        this.logger.error(
          'Coverage query error',
          'BookingsService',
          coverageError instanceof Error ? coverageError : new Error(getErrorMessage(coverageError)),
        );
        throw new Error(`Failed to load coverage: ${coverageError.message}`);
      }
    } catch (coverageException) {
      this.logger.error(
        'Error loading coverage details',
        'BookingsService',
        coverageException instanceof Error
          ? coverageException
          : new Error(getErrorMessage(coverageException)),
      );
      throw new Error(
        `Failed to load insurance coverage: ${coverageException instanceof Error ? coverageException.message : getErrorMessage(coverageException)}`,
      );
    }
  }
}
