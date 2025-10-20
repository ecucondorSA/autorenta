import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentsService } from '../../../core/services/payments.service';
import { BookingsService } from '../../../core/services/bookings.service';
import { WalletService } from '../../../core/services/wallet.service';
import { Booking } from '../../../core/models';
import { BookingPaymentMethod } from '../../../core/models/wallet.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { PaymentMethodSelectorComponent } from '../../../shared/components/payment-method-selector/payment-method-selector.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-checkout-page',
  imports: [CommonModule, MoneyPipe, PaymentMethodSelectorComponent, TranslateModule],
  templateUrl: './checkout.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPage implements OnInit {
  readonly bookingId = signal<string | null>(null);
  readonly intentId = signal<string | null>(null);
  readonly status = signal<string>('requires_payment_method');
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly booking = signal<Booking | null>(null);

  // Wallet payment state
  readonly selectedPaymentMethod = signal<BookingPaymentMethod>('credit_card');
  readonly walletAmountToUse = signal<number>(0);
  readonly cardAmountToUse = signal<number>(0);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly payments: PaymentsService,
    private readonly bookings: BookingsService,
    private readonly wallet: WalletService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('bookingId');
    this.bookingId.set(id);
    if (id) {
      void this.loadBooking(id);
    }
  }

  /**
   * Maneja el cambio de método de pago seleccionado
   */
  onPaymentMethodChange(event: {
    method: BookingPaymentMethod;
    walletAmount: number;
    cardAmount: number;
  }): void {
    this.selectedPaymentMethod.set(event.method);
    this.walletAmountToUse.set(event.walletAmount);
    this.cardAmountToUse.set(event.cardAmount);

    console.log('Payment method changed:', event);
  }

  /**
   * Procesa el pago según el método seleccionado
   */
  async processPayment(): Promise<void> {
    if (!this.bookingId() || !this.booking()) return;

    this.loading.set(true);
    this.message.set(null);

    try {
      const method = this.selectedPaymentMethod();
      const bookingId = this.bookingId()!;
      const totalAmount = this.booking()!.total_amount;

      // Caso 1: Pago 100% con wallet
      if (method === 'wallet') {
        await this.processWalletPayment(bookingId, totalAmount);
      }
      // Caso 2: Pago mixto (wallet + tarjeta)
      else if (method === 'partial_wallet') {
        await this.processPartialWalletPayment(
          bookingId,
          this.walletAmountToUse(),
          this.cardAmountToUse()
        );
      }
      // Caso 3: Pago 100% con tarjeta (Mercado Pago)
      else {
        await this.processCreditCardPayment(bookingId, totalAmount);
      }
    } catch (err) {
      console.error('Error processing payment:', err);
      this.message.set(
        err instanceof Error ? err.message : 'Error al procesar el pago'
      );
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Procesa pago 100% con wallet (rental + deposit)
   * Sistema dual: rental payment + security deposit
   */
  private async processWalletPayment(bookingId: string, rentalAmount: number): Promise<void> {
    const DEPOSIT_AMOUNT = 250; // USD - Garantía no reembolsable en cash

    // Paso 1: Bloquear rental + deposit (sistema dual)
    const lockResult = await this.wallet.lockRentalAndDeposit({
      booking_id: bookingId,
      rental_amount: rentalAmount,
      deposit_amount: DEPOSIT_AMOUNT,
    });

    if (!lockResult.success) {
      throw new Error(lockResult.message);
    }

    // Paso 2: Actualizar booking con payment info
    await this.bookings.updateBooking(bookingId, {
      payment_method: 'wallet',
      rental_amount_cents: Math.round(rentalAmount * 100),
      deposit_amount_cents: Math.round(DEPOSIT_AMOUNT * 100),
      rental_lock_transaction_id: lockResult.rental_lock_transaction_id,
      deposit_lock_transaction_id: lockResult.deposit_lock_transaction_id,
      deposit_status: 'locked',
      status: 'confirmed',
    });

    await this.bookings.recalculatePricing(bookingId);

    this.status.set('paid_with_wallet');
    this.message.set(
      `✅ Pago exitoso con wallet!\n\n` +
      `💰 Alquiler: $${rentalAmount} bloqueado (se paga al propietario)\n` +
      `🔒 Garantía: $${DEPOSIT_AMOUNT} bloqueada (se devuelve a tu wallet)\n` +
      `📊 Total bloqueado: $${lockResult.total_locked}\n\n` +
      `La garantía se devolverá a tu wallet al finalizar el alquiler.`
    );

    // Redirigir a confirmación después de 3 segundos
    setTimeout(() => {
      void this.router.navigate(['/bookings', bookingId]);
    }, 3000);
  }

  /**
   * Procesa pago mixto (wallet + tarjeta)
   * NOTA: Esta opción NO usa el sistema dual de rental+deposit
   * Solo bloquea el monto de wallet tradicional
   */
  private async processPartialWalletPayment(
    bookingId: string,
    walletAmount: number,
    cardAmount: number
  ): Promise<void> {
    // Paso 1: Bloquear fondos del wallet (sin deposit, solo el monto parcial)
    let lockTransactionId: string | null | undefined;

    if (walletAmount > 0) {
      const lockResult = await this.wallet.lockFunds({
        booking_id: bookingId,
        amount: walletAmount,
        description: 'Pago parcial de reserva con wallet',
      });

      if (!lockResult.success) {
        throw new Error(lockResult.message);
      }

      lockTransactionId = lockResult.transaction_id;
    }

    // Paso 2: Crear payment intent para el resto con Mercado Pago
    const intent = await this.payments.createIntent(bookingId);
    this.intentId.set(intent.id);

    // Paso 3: Actualizar booking con payment info
    await this.bookings.updateBooking(bookingId, {
      payment_method: 'partial_wallet',
      wallet_amount_cents: Math.round(walletAmount * 100),
      wallet_status: walletAmount > 0 ? 'locked' : undefined,
      wallet_lock_transaction_id: lockTransactionId,
      payment_intent_id: intent.id,
      deposit_amount_cents: 50000,
    });

    await this.bookings.recalculatePricing(bookingId);

    // Paso 4: Redirigir a Mercado Pago para pagar el resto
    this.status.set('redirecting_to_mercadopago');
    this.message.set(
      `$${walletAmount} bloqueados de tu wallet. Redirigiendo a Mercado Pago para pagar $${cardAmount}...`
    );

    // TODO: Implementar integración con MercadoPago para pagos de bookings
    // Actualmente, la Edge Function mercadopago-create-preference está diseñada
    // para depósitos de wallet. Para pagos de bookings necesitaremos:
    // 1. Crear nueva Edge Function o extender la existente
    // 2. Obtener el init_point de MercadoPago con el monto del cardAmount
    // 3. Redirigir al usuario: window.location.href = init_point
    // 4. Configurar webhook para procesar el pago del booking
    //
    // Por ahora, simular el pago para testing
    setTimeout(() => {
      this.status.set('paid_partial');
      this.message.set('Pago mixto completado exitosamente');
    }, 2000);
  }

  /**
   * Procesa pago 100% con tarjeta (Mercado Pago)
   */
  private async processCreditCardPayment(bookingId: string, amount: number): Promise<void> {
    // Crear payment intent
    const intent = await this.payments.createIntent(bookingId);
    this.intentId.set(intent.id);
    this.status.set(intent.status);

    // Actualizar booking
    await this.bookings.updateBooking(bookingId, {
      payment_method: 'credit_card',
      wallet_amount_cents: 0,
      deposit_amount_cents: 50000,
    });

    await this.bookings.recalculatePricing(bookingId);

    this.message.set('Redirigiendo a Mercado Pago...');

    // TODO: Implementar integración con MercadoPago para pagos de bookings
    // Similar al flujo de pago parcial, necesitamos:
    // 1. Llamar a Edge Function para crear preferencia de pago
    // 2. Obtener init_point de MercadoPago
    // 3. Redirigir: window.location.href = init_point
    // 4. Usuario completa pago en MercadoPago
    // 5. Webhook procesa la confirmación
    //
    // Por ahora, mostrar mensaje de simulación
    setTimeout(() => {
      this.status.set('awaiting_payment');
      this.message.set('Esperando confirmación de pago de Mercado Pago');
    }, 1500);
  }

  async createIntent(): Promise<void> {
    if (!this.bookingId()) return;
    this.loading.set(true);
    try {
      const intent = await this.payments.createIntent(this.bookingId()!);
      this.intentId.set(intent.id);
      this.status.set(intent.status);
    } catch (err) {
      console.error(err);
      this.message.set('No pudimos iniciar el pago.');
    } finally {
      this.loading.set(false);
    }
  }

  async simulatePayment(): Promise<void> {
    if (!this.intentId()) return;
    this.loading.set(true);
    try {
      await this.payments.markAsPaid(this.intentId()!);
      const intent = await this.payments.getStatus(this.intentId()!);
      this.status.set(intent?.status ?? 'approved');
      this.message.set('Pago simulado correctamente.');
    } catch (err) {
      console.error(err);
      this.message.set('Falló la simulación de pago.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadBooking(bookingId: string): Promise<void> {
    try {
      const booking = await this.bookings.getBookingById(bookingId);
      this.booking.set(booking);
    } catch (err) {
      console.error(err);
      this.message.set('No pudimos cargar la reserva.');
    }
  }
}
