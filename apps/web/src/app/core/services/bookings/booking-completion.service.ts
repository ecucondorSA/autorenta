import { Injectable, inject } from '@angular/core';
import { firstValueFrom, from } from 'rxjs';
import { ignoreElements } from 'rxjs/operators';
import { Booking } from '../models';
import { getErrorMessage } from '../utils/type-guards';
import { BookingWalletService } from './booking-wallet.service';
import { DriverProfileService } from '@core/services/auth/driver-profile.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { PaymentsService } from '@core/services/payments/payments.service'; // NUEVO: Importar PaymentsService

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
  private readonly paymentsService = inject(PaymentsService); // NUEVO: Inyectar PaymentsService

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
      // 1. Liberar depósito de seguridad (Wallet o MP Pre-Auth)
      if (booking.payment_method === 'credit_card' && booking.mp_security_deposit_order_id) {
        // Liberar pre-autorización de MercadoPago
        await this.paymentsService.releaseMpPreAuth(
          booking.mp_security_deposit_order_id,
          'Garantía liberada: Reserva completada sin daños',
        );
        await onUpdateBooking(booking.id, {
          deposit_status: 'released',
        });
      } else if (booking.wallet_status === 'locked') {
        // Liberar fondos de Wallet
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

      // 2. Marcar reserva como completada
      await onUpdateBooking(booking.id, {
        status: 'completed',
      });

      // 3. Actualizar clase del conductor (mejora por reserva limpia)
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
          // No fallar la finalización si la actualización de clase falla
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
        error: err instanceof Error ? err.message : 'Error al completar reserva sin daños',
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
    totalChargesCents: number, // Ahora representa cargos totales (daños + combustible + multas)
    description: string, // Descripción consolidada de los cargos
    claimSeverity: number = 0, // 1=minor, 2=moderate, 3=major (0 si solo combustible/multa)
    onUpdateBooking: (bookingId: string, updates: Partial<Booking>) => Promise<Booking>,
  ): Promise<{ success: boolean; remaining_deposit?: number; error?: string }> {
    try {
      let remainingDepositCents: number | undefined;

      // 1. Deducir de la garantía (MP Pre-Auth o Wallet)
      if (booking.payment_method === 'credit_card' && booking.mp_security_deposit_order_id) {
        // Capturar monto de la pre-autorización de MercadoPago
        await this.paymentsService.captureMpPreAuth(
          booking.mp_security_deposit_order_id,
          totalChargesCents,
          description,
        );
        // Suponemos que MP libera el resto automáticamente si la captura es parcial
        remainingDepositCents = 0; // O la diferencia si se puede obtener de MP
        await onUpdateBooking(booking.id, {
          deposit_status: 'charged', // Marcar como cargado
        });
      } else if (booking.wallet_status === 'locked') {
        // Deducir de Wallet
        const deductResult = await this.bookingWalletService.deductFromSecurityDeposit(
          booking,
          totalChargesCents,
          description,
        );

        if (!deductResult.ok) {
          return {
            success: false,
            error: deductResult.error,
          };
        }
        remainingDepositCents = deductResult.remaining_deposit ?? 0;
        await onUpdateBooking(booking.id, {
          wallet_status: remainingDepositCents > 0 ? 'partially_charged' : 'charged',
        });
      } else {
        return { success: false, error: 'Método de depósito no soportado o no bloqueado' };
      }

      // 2. Marcar reserva como completada
      await onUpdateBooking(booking.id, {
        status: 'completed',
      });

      // 3. Actualizar clase del conductor (si hubo daños)
      if (booking.user_id && claimSeverity > 0) {
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
          // No fallar la finalización si la actualización de clase falla
          this.logger.error(
            'Failed to update driver class',
            'BookingCompletionService',
            classError instanceof Error ? classError : new Error(getErrorMessage(classError)),
          );
        }
      }

      return {
        success: true,
        remaining_deposit: remainingDepositCents,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error al completar reserva con cargos',
      };
    }
  }

  /**
   * Check-out Inteligente (Smart Checkout)
   * Procesa el cierre de reserva considerando:
   * - Diferencia de combustible
   * - Daños reportados
   * - Multas tardías (TODO: mecanismo de retención parcial)
   */
  async finishBookingWithInspection(
    booking: Booking,
    inspectionData: {
      fuelDifferenceCents: number;
      damageAmountCents: number;
      damageDescription?: string;
      lateFeesCents?: number;
    },
    onUpdateBooking: (bookingId: string, updates: Partial<Booking>) => Promise<Booking>,
  ): Promise<{ success: boolean; remaining_deposit?: number; error?: string }> {
    const totalCharges =
      (inspectionData.fuelDifferenceCents || 0) +
      (inspectionData.damageAmountCents || 0) +
      (inspectionData.lateFeesCents || 0);

    // Caso 1: Cierre limpio (sin cargos extra)
    if (totalCharges === 0) {
      return this.completeBookingClean(booking, onUpdateBooking);
    }

    // Caso 2: Con cargos - Marcar como pendiente de resolución de disputa
    const descriptionParts = [];
    if (inspectionData.fuelDifferenceCents > 0) {
      descriptionParts.push(
        `Combustible: $${(inspectionData.fuelDifferenceCents / 100).toFixed(2)}`,
      );
    }
    if (inspectionData.damageAmountCents > 0) {
      descriptionParts.push(`Daños: $${(inspectionData.damageAmountCents / 100).toFixed(2)}`);
    }
    if (inspectionData.lateFeesCents && inspectionData.lateFeesCents > 0) {
      descriptionParts.push(`Recargos: $${(inspectionData.lateFeesCents / 100).toFixed(2)}`);
    }

    const description = `Cargos al cierre: ${descriptionParts.join(', ')}`;

    // Actualizar la reserva para reflejar los cargos pendientes de disputa
    await onUpdateBooking(booking.id, {
      status: 'pending_dispute_resolution', // Nuevo estado
      dispute_open_at: new Date().toISOString(),
      owner_damage_amount: inspectionData.damageAmountCents,
      owner_damage_description: inspectionData.damageDescription,
      // Almacenar otros cargos en metadata si no hay columnas dedicadas
      metadata: {
        ...(booking.metadata || {}),
        pending_fuel_charge: inspectionData.fuelDifferenceCents,
        pending_late_fee_charge: inspectionData.lateFeesCents,
        total_pending_charges_cents: totalCharges,
      },
      // La deducción/captura real se hará después de la resolución de la disputa
    });

    this.logger.info(
      `Booking ${booking.id} marked as pending_dispute_resolution with charges.`,
      'BookingCompletionService',
      {
        totalCharges,
        description,
      },
    );

    return {
      success: true,
      error: 'Cargos reportados. Pendiente de resolución de disputa.',
      remaining_deposit: booking.deposit_amount_cents || 0, // El depósito sigue retenido
    };
  }
}
