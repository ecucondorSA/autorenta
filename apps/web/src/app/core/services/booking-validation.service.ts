import { Injectable, inject } from '@angular/core';
import { Booking } from '../models';
import { injectSupabase } from './supabase-client.service';
import { ErrorHandlerService } from './error-handler.service';
import { LoggerService } from './logger.service';

/**
 * Service for booking validation
 * Handles date validation, availability checking, and error message mapping
 */
@Injectable({
  providedIn: 'root',
})
export class BookingValidationService {
  private readonly supabase = injectSupabase();
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly logger = inject(LoggerService);

  /**
   * ✅ SPRINT 2 FIX: Create booking with availability validation
   * This method validates BEFORE creating the booking
   *
   * @param carId - ID del auto a reservar
   * @param startDate - Fecha inicio (ISO string)
   * @param endDate - Fecha fin (ISO string)
   * @param onRequestBooking - Callback to request booking
   * @returns Promise with operation result
   */
  async createBookingWithValidation(
    carId: string,
    startDate: string,
    endDate: string,
    onRequestBooking: (carId: string, startDate: string, endDate: string) => Promise<Booking>,
  ): Promise<{
    success: boolean;
    booking?: Booking;
    error?: string;
    canWaitlist?: boolean;
  }> {
    try {
      // 1. Validate dates
      const dateValidation = this.validateDates(startDate, endDate);
      if (!dateValidation.valid) {
        return {
          success: false,
          error: dateValidation.error,
        };
      }

      // 2. Attempt to create the booking
      // This allows capturing the constraint error if there's a pending booking
      // Availability validation is done inside request_booking
      // If it fails, we check if it's due to a pending booking and activate waitlist
      const booking = await onRequestBooking(carId, startDate, endDate);

      return {
        success: true,
        booking: booking,
      };
    } catch (error: unknown) {
      // Use ErrorHandlerService for consistent error handling
      this.errorHandler.handleBookingError(error, 'Create booking with validation', false);

      // Extract error message more robustly
      let errorMessage = 'Error al crear la reserva';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }

      // Map Supabase error messages to friendlier messages
      const errorLower = errorMessage.toLowerCase();
      let canWaitlist = false;

      // Check if error has canWaitlist property (passed from requestBooking)
      if (error && typeof error === 'object' && 'canWaitlist' in error) {
        canWaitlist = Boolean((error as unknown as { canWaitlist?: boolean }).canWaitlist);
      }

      // Detect errors that should activate waitlist
      const isUnavailableError =
        errorLower.includes('conflicting key') ||
        errorLower.includes('exclusion constraint') ||
        errorLower.includes('bookings_no_overlap') ||
        errorLower.includes('no disponible en esas fechas') ||
        errorLower.includes('auto no disponible en esas fechas') ||
        errorLower.includes('auto no disponible');

      if (isUnavailableError) {
        // ✅ FIX 2025-11-06: Distinguir entre reserva pendiente y confirmada
        const hasPendingBookings = await this.checkPendingBookings(carId, startDate, endDate);

        if (hasPendingBookings) {
          errorMessage =
            'El auto está reservado temporalmente (pendiente de pago). Intenta con otras fechas o únete a la lista de espera.';
        } else {
          errorMessage =
            'El auto no está disponible para esas fechas. Hay una reserva confirmada en ese período.';
        }

        canWaitlist = true;

        // Log for debugging
        this.logger.warn(
          'Waitlist activated due to unavailable error: ' +
            JSON.stringify({
              originalError: errorMessage,
              errorLower,
              hasPendingBookings,
              carId,
              startDate,
              endDate,
            }),
        );
      } else if (errorLower.includes('no disponible') || errorLower.includes('not available')) {
        // Check if there are pending bookings that could cause the conflict
        const hasPendingBookings = await this.checkPendingBookings(carId, startDate, endDate);

        if (hasPendingBookings) {
          errorMessage =
            'El auto está reservado temporalmente (pendiente de pago). Intenta con otras fechas o únete a la lista de espera.';
          canWaitlist = true;
        } else {
          errorMessage =
            'El auto no está disponible para esas fechas. Por favor elige otras fechas.';
        }
      } else {
        // Map other common errors
        errorMessage = this.mapErrorMessage(errorLower);
      }

      return {
        success: false,
        error: errorMessage,
        canWaitlist,
      };
    }
  }

  /**
   * Validate booking dates
   */
  private validateDates(startDate: string, endDate: string): { valid: boolean; error?: string } {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return {
        valid: false,
        error: 'La fecha de inicio debe ser anterior a la fecha de fin',
      };
    }

    if (start < new Date()) {
      return {
        valid: false,
        error: 'La fecha de inicio no puede ser en el pasado',
      };
    }

    return { valid: true };
  }

  /**
   * Check if there are pending bookings that overlap with the requested dates
   * ✅ FIX 2025-11-06: Corregida lógica de overlap (lt/gt en lugar de lte/gte)
   * ✅ FIX 2025-11-06: Incluir 'pending_payment' en estados a verificar
   */
  private async checkPendingBookings(
    carId: string,
    startDate: string,
    endDate: string,
  ): Promise<boolean> {
    try {
      const { data: pendingBookings } = await this.supabase
        .from('bookings')
        .select('id, status')
        .eq('car_id', carId)
        .in('status', ['pending', 'pending_payment'])
        .lt('start_at', endDate) // ✅ FIX: start_at < endDate (overlap correcto)
        .gt('end_at', startDate); // ✅ FIX: end_at > startDate (overlap correcto)

      return pendingBookings ? pendingBookings.length > 0 : false;
    } catch {
      return false;
    }
  }

  /**
   * Map error messages to user-friendly messages
   */
  private mapErrorMessage(errorLower: string): string {
    if (errorLower.includes('no autenticado') || errorLower.includes('not authenticated')) {
      return 'Debes iniciar sesión para crear una reserva.';
    }

    if (errorLower.includes('propio auto') || errorLower.includes('own car')) {
      return 'No puedes reservar tu propio auto.';
    }

    if (errorLower.includes('pasado') || errorLower.includes('past')) {
      return 'No puedes reservar en el pasado. Por favor elige fechas futuras.';
    }

    if (errorLower.includes('fecha') || errorLower.includes('date')) {
      return 'Las fechas seleccionadas no son válidas. Por favor verifica.';
    }

    return 'Error al crear la reserva';
  }

  /**
   * Validate cancellation timing
   * Returns true if cancellation is allowed (at least 24h before start)
   */
  validateCancellationTiming(
    booking: Booking,
    force: boolean = false,
  ): {
    allowed: boolean;
    error?: string;
  } {
    if (force) {
      return { allowed: true };
    }

    const startDate = new Date(booking.start_at);
    const now = new Date();
    const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilStart < 24) {
      return {
        allowed: false,
        error: 'Solo puedes cancelar con al menos 24 horas de anticipación',
      };
    }

    return { allowed: true };
  }

  /**
   * Validate booking status for cancellation
   */
  validateCancellationStatus(booking: Booking): {
    allowed: boolean;
    error?: string;
  } {
    const validStatuses = ['confirmed', 'pending'];
    if (!validStatuses.includes(booking.status)) {
      return {
        allowed: false,
        error: `No se puede cancelar una reserva en estado "${booking.status}"`,
      };
    }

    return { allowed: true };
  }
}
