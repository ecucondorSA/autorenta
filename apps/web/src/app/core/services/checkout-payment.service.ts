import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { BookingsService } from './bookings.service';
import { PaymentsService } from './payments.service';
import { MercadoPagoBookingGatewayService } from './mercadopago-booking-gateway.service';
import { RiskCalculatorService, PaymentMethodType } from './risk-calculator.service';
import { SupabaseClientService } from './supabase-client.service';

/**
 * Resultado de procesamiento de pago
 */
export interface PaymentResult {
  success: boolean;
  bookingId: string;
  paymentIntentId?: string;
  mercadoPagoInitPoint?: string;
  message: string;
  error?: string;
}

/**
 * Estado de transacción de pago (para rollback)
 */
interface PaymentTransaction {
  fundsLocked: boolean;
  lockedAmountCents: number;
  bookingUpdated: boolean;
  intentCreated: boolean;
  intentId?: string;
}

/**
 * Servicio de Procesamiento de Pagos en Checkout (Argentina)
 *
 * Orquesta los tres flujos de pago:
 * 1. **Wallet completo**: Bloquea fondos totales + crédito seguridad
 * 2. **Tarjeta de crédito**: Crea hold en MercadoPago
 * 3. **Parcial (wallet + tarjeta)**: Bloquea 30% en wallet + hold resto
 *
 * Características:
 * - Manejo transaccional con rollback automático
 * - Reversión de locks en caso de error
 * - Validaciones de balance y permisos
 * - Logging detallado de errores
 * - Type-safe con interfaces TypeScript
 */
@Injectable({
  providedIn: 'root',
})
export class CheckoutPaymentService {
  private readonly bookingsService = inject(BookingsService);
  private readonly paymentsService = inject(PaymentsService);
  private readonly mpGateway = inject(MercadoPagoBookingGatewayService);
  private readonly riskCalculator = inject(RiskCalculatorService);
  private readonly supabaseService = inject(SupabaseClientService);

  /**
   * Procesa un pago completo con wallet
   *
   * Flujo:
   * 1. Validar balance suficiente
   * 2. Bloquear fondos (total + crédito seguridad si aplica)
   * 3. Actualizar booking a 'confirmed'
   * 4. Crear payment intent
   * 5. Si falla algún paso, revertir cambios
   */
  processWalletPayment(
    bookingId: string,
    totalCents: number,
    securityCreditCents: number
  ): Observable<PaymentResult> {
    const transaction: PaymentTransaction = {
      fundsLocked: false,
      lockedAmountCents: 0,
      bookingUpdated: false,
      intentCreated: false,
    };

    const totalRequired = totalCents + securityCreditCents;

    return from(this.getWalletBalance()).pipe(
      // Paso 1: Validar balance
      switchMap(balance => {
        if (balance < totalRequired) {
          return throwError(
            () =>
              new Error(
                `Balance insuficiente. Requerido: $${(totalRequired / 100).toFixed(2)}, Disponible: $${(balance / 100).toFixed(2)}`
              )
          );
        }
        return of(balance);
      }),

      // Paso 2: Bloquear fondos
      switchMap(() => from(this.lockWalletFunds(bookingId, totalRequired))),
      tap(() => {
        transaction.fundsLocked = true;
        transaction.lockedAmountCents = totalRequired;
      }),

      // Paso 3: Actualizar booking
      switchMap(() =>
        this.bookingsService.updateBooking(bookingId, {
          status: 'confirmed',
          payment_method: 'wallet',
        })
      ),
      tap(() => {
        transaction.bookingUpdated = true;
      }),

      // Paso 4: Crear payment intent
      switchMap(() =>
        from(this.paymentsService.createPaymentIntentWithDetails({
          booking_id: bookingId,
          payment_method: 'wallet',
          amount_cents: totalRequired,
          status: 'succeeded',
        }))
      ),
      tap(intent => {
        transaction.intentCreated = true;
        transaction.intentId = intent.id;
      }),

      // Éxito
      map(() => ({
        success: true,
        bookingId,
        message: 'Pago procesado exitosamente con wallet',
      })),

      // Manejo de errores con rollback
      catchError(err => {
        console.error('Error in wallet payment, rolling back:', err);
        return from(this.rollbackTransaction(bookingId, transaction)).pipe(
          switchMap(() =>
            throwError(
              () =>
                new Error(
                  `Error al procesar el pago: ${err.message}. Se han revertido los cambios.`
                )
            )
          )
        );
      })
    );
  }

  /**
   * Procesa un pago con tarjeta de crédito
   *
   * Flujo:
   * 1. Actualizar booking a 'pending_payment'
   * 2. Crear preferencia en MercadoPago (con hold)
   * 3. Retornar init_point para redirección
   * 4. Si falla, revertir booking a 'pending'
   */
  processCreditCardPayment(bookingId: string, totalCents: number): Observable<PaymentResult> {
    const transaction: PaymentTransaction = {
      fundsLocked: false,
      lockedAmountCents: 0,
      bookingUpdated: false,
      intentCreated: false,
    };

    return from(this.bookingsService
      .updateBooking(bookingId, {
        status: 'pending_payment',
        payment_method: 'credit_card',
      }))
      .pipe(
        tap(() => {
          transaction.bookingUpdated = true;
        }),

        // Crear preferencia en MercadoPago
        switchMap(() => this.mpGateway.createBookingPreference(bookingId)),

        // Éxito
        map((preference: { init_point: string }) => ({
          success: true,
          bookingId,
          mercadoPagoInitPoint: preference.init_point,
          message: 'Preferencia creada. Redirigiendo a MercadoPago...',
        })),

        // Manejo de errores
        catchError(err => {
          console.error('Error in credit card payment, rolling back:', err);
          return from(this.rollbackTransaction(bookingId, transaction)).pipe(
            switchMap(() => throwError(() => new Error(err.message || 'Error al procesar el pago')))
          );
        })
      );
  }

  /**
   * Procesa un pago parcial (wallet + tarjeta)
   *
   * Flujo:
   * 1. Validar balance suficiente para 30%
   * 2. Bloquear fondos parciales
   * 3. Actualizar booking a 'pending_payment'
   * 4. Crear preferencia en MercadoPago para el 70% restante
   * 5. Si falla, revertir locks y booking
   */
  processPartialWalletPayment(
    bookingId: string,
    totalCents: number,
    securityCreditCents: number
  ): Observable<PaymentResult> {
    const transaction: PaymentTransaction = {
      fundsLocked: false,
      lockedAmountCents: 0,
      bookingUpdated: false,
      intentCreated: false,
    };

    const partialCents = Math.round(totalCents * 0.3);
    const totalRequired = partialCents + securityCreditCents;

    return from(this.getWalletBalance()).pipe(
      // Paso 1: Validar balance
      switchMap(balance => {
        if (balance < totalRequired) {
          return throwError(
            () =>
              new Error(
                `Balance insuficiente para pago parcial. Requerido: $${(totalRequired / 100).toFixed(2)}`
              )
          );
        }
        return of(balance);
      }),

      // Paso 2: Bloquear fondos parciales
      switchMap(() => from(this.lockWalletFunds(bookingId, totalRequired))),
      tap(() => {
        transaction.fundsLocked = true;
        transaction.lockedAmountCents = totalRequired;
      }),

      // Paso 3: Actualizar booking
      switchMap(() =>
        this.bookingsService.updateBooking(bookingId, {
          status: 'pending_payment',
          payment_method: 'partial_wallet',
        })
      ),
      tap(() => {
        transaction.bookingUpdated = true;
      }),

      // Paso 4: Crear preferencia para el resto
      switchMap(() => this.mpGateway.createBookingPreference(bookingId)),

      // Éxito
      map((preference: { init_point: string }) => ({
        success: true,
        bookingId,
        mercadoPagoInitPoint: preference.init_point,
        message: 'Pago parcial procesado. Redirigiendo a MercadoPago para el resto...',
      })),

      // Manejo de errores
      catchError(err => {
        console.error('Error in partial wallet payment, rolling back:', err);
        return from(this.rollbackTransaction(bookingId, transaction)).pipe(
          switchMap(() => throwError(() => new Error(err.message || 'Error al procesar el pago')))
        );
      })
    );
  }

  /**
   * Obtiene el balance actual del wallet
   */
  private async getWalletBalance(): Promise<number> {
    const supabase = this.supabaseService.getClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase.rpc('wallet_get_balance', {
      p_user_id: user.id,
    });

    if (error) throw error;

    return data?.balance_cents ?? 0;
  }

  /**
   * Bloquea fondos en el wallet
   */
  private async lockWalletFunds(bookingId: string, amountCents: number): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase.rpc('wallet_lock_funds', {
      p_user_id: user.id,
      p_booking_id: bookingId,
      p_amount_cents: amountCents,
    });

    if (error) throw error;
  }

  /**
   * Desbloquea fondos en el wallet (rollback)
   */
  private async unlockWalletFunds(bookingId: string, amountCents: number): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.rpc('wallet_unlock_funds', {
      p_user_id: user.id,
      p_booking_id: bookingId,
      p_amount_cents: amountCents,
    });

    if (error) {
      console.error('Failed to unlock funds during rollback:', error);
    }
  }

  /**
   * Revierte una transacción fallida
   */
  private async rollbackTransaction(
    bookingId: string,
    transaction: PaymentTransaction
  ): Promise<void> {
    console.log('🔄 Rolling back transaction:', transaction);

    // Desbloquear fondos si fueron bloqueados
    if (transaction.fundsLocked && transaction.lockedAmountCents > 0) {
      try {
        await this.unlockWalletFunds(bookingId, transaction.lockedAmountCents);
        console.log('✅ Funds unlocked successfully');
      } catch (err) {
        console.error('❌ Failed to unlock funds:', err);
      }
    }

    // Revertir booking a 'pending' si fue actualizado
    if (transaction.bookingUpdated) {
      try {
        await this.bookingsService.updateBooking(bookingId, { status: 'pending' });
        console.log('✅ Booking reverted to pending');
      } catch (err) {
        console.error('❌ Failed to revert booking:', err);
      }
    }

    // TODO: Marcar intent como 'failed' si fue creado
    if (transaction.intentCreated && transaction.intentId) {
      console.warn('⚠️ Payment intent created but not cleaned up:', transaction.intentId);
    }
  }
}
