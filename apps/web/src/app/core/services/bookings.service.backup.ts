import { Injectable, inject } from '@angular/core';
import { firstValueFrom, from } from 'rxjs';
import { ignoreElements } from 'rxjs/operators';
import { Booking } from '../models';
import { environment } from '../../../environments/environment';
import { getErrorMessage } from '../utils/type-guards';
import { injectSupabase } from './supabase-client.service';
import { ErrorHandlerService } from './error-handler.service';
import { LoggerService } from './logger.service';
import { WalletService } from './wallet.service';
import { PwaService } from './pwa.service';
import { InsuranceService } from './insurance.service';
import { DriverProfileService } from './driver-profile.service';

@Injectable({
  providedIn: 'root',
})
export class BookingsService {
  private readonly supabase = injectSupabase();
  private readonly walletService = inject(WalletService);
  private readonly pwaService = inject(PwaService);
  private readonly insuranceService = inject(InsuranceService);
  private readonly driverProfileService = inject(DriverProfileService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly logger = inject(LoggerService);

  async requestBooking(carId: string, start: string, end: string): Promise<Booking> {
    const { data, error } = await this.supabase.rpc('request_booking', {
      p_car_id: carId,
      p_start: start,
      p_end: end,
    });

    if (error) {
      // Extraer mensaje de error de Supabase
      // Los errores de RPC pueden venir en diferentes formatos:
      // - error.message: mensaje directo
      // - error.details: detalles adicionales
      // - error.hint: sugerencias
      const errorMessage = error.message || error.details || 'Error al crear la reserva';

      // Log detallado para debugging
      this.logger.error(
        'request_booking RPC failed: ' +
          JSON.stringify({
            error,
            carId,
            start,
            end,
            message: errorMessage,
            code: error.code,
            details: error.details,
            hint: error.hint,
          }),
      );

      // Lanzar error con mensaje extraído
      throw new Error(errorMessage);
    }

    const bookingId = this.extractBookingId(data);
    if (!bookingId) {
      throw new Error('request_booking did not return a booking id');
    }

    // Activar cobertura de seguro automáticamente
    try {
      await this.insuranceService.activateCoverage({
        booking_id: bookingId,
        addon_ids: [], // Sin add-ons por defecto, se agregan en checkout
      });
    } catch (insuranceError) {
      this.logger.error(
        'Insurance activation failed',
        'BookingsService',
        insuranceError instanceof Error
          ? insuranceError
          : new Error(getErrorMessage(insuranceError)),
      );
      // No bloqueamos la reserva si falla el seguro
      // El trigger de BD también lo activará al confirmar
    }

    // Recalculate pricing breakdown after creating booking
    await this.recalculatePricing(bookingId);

    // Fetch the updated booking with breakdown
    const updated = await this.getBookingById(bookingId);
    if (updated) {
      return updated;
    }

    return { ...(data as Booking), id: bookingId };
  }

  /**
   * Get bookings for current user using the my_bookings view
   * This includes car details, photos, and payment status
   */
  async getMyBookings(): Promise<Booking[]> {
    const { data, error } = await this.supabase
      .from('my_bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const bookings = (data ?? []) as Booking[];

    // Update app badge with pending bookings count
    await this.updateAppBadge(bookings);

    return bookings;
  }

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

    // my_bookings es una vista sin metadatos de FK, por lo que PostgREST
    // no puede resolver joins automáticos; cargamos car, cobertura y su póliza aparte.

    // Load car details
    if (booking?.car_id) {
      try {
        const { data: car, error: carError } = await this.supabase
          .from('cars')
          .select('id, brand, model, year, license_plate, images')
          .eq('id', booking.car_id)
          .single();

        if (!carError && car) {
          (booking as Booking).car = car as Partial<import('../models').Car>; // Partial select, not full Car object
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

    if (booking?.insurance_coverage_id) {
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
                policyError instanceof Error
                  ? policyError
                  : new Error(getErrorMessage(policyError)),
              );
              throw new Error(`Failed to load policy: ${policyError.message}`);
            }
          }

          (booking as Booking).insurance_coverage = coverage;
        } else if (coverageError) {
          this.logger.error(
            'Coverage query error',
            'BookingsService',
            coverageError instanceof Error
              ? coverageError
              : new Error(getErrorMessage(coverageError)),
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
   * NOTE: This method is used to update a booking with partial data.
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
   * Cancel a booking (legacy method - use cancelBooking for new code)
   * If the booking has locked wallet funds, they will be unlocked automatically
   */
  async cancelBookingLegacy(bookingId: string, reason?: string): Promise<void> {
    // 1. Get booking to check wallet status
    const booking = await this.getBookingById(bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    // 2. If wallet funds are locked, unlock them before cancelling
    if (booking.wallet_status === 'locked' && booking.wallet_lock_transaction_id) {
      try {
        await this.walletService.unlockFunds(
          bookingId,
          `Fondos desbloqueados por cancelación: ${reason ?? 'Cancelled by user'}`,
        );
      } catch (unlockError) {
        this.logger.error(
          'Failed to unlock funds',
          'BookingsService',
          unlockError instanceof Error ? unlockError : new Error(getErrorMessage(unlockError)),
        );
        // Continue with cancellation even if unlock fails
        // The unlock can be retried manually later
      }
    }

    // 3. Cancel the booking
    const { error } = await this.supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason ?? 'Cancelled by user',
        wallet_status: booking.wallet_status === 'locked' ? 'refunded' : booking.wallet_status,
      })
      .eq('id', bookingId);

    if (error) throw error;
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
   * Charge rental from user's wallet using the new ledger system
   * This is called when a booking is completed and the owner wants to charge the renter
   */
  async chargeRentalFromWallet(
    bookingId: string,
    amountCents: number,
    description?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      // Get booking to verify user_id
      const booking = await this.getBookingById(bookingId);

      if (!booking) {
        return { ok: false, error: 'Booking not found' };
      }

      if (!booking.user_id) {
        return { ok: false, error: 'Booking has no user_id' };
      }

      // Generate unique ref
      const ref = `rental-${bookingId}-${Date.now()}`;

      // Call wallet_charge_rental RPC function
      const { error } = await this.supabase.rpc('wallet_charge_rental', {
        p_user_id: booking.user_id,
        p_booking_id: bookingId,
        p_amount_cents: amountCents,
        p_ref: ref,
        p_meta: {
          charged_at: new Date().toISOString(),
          description: description || `Cargo por alquiler - Reserva ${bookingId.substring(0, 8)}`,
          car_id: booking.car_id,
        },
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      // Update booking status
      await this.updateBooking(bookingId, {
        status: 'completed',
        wallet_status: 'charged',
        paid_at: new Date().toISOString(),
      });

      return { ok: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      return { ok: false, error: errorMsg };
    }
  }

  /**
   * Process rental payment (receives payment from renter to owner)
   * This is the counterpart - when the owner receives the payment for a completed rental
   */
  async processRentalPayment(
    bookingId: string,
    amountCents: number,
    description?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      // Get booking to verify car owner
      const booking = await this.getBookingById(bookingId);

      if (!booking) {
        return { ok: false, error: 'Booking not found' };
      }

      if (!booking.owner_id) {
        return { ok: false, error: 'Booking has no owner_id' };
      }

      // Generate unique ref
      const ref = `rental-payment-${bookingId}-${Date.now()}`;

      // Insert rental_payment ledger entry manually
      const { error } = await this.supabase.from('wallet_ledger').insert({
        user_id: booking.owner_id,
        kind: 'rental_payment',
        amount_cents: amountCents,
        ref,
        booking_id: bookingId,
        meta: {
          received_at: new Date().toISOString(),
          description: description || `Pago recibido - Reserva ${bookingId.substring(0, 8)}`,
          car_id: booking.car_id,
          renter_id: booking.user_id,
        },
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      return { ok: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      return { ok: false, error: errorMsg };
    }
  }

  /**
   * Lock security deposit (guarantee) when booking is confirmed
   * The funds stay in the user's wallet but are marked as locked
   */
  async lockSecurityDeposit(
    bookingId: string,
    depositAmountCents: number,
    description?: string,
  ): Promise<{ ok: boolean; transaction_id?: string; error?: string }> {
    try {
      const booking = await this.getBookingById(bookingId);

      if (!booking) {
        return { ok: false, error: 'Booking not found' };
      }

      if (!booking.user_id) {
        return { ok: false, error: 'Booking has no user_id' };
      }

      // Check if user has sufficient available balance
      const { data: wallet, error: walletError } = await this.supabase
        .from('user_wallets')
        .select('available_balance')
        .eq('user_id', booking.user_id)
        .single();

      if (walletError) {
        return { ok: false, error: 'Error checking wallet balance' };
      }

      if (wallet.available_balance < depositAmountCents) {
        return {
          ok: false,
          error: `Saldo insuficiente. Disponible: ${wallet.available_balance / 100}, Requerido: ${depositAmountCents / 100}`,
        };
      }

      // Lock funds using wallet service
      const lockResult = await firstValueFrom(
        this.walletService.lockFunds(
          bookingId,
          depositAmountCents,
          description || `Garantía bloqueada - Reserva ${bookingId.substring(0, 8)}`,
        ),
      );

      if (!lockResult.success) {
        return { ok: false, error: lockResult.message };
      }

      // Update booking with security deposit info
      await this.updateBooking(bookingId, {
        wallet_status: 'locked',
        wallet_lock_transaction_id: lockResult.transaction_id ?? undefined,
      });

      return {
        ok: true,
        transaction_id: lockResult.transaction_id ?? undefined,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      return { ok: false, error: errorMsg };
    }
  }

  /**
   * Release security deposit when rental ends without issues
   */
  async releaseSecurityDeposit(
    bookingId: string,
    description?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const booking = await this.getBookingById(bookingId);

      if (!booking) {
        return { ok: false, error: 'Booking not found' };
      }

      if (booking.wallet_status !== 'locked') {
        return { ok: false, error: 'No security deposit is locked for this booking' };
      }

      // Unlock funds
      const unlockResult = await firstValueFrom(
        this.walletService.unlockFunds(
          bookingId,
          description || `Garantía liberada - Sin daños - Reserva ${bookingId.substring(0, 8)}`,
        ),
      );

      if (!unlockResult.success) {
        return { ok: false, error: unlockResult.message };
      }

      // Update booking
      await this.updateBooking(bookingId, {
        wallet_status: 'refunded',
      });

      return { ok: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      return { ok: false, error: errorMsg };
    }
  }

  /**
   * Deduct from security deposit for damages
   * Charges a portion (or all) of the locked security deposit
   */
  async deductFromSecurityDeposit(
    bookingId: string,
    damageAmountCents: number,
    damageDescription: string,
  ): Promise<{ ok: boolean; remaining_deposit?: number; error?: string }> {
    try {
      const booking = await this.getBookingById(bookingId);

      if (!booking) {
        return { ok: false, error: 'Booking not found' };
      }

      if (!booking.user_id || !booking.owner_id) {
        return { ok: false, error: 'Booking missing user_id or owner_id' };
      }

      if (booking.wallet_status !== 'locked') {
        return { ok: false, error: 'No security deposit is locked for this booking' };
      }

      // Get locked amount from consolidated view
      // ACTUALIZADO (2025-10-22): Usa vista consolidada que incluye legacy + ledger
      const { data: lockTx, error: lockTxError } = await this.supabase
        .from('v_wallet_history')
        .select('amount_cents')
        .eq('id', booking.wallet_lock_transaction_id)
        .in('transaction_type', ['lock', 'security_deposit_lock', 'rental_payment_lock'])
        .single();

      if (lockTxError || !lockTx) {
        return { ok: false, error: 'Lock transaction not found' };
      }

      // Vista consolidada retorna amount_cents, convertir a centavos si es necesario
      const lockedAmount = lockTx.amount_cents;

      if (damageAmountCents > lockedAmount) {
        return {
          ok: false,
          error: `Damage amount (${damageAmountCents / 100}) exceeds locked deposit (${lockedAmount / 100})`,
        };
      }

      // Generate unique ref
      const ref = `damage-deduction-${bookingId}-${Date.now()}`;

      // 1. Deduct from renter's locked funds (rental_charge kind)
      const { error: deductError } = await this.supabase.from('wallet_ledger').insert({
        user_id: booking.user_id,
        kind: 'rental_charge',
        amount_cents: damageAmountCents,
        ref: `${ref}-charge`,
        booking_id: bookingId,
        meta: {
          damage_description: damageDescription,
          deducted_at: new Date().toISOString(),
          car_id: booking.car_id,
          original_deposit: lockedAmount,
        },
      });

      if (deductError) {
        return { ok: false, error: deductError.message };
      }

      // 2. Pay to owner (rental_payment kind)
      const { error: paymentError } = await this.supabase.from('wallet_ledger').insert({
        user_id: booking.owner_id,
        kind: 'rental_payment',
        amount_cents: damageAmountCents,
        ref: `${ref}-payment`,
        booking_id: bookingId,
        meta: {
          damage_description: damageDescription,
          received_at: new Date().toISOString(),
          car_id: booking.car_id,
          renter_id: booking.user_id,
        },
      });

      if (paymentError) {
        return { ok: false, error: paymentError.message };
      }

      // 3. Release remaining deposit (if any)
      const remainingDeposit = lockedAmount - damageAmountCents;

      if (remainingDeposit > 0) {
        // Unlock remaining funds
        await this.walletService.unlockFunds(
          bookingId,
          `Garantía parcialmente liberada - Daños: ${damageAmountCents / 100} - Reserva ${bookingId.substring(0, 8)}`,
        );

        await this.updateBooking(bookingId, {
          wallet_status: 'partially_charged',
        });
      } else {
        // All deposit used
        await this.updateBooking(bookingId, {
          wallet_status: 'charged',
        });
      }

      return {
        ok: true,
        remaining_deposit: remainingDeposit,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      return { ok: false, error: errorMsg };
    }
  }

  /**
   * Get time remaining until booking expires (in milliseconds)
   * Returns null if booking has no expiration or is already expired
   */
  getTimeUntilExpiration(booking: Booking): number | null {
    if (!booking.expires_at || booking.status !== 'pending') {
      return null;
    }

    const expiresAt = new Date(booking.expires_at).getTime();
    const now = Date.now();
    const remaining = expiresAt - now;

    return remaining > 0 ? remaining : 0;
  }

  /**
   * Format time remaining as human-readable string
   */
  formatTimeRemaining(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Check if booking is expired
   */
  isExpired(booking: Booking): boolean {
    if (!booking.expires_at) return false;
    return new Date(booking.expires_at).getTime() < Date.now();
  }

  private extractBookingId(response: unknown): string | null {
    if (!response || typeof response !== 'object') {
      return null;
    }

    const maybeBooking = response as Partial<Booking>;
    if (typeof maybeBooking.id === 'string' && maybeBooking.id.length > 0) {
      return maybeBooking.id;
    }

    const withBookingId = response as { booking_id?: unknown; bookingId?: unknown };
    if (typeof withBookingId.booking_id === 'string' && withBookingId.booking_id.length > 0) {
      return withBookingId.booking_id;
    }

    if (typeof withBookingId.bookingId === 'string' && withBookingId.bookingId.length > 0) {
      return withBookingId.bookingId;
    }

    return null;
  }

  /**
   * ✅ SPRINT 2 FIX: Crear reserva con validación de disponibilidad
   * Este método valida ANTES de crear la reserva
   *
   * @param carId - ID del auto a reservar
   * @param startDate - Fecha inicio (ISO string)
   * @param endDate - Fecha fin (ISO string)
   * @returns Promise con resultado de la operación
   *
   * @example
   * const result = await bookingService.createBookingWithValidation(
   *   'uuid-del-auto',
   *   '2025-11-01T00:00:00Z',
   *   '2025-11-05T00:00:00Z'
   * );
   *
   * if (!result.success) {
   *   alert(result.error); // "Auto no disponible para esas fechas"
   * }
   */
  async createBookingWithValidation(
    carId: string,
    startDate: string,
    endDate: string,
  ): Promise<{
    success: boolean;
    booking?: Booking;
    error?: string;
    canWaitlist?: boolean; // Indica si el usuario puede agregarse a waitlist
  }> {
    try {
      // 1. Validar que las fechas sean correctas
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        return {
          success: false,
          error: 'La fecha de inicio debe ser anterior a la fecha de fin',
        };
      }

      if (start < new Date()) {
        return {
          success: false,
          error: 'La fecha de inicio no puede ser en el pasado',
        };
      }

      // 2. Intentar crear la reserva directamente
      // Esto permite capturar el error de constraint si hay un booking pending
      // La validación de disponibilidad se hace dentro de request_booking
      // Si falla, verificamos si es por un booking pending y activamos waitlist
      const booking = await this.requestBooking(carId, startDate, endDate);

      return {
        success: true,
        booking: booking,
      };
    } catch (error: unknown) {
      // Use ErrorHandlerService for consistent error handling
      this.errorHandler.handleBookingError(error, 'Create booking with validation', false); // Don't show toast, return error message instead

      // Extraer mensaje de error de forma más robusta
      let errorMessage = 'Error al crear la reserva';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }

      // Mapear mensajes de error de Supabase a mensajes más amigables
      const errorLower = errorMessage.toLowerCase();
      let canWaitlist = false;

      // Verificar si el error tiene la propiedad canWaitlist (pasado desde requestBooking)
      if (error && typeof error === 'object' && 'canWaitlist' in error) {
        canWaitlist = Boolean((error as any).canWaitlist);
      }

      // Detectar errores que deben activar waitlist
      // El mensaje de request_booking cuando hay overlap es: "Auto no disponible en esas fechas"
      // También puede llegar como: "no disponible en esas fechas" o "auto no disponible"
      const isUnavailableError =
        errorLower.includes('conflicting key') ||
        errorLower.includes('exclusion constraint') ||
        errorLower.includes('bookings_no_overlap') ||
        errorLower.includes('no disponible en esas fechas') ||
        errorLower.includes('auto no disponible en esas fechas') ||
        errorLower.includes('auto no disponible');

      if (isUnavailableError) {
        errorMessage =
          'El auto no está disponible para esas fechas. Otro usuario ya tiene una reserva en esas fechas.';
        canWaitlist = true; // Permitir waitlist cuando hay conflicto de constraint o booking pending

        // Log para debugging
        this.logger.warn(
          'Waitlist activated due to unavailable error: ' +
            JSON.stringify({
              originalError: errorMessage,
              errorLower,
              carId,
              startDate,
              endDate,
            }),
        );
      } else if (errorLower.includes('no disponible') || errorLower.includes('not available')) {
        // Verificar si hay bookings pending que puedan causar el conflicto
        // Esto nos permite activar waitlist incluso si el mensaje genérico no lo indica
        try {
          // Verificar si hay bookings pending que se solapen con las fechas
          const { data: pendingBookings } = await this.supabase
            .from('bookings')
            .select('id')
            .eq('car_id', carId)
            .eq('status', 'pending')
            .lte('start_at', endDate) // start_at <= endDate (overlap condition 1)
            .gte('end_at', startDate); // end_at >= startDate (overlap condition 2)

          // Si hay bookings pending, activar waitlist
          if (pendingBookings && pendingBookings.length > 0) {
            errorMessage =
              'El auto no está disponible para esas fechas. Otro usuario ya tiene una reserva en esas fechas.';
            canWaitlist = true;
          } else {
            errorMessage =
              'El auto no está disponible para esas fechas. Por favor elige otras fechas.';
          }
        } catch {
          // Si falla la verificación, no activar waitlist
          errorMessage =
            'El auto no está disponible para esas fechas. Por favor elige otras fechas.';
        }
      } else if (
        errorLower.includes('no autenticado') ||
        errorLower.includes('not authenticated')
      ) {
        errorMessage = 'Debes iniciar sesión para crear una reserva.';
      } else if (errorLower.includes('propio auto') || errorLower.includes('own car')) {
        errorMessage = 'No puedes reservar tu propio auto.';
      } else if (errorLower.includes('pasado') || errorLower.includes('past')) {
        errorMessage = 'No puedes reservar en el pasado. Por favor elige fechas futuras.';
      } else if (errorLower.includes('fecha') || errorLower.includes('date')) {
        errorMessage = 'Las fechas seleccionadas no son válidas. Por favor verifica.';
      }

      return {
        success: false,
        error: errorMessage,
        canWaitlist,
      };
    }
  }

  /**
   * ✅ SPRINT 3: Cancelar una reserva
   *
   * Valida que la reserva:
   * - Pertenezca al usuario actual
   * - Esté en estado 'confirmed' o 'pending'
   * - Tenga al menos 24h antes del inicio (opcional, configurable)
   *
   * @param bookingId - ID de la reserva a cancelar
   * @param force - Forzar cancelación sin validar tiempo (admin use)
   * @returns Promise con resultado de la operación
   */
  async cancelBooking(
    bookingId: string,
    force = false,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Obtener la reserva
      const booking = await this.getBookingById(bookingId);
      if (!booking) {
        return {
          success: false,
          error: 'Reserva no encontrada',
        };
      }

      // 2. Validar estado
      const validStatuses = ['confirmed', 'pending'];
      if (!validStatuses.includes(booking.status)) {
        return {
          success: false,
          error: `No se puede cancelar una reserva en estado "${booking.status}"`,
        };
      }

      // 3. Validar tiempo (24h antes)
      if (!force) {
        const startDate = new Date(booking.start_at);
        const now = new Date();
        const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilStart < 24) {
          return {
            success: false,
            error: 'Solo puedes cancelar con al menos 24 horas de anticipación',
          };
        }
      }

      // 4. Actualizar estado a 'cancelled'
      const { error } = await this.supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) {
        return {
          success: false,
          error: 'Error al cancelar la reserva. Intenta de nuevo.',
        };
      }

      // 5. Procesar reembolso automático si el booking estaba pagado
      const metadata =
        booking && typeof booking === 'object'
          ? (booking as { metadata?: Record<string, unknown> }).metadata
          : undefined;
      const mercadopagoPaymentId =
        metadata && typeof metadata === 'object'
          ? (metadata as Record<string, unknown>).mercadopago_payment_id
          : undefined;

      if (booking.status === 'confirmed' && typeof mercadopagoPaymentId === 'string') {
        try {
          // Calcular penalización según política de cancelación
          const startDate = new Date(booking.start_at);
          const now = new Date();
          const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);

          let refundType: 'full' | 'partial' = 'full';
          let refundAmount: number | undefined;

          // Calcular penalización (si aplica)
          if (hoursUntilStart < 24) {
            // Penalización del 25% si se cancela con menos de 24h
            const cancellationFee = parseFloat(booking.total_amount?.toString() || '0') * 0.25;
            refundAmount = parseFloat(booking.total_amount?.toString() || '0') - cancellationFee;
            refundType = 'partial';
          } else if (hoursUntilStart < 48) {
            // Penalización del 10% si se cancela con menos de 48h
            const cancellationFee = parseFloat(booking.total_amount?.toString() || '0') * 0.1;
            refundAmount = parseFloat(booking.total_amount?.toString() || '0') - cancellationFee;
            refundType = 'partial';
          }
          // Si es más de 48h, reembolso completo (refundType = 'full')

          // Obtener token de autenticación
          const {
            data: { session },
          } = await this.supabase.auth.getSession();
          if (!session?.access_token) {
            console.warn('No se pudo obtener token para procesar reembolso');
          } else {
            // Llamar a Edge Function de reembolsos
            const refundResponse = await fetch(
              `${environment.supabaseUrl}/functions/v1/mercadopago-process-refund`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  booking_id: bookingId,
                  refund_type: refundType,
                  ...(refundType === 'partial' && refundAmount && { amount: refundAmount }),
                  ...(mercadopagoPaymentId && { mercadopago_payment_id: mercadopagoPaymentId }),
                  reason: 'Cancelación de reserva',
                }),
              },
            );

            if (!refundResponse.ok) {
              const errorData = await refundResponse.json().catch(() => ({}));
              console.error('Error procesando reembolso:', errorData);
              // No fallar la cancelación, solo loggear el error
            } else {
              const refundData = await refundResponse.json();
              this.logger.info('Reembolso procesado exitosamente', refundData);
            }
          }
        } catch (refundError) {
          console.error('Error llamando refund API:', refundError);
          // No fallar la cancelación si el reembolso falla
          // El usuario puede procesarlo manualmente después
        }
      }

      // NOTA: Liberación de wallet lock y notificaciones
      // se manejan automáticamente vía triggers y funciones RPC en la base de datos

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error inesperado al cancelar';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * ✅ SPRINT 3: Obtener información de contacto del propietario
   *
   * @param ownerId - ID del propietario
   * @returns Promise con datos de contacto (email, teléfono si disponible)
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

  /**
   * ✅ INSURANCE: Activar cobertura con add-ons específicos
   * Wrapper para activar seguro con add-ons desde checkout
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
   * ✅ INSURANCE: Obtener resumen de seguro de una reserva
   */
  async getBookingInsuranceSummary(bookingId: string) {
    return this.insuranceService.getInsuranceSummary(bookingId);
  }

  /**
   * ✅ INSURANCE: Calcular depósito de seguridad para un auto
   */
  async calculateInsuranceDeposit(carId: string): Promise<number> {
    return this.insuranceService.calculateSecurityDeposit(carId);
  }

  /**
   * ✅ INSURANCE: Verificar si el auto tiene seguro propio (BYOI)
   */
  async hasOwnerInsurance(carId: string): Promise<boolean> {
    return this.insuranceService.hasOwnerInsurance(carId);
  }

  /**
   * ✅ INSURANCE: Obtener comisión aplicable según tipo de seguro
   * 25% para seguro flotante, 15% para seguro propio
   */
  async getInsuranceCommissionRate(carId: string): Promise<number> {
    return this.insuranceService.getCommissionRate(carId);
  }

  /**
   * ✅ FIX CRÍTICO: Crear booking de forma atómica
   * Soluciona el problema de "reservas fantasma" usando una transacción única
   *
   * @param params - Parámetros completos del booking
   * @returns Promise con resultado de la operación atómica
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

      // Llamar a la función RPC atómica
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
        // Risk snapshot
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

      // La función RPC retorna un array con un objeto
      const result = Array.isArray(data) ? data[0] : data;

      if (!result || !result.success) {
        return {
          success: false,
          error: result?.error_message || 'Error desconocido al crear la reserva',
        };
      }

      // Activar cobertura de seguro automáticamente
      try {
        await this.insuranceService.activateCoverage({
          booking_id: result.booking_id,
          addon_ids: [], // Los add-ons se agregan en checkout si es necesario
        });
      } catch (_insuranceError) {
        // No bloqueamos la reserva si falla el seguro
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
  // BONUS-MALUS SYSTEM: DRIVER CLASS UPDATES
  // ============================================================================

  /**
   * Complete booking without damages (clean booking)
   * This will:
   * 1. Release security deposit
   * 2. Update driver class (improve for clean booking)
   */
  async completeBookingClean(bookingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const booking = await this.getBookingById(bookingId);
      if (!booking) {
        return { success: false, error: 'Booking not found' };
      }

      // 1. Release security deposit if locked
      if (booking.wallet_status === 'locked') {
        await this.releaseSecurityDeposit(bookingId, 'Reserva completada sin daños');
      }

      // 2. Mark booking as completed
      await this.updateBooking(bookingId, {
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
          this.logger.info(`Driver class updated for clean booking ${bookingId}`);
        } catch (classError) {
          // Don't fail the booking completion if class update fails
          this.logger.error(
            'Failed to update driver class',
            'BookingsService',
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
    bookingId: string,
    damageAmountCents: number,
    damageDescription: string,
    claimSeverity: number = 1, // 1=minor, 2=moderate, 3=major
  ): Promise<{ success: boolean; remaining_deposit?: number; error?: string }> {
    try {
      const booking = await this.getBookingById(bookingId);
      if (!booking) {
        return { success: false, error: 'Booking not found' };
      }

      // 1. Deduct from security deposit
      const deductResult = await this.deductFromSecurityDeposit(
        bookingId,
        damageAmountCents,
        damageDescription,
      );

      if (!deductResult.ok) {
        return {
          success: false,
          error: deductResult.error,
        };
      }

      // 2. Mark booking as completed
      await this.updateBooking(bookingId, {
        status: 'completed',
      });

      // 3. Update driver class (claim worsens class)
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
          this.logger.info(`Driver class updated for claim on booking ${bookingId}`);
        } catch (classError) {
          // Don't fail the booking completion if class update fails
          this.logger.error(
            'Failed to update driver class',
            'BookingsService',
            classError instanceof Error ? classError : new Error(getErrorMessage(classError)),
          );
        }
      }

      return {
        success: true,
        remaining_deposit: deductResult.remaining_deposit,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error completing booking with damages',
      };
    }
  }

  // ============================================================================
  // SISTEMA DE APROBACIÓN MANUAL DE RESERVAS
  // ============================================================================

  /**
   * Obtiene las reservas pendientes de aprobación del locador
   */
  async getPendingApprovals(): Promise<Record<string, unknown>[]> {
    const { data, error } = await this.supabase.from('owner_pending_approvals').select('*');

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Aprueba una reserva pendiente
   */
  async approveBooking(
    bookingId: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('approve_booking', {
        p_booking_id: bookingId,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // data es JSON con {success, message, booking_id, etc}
      if (data && typeof data === 'object') {
        if (data.success === false) {
          return {
            success: false,
            error: data.error || data.message,
          };
        }

        return {
          success: true,
          message: data.message || 'Reserva aprobada exitosamente',
        };
      }

      return {
        success: true,
        message: 'Reserva aprobada exitosamente',
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error inesperado al aprobar reserva',
      };
    }
  }

  /**
   * Rechaza una reserva pendiente
   */
  async rejectBooking(
    bookingId: string,
    reason: string = 'No especificado',
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('reject_booking', {
        p_booking_id: bookingId,
        p_rejection_reason: reason,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // data es JSON con {success, message, booking_id, etc}
      if (data && typeof data === 'object') {
        if (data.success === false) {
          return {
            success: false,
            error: data.error || data.message,
          };
        }

        return {
          success: true,
          message: data.message || 'Reserva rechazada exitosamente',
        };
      }

      return {
        success: true,
        message: 'Reserva rechazada exitosamente',
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error inesperado al rechazar reserva',
      };
    }
  }

  /**
   * Verifica si un auto requiere aprobación manual
   */
  async carRequiresApproval(carId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('cars')
      .select('instant_booking, require_approval')
      .eq('id', carId)
      .single();

    if (error || !data) {
      return false;
    }

    // Si require_approval es true O instant_booking es false, requiere aprobación
    return data.require_approval === true || data.instant_booking === false;
  }
}
